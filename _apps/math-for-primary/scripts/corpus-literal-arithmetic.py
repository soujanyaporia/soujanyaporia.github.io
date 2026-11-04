#!/usr/bin/env python3
"""Conservative, read-only OCR triage for standalone literal arithmetic.

This is a proposal queue, not source verification or coverage. In particular,
OCR operators and question boundaries may be wrong; inspect each source image.
"""
import argparse,ast,collections,hashlib,json,re,sqlite3
from fractions import Fraction
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
NUM=r'(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?'
EXPR=r'[\d.,+\-−×xX*÷/()\s]+'
PREFIX=re.compile(r'^\s*(?:(?:\d{1,3}[.)]\s*|\d{1,3}\s*\n))?(?:calculate|find\s+the\s+value\s+of|evaluate|what\s+is)\s+('+EXPR+r')\s*([.?])?\s*(?:ans(?:wer)?\s*[:.]?\s*[_\s]*)?$',re.I)
EQUATION=re.compile(r'^\s*(?:(?:\d{1,3}[.)]\s*|\d{1,3}\s*\n))?('+EXPR+r')=\s*(?:\?|_{2,}|\.{3,})\s*$',re.I)
TOKEN=re.compile(rf'{NUM}|[+\-−×xX*÷/()]')
KEY=re.compile(r'\b(?:answer\s*key|suggested\s+answers?|worked\s+solutions?|marking\s+scheme|answers?\s+to\s+questions)\b',re.I)
KEY_LINE=re.compile(r'\bQ\s*\d+[a-z]?\s*[).:]?\s*[^\n]{0,60}=\s*\d',re.I)

class Rejected(ValueError):pass

def parse_expr(raw):
 text=raw.strip()
 if text.endswith('.') and not re.search(r'\d\.\d+$',text):text=text[:-1].rstrip()
 toks=TOKEN.findall(text);compact=re.sub(r'\s+','',text)
 if not toks or ''.join(toks)!=compact:raise Rejected('unrecognised-token')
 if len(toks)>17:raise Rejected('too-many-tokens')
 clean=[];operands=[]
 for token in toks:
  if re.fullmatch(NUM,token):
   clean.append(token.replace(',',''));operands.append(token)
  else:clean.append({'−':'-','×':'*','x':'*','X':'*','÷':'/'}.get(token,token))
 if len(operands)<2 or len(operands)>5:raise Rejected('operand-count')
 source=''.join(clean)
 if '**' in source or '//' in source:raise Rejected('unsupported-operator')
 try:parsed=ast.parse(source,mode='eval')
 except SyntaxError as exc:raise Rejected('invalid-expression') from exc
 ops={ast.Add:'+',ast.Sub:'-',ast.Mult:'×',ast.Div:'÷'}
 def visit(node,depth=0):
  if depth>6:raise Rejected('expression-depth')
  if isinstance(node,ast.Constant) and type(node.value) in (int,float):
   rawvalue=ast.get_source_segment(source,node)
   if not rawvalue or not re.fullmatch(r'\d+(?:\.\d+)?',rawvalue):raise Rejected('literal')
   value=Fraction(rawvalue)
   if value>10000000:raise Rejected('operand-range')
   return {'kind':'literal','literal':rawvalue},value
  if isinstance(node,ast.BinOp) and type(node.op) in ops:
   left,a=visit(node.left,depth+1);right,b=visit(node.right,depth+1)
   op=ops[type(node.op)]
   if op=='÷' and b==0:raise Rejected('division-by-zero')
   value={'+':lambda:a+b,'-':lambda:a-b,'×':lambda:a*b,'÷':lambda:a/b}[op]()
   if value<0:raise Rejected('negative-intermediate-outside-scope')
   if abs(value)>10**12:raise Rejected('result-range')
   return {'kind':'operation','operator':op,'left':left,'right':right},value
  raise Rejected('unsupported-expression')
 tree,value=visit(parsed.body)
 if value<0:raise Rejected('negative-answer-outside-scope')
 return tree,value,operands,text

def carries(a,b,base=10):
 carry=0;out=[]
 while a or b:
  v=a%base+b%base+carry;carry=int(v>=base);out.append(bool(carry));a//=base;b//=base
 return any(out)
def borrows(a,b):
 borrow=0;out=[]
 while a or b:
  x=a%10-borrow;y=b%10;borrow=int(x<y);out.append(bool(borrow));a//=10;b//=10
 return any(out)

def classify(raw,level):
 if not isinstance(level,int) or level not in range(1,7):return None,'invalid-level'
 if KEY.search(raw) or KEY_LINE.search(raw):return None,'answer-key-cue'
 if re.search(r'\b(?:missing|box|blank|circle|draw|figure|diagram|pattern|fraction|round|simplest|nearest|correct\s+to|decimal\s+places?)\b',raw,re.I):return None,'additional-or-missing-condition'
 match=PREFIX.fullmatch(raw) or EQUATION.fullmatch(raw)
 if not match:return None,'not-one-bounded-literal-task'
 try:tree,value,literals,expr=parse_expr(match.group(1))
 except Rejected as exc:return None,str(exc)
 if tree['kind']!='operation':return None,'not-an-operation'
 # A text-level operation must fit the stated primary level and avoid negative
 # intermediates. This is a triage boundary, not a curriculum coverage claim.
 values=[Fraction(v.replace(',','')) for v in literals]
 if level<=2 and (any(v.denominator!=1 for v in values) or len(values)>2):return None,'grade-domain'
 if level<=2 and any(v>1000 for v in values):return None,'grade-domain'
 if level<4 and any('.' in v for v in literals):return None,'grade-domain'
 if level==1 and tree['operator'] in ('×','÷'):return None,'grade-domain'
 if level<=3 and tree['operator']=='÷' and value.denominator!=1:return None,'grade-domain'
 if level<4 and len(values)>2:return None,'grade-domain'
 if any('.' in v and len(v.split('.')[1])>3 for v in literals):return None,'decimal-precision'
 if len(values)==2 and tree['left']['kind']==tree['right']['kind']=='literal':
  op=tree['operator'];a,b=values;decimals=['.' in x for x in literals]
  props={'operandCount':2,'operandValues':[str(v) for v in values],'operandLiteralPrecision':[len(x.split('.')[1]) if '.' in x else 0 for x in literals],'operation':op,'nonnegativeAnswer':True,'exactDivision':op!='÷' or value.denominator==1}
  if any(decimals) and op in ('+','-'):
   places=max(props['operandLiteralPrecision']);scale=10**places;aa=int(a*scale);bb=int(b*scale)
   props['decimalColumnRegrouping']=carries(aa,bb) if op=='+' else borrows(aa,bb)
  if all(v.denominator==1 for v in values):
   aa,bb=map(int,values)
   if op=='+':props['carrying']=carries(aa,bb)
   if op=='-':props['borrowing']=borrows(aa,bb)
  mappings=[]
  if level==1 and op=='+' and all(v.denominator==1 for v in values) and 5<=value<=10 and min(values)>0:
   mappings.append({'patternId':'pilot:p1-hpquiz1-25:small-addition','generator':'makeBatch5Early','parameter':'5','constraints':'Positive integer addition with total 5–10; generated visual counters require presentation review.'})
  if level==1 and op=='+' and all(v.denominator==1 and 10<=v<=99 for v in values) and value<=99:
   carry=props['carrying'];mappings.append({'patternId':'pilot:p1-hp25:two-number-addition','generator':'makeP1HenryPark2025Question','parameter':'hp25-05' if carry else 'hp25-09','constraints':'Two-digit addition with '+('carrying' if carry else 'no carrying')+'; carry configuration uses multiple choice and needs response-format review.'})
  if level>=4 and op=='+' and all(decimals) and all(1<=p<=2 for p in props['operandLiteralPrecision']):
   mappings.append({'patternId':'pilot:p5-mb25:decimal-addition','generator':'makeP5MahaBodhi2025','parameter':'2a','constraints':'Two decimal operands up to hundredths; review magnitude, carrying, visible decimal precision and response-format fidelity; a one-place source may need a display configuration.'})
  if level>=5 and op=='÷' and a.denominator==b.denominator==1 and b>=100 and b%100==0 and value.denominator in (2,4,5,10,20,25,50,100) and (value*100).denominator==1 and (value*10).denominator!=1:
   mappings.append({'patternId':'pilot:p5-rulang-wa3:divide-hundreds','generator':'makeBatch5Upper','parameter':'divide-hundreds','constraints':'Whole-number division by a multiple of 100 yielding a two-place decimal; review operand range and original answer format.'})
  # Only nominate a generic sampler where its implementation can generate this
  # operation's domain (not necessarily the original literals). Other cases
  # remain explicit configuration gaps, rather than unconstrained matches.
  kind=None;domain=''
  if any(decimals) and op in ('+','-') and max(a,b)<100:
   kind='decimalAdd';domain='Two-place-or-shorter decimals below 100; sampler requires first operand larger. Review order, decimal precision and regrouping.'
  elif any(decimals) and op=='×' and a<=Fraction(999,100) and b.denominator==1 and (2<=b<=9 or b in (10,100,1000)):
   kind='decimalMultiply';domain='Decimal up to 9.99 multiplied by one digit or an exact power of ten; select powers configuration as needed.'
  elif any(decimals) and op=='÷' and b.denominator==1 and (2<=b<=9 or b in (10,100,1000)):
   kind='decimalDivide';domain='Decimal divided by one digit or an exact power of ten; verify generated dividend range and exact precision.'
  elif not any(decimals) and op in ('+','-') and level>=2 and max(a,b)<=9999:
   kind='add' if op=='+' else 'subtract';domain='Whole-number addition/subtraction in the grade-specific range; verify carrying, borrowing and exact operand magnitudes.'
  elif not any(decimals) and op=='×' and ((101<=a<=999 and 2<=b<=99) or (2<=a<=9 and 2<=b<=10) or (12<=a<=999 and b in (10,100,1000))):
   kind='multiply';domain='Whole-number multiplication; grade and powers configuration must match both operand ranges.'
  elif not any(decimals) and op=='÷' and value.denominator==1 and 2<=b<=9 and value>=2:
   kind='divide';domain='Exact division by a one-digit factor; check level-specific quotient range.'
  if kind:
   mappings.append({'patternId':None,'generator':'makeQuestion','parameter':kind,'constraints':domain+' This is a generic app generator lead, with no independently verified receipt for this source.'})
 else:
  props={'operandCount':len(values),'operandValues':[str(v) for v in values],'operandLiteralPrecision':[len(x.split('.')[1]) if '.' in x else 0 for x in literals],'operation':'compound','nonnegativeAnswer':True,'exactDivision':None};mappings=[]
 answer=str(value.numerator) if value.denominator==1 else f'{value.numerator}/{value.denominator}'
 return {'expressionText':expr,'operationTree':tree,'evaluatedExactly':answer,'operandDomain':props,'responseFormat':'free-response numeric (OCR inferred; confirm visually)','generatorCandidates':mappings},None

def read_only(path):
 c=sqlite3.connect(f'file:{Path(path).resolve()}?mode=ro',uri=True);c.row_factory=sqlite3.Row;return c

def receipt_status(db,pattern):
 row=db.execute('select implementation_status,independent_status,implementation_evidence from patterns where pattern_id=?',(pattern,)).fetchone()
 if not row:return 'not-registered'
 if row['implementation_status']!='implemented' or row['independent_status']!='verified':return 'not-currently-verified'
 try:
  ev=json.loads(row['implementation_evidence']);files=[{'path':ev.get('codePath'),'sha256':ev.get('codeSha256')},*ev.get('trackedFiles',[])]
  for f in files:
   if not f.get('path') or not f.get('sha256'):return 'verification-receipt-incomplete'
   if hashlib.sha256(Path(f['path']).read_bytes()).hexdigest()!=f['sha256']:return 'previously-verified-local-files-changed'
 except (OSError,ValueError,TypeError):return 'verification-receipt-unavailable'
 return 'verified-current-ledger-receipt'

def run(staging,ledger,output):
 db=read_only(staging);cov=read_only(ledger);statuses={};counts=collections.Counter();scanned=0
 query='select r.*,p.level,p.title,p.source_pdf from regions r join papers p using(paper_id) order by r.bank_line'
 with Path(output).open('x',encoding='utf8') as f:
  for r in db.execute(query):
   scanned+=1;text=r['raw_text'];lead,why=classify(text,r['level'])
   if not lead:counts['excluded:'+why]+=1;continue
   pages=json.loads(r['page_numbers_json'])
   if len(pages)!=1:counts['excluded:multiple-or-missing-pages']+=1;continue
   paper=cov.execute('select inventory_reviewed from papers where paper_id=?',(r['paper_id'],)).fetchone()
   if not paper:counts['excluded:not-in-ledger']+=1;continue
   if paper[0]:counts['excluded:already-inventoried-paper']+=1;continue
   page=db.execute('select text,coordinate_system,page_bounds_json from pages where paper_id=? and page_number=?',(r['paper_id'],pages[0])).fetchone()
   if not page:counts['excluded:no-page-context']+=1;continue
   if KEY.search(page['text']) or len(KEY_LINE.findall(page['text']))>=2:counts['excluded:answer-key-page-cue']+=1;continue
   matches=lead['generatorCandidates']
   for candidate in matches:
    pid=candidate['patternId']
    if pid:
     if pid not in statuses:statuses[pid]=receipt_status(cov,pid)
     candidate['receiptStatus']=statuses[pid]
    else:candidate['receiptStatus']='generic-generator-unverified-for-this-source'
   blocks=[dict(x) for x in db.execute('select block_index,page_number,text,bbox_json,confidence,method,recognition_level,matched_page_block_indices_json from region_blocks where bank_line=? order by block_index',(r['bank_line'],))]
   refs=[dict(x) for x in db.execute('select page_number,source_link,has_page_record from region_pages where bank_line=? order by ordinal',(r['bank_line'],))]
   deps=[dict(x) for x in db.execute('select page_number,source_link,dependency,cues_json,status from diagram_dependencies where bank_line=? order by page_number',(r['bank_line'],))]
   result={'bankLine':r['bank_line'],'candidateId':r['candidate_id'],'paperId':r['paper_id'],'level':r['level'],'title':r['title'],'sourceSha256':r['source_sha256'],'sourcePdf':r['source_pdf'],'rawText':text,'rawTextSha256':r['raw_text_sha256'],'rawLineSha256':r['raw_line_sha256'],'questionNumber':r['question_number'],'sourcePages':refs,'regionBlocks':blocks,'pageCoordinateSystem':page['coordinate_system'],'pageBounds':json.loads(page['page_bounds_json']) if page['page_bounds_json'] else None,'fullPageOcrText':page['text'],'diagramDependencies':deps,**lead,'status':'unreviewed-proposal','sourceBoundary':'heuristic-unverified','visuallyReviewed':False,'sourceCovered':False,'reviewRequirements':['Inspect the source PDF and confirm every digit and operator; OCR may substitute arithmetic signs.','Confirm a single question boundary, answer format, grade domain, and absence of missing diagram or givens.','Independently solve the visual source and check all material operation/operand constraints against a current generator receipt.']}
   f.write(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n');counts['candidateRegions']+=1
   if any(x['patternId'] for x in matches):counts['candidateRegionsWithPriorPilotStructure']+=1
   if any(x['patternId'] is None for x in matches):counts['candidateRegionsWithGenericConfigurationLead']+=1
   if not matches:counts['candidateRegionsWithNoMatchingConfiguration']+=1
   if any(x.get('receiptStatus')=='verified-current-ledger-receipt' for x in matches):counts['candidateRegionsWithCurrentVerifiedReceipt']+=1
   counts['operation:'+lead['operandDomain']['operation']]+=1
 return {'parserVersion':'literal-arithmetic-v1','stagingDatabase':str(Path(staging).resolve()),'coverageLedger':str(Path(ledger).resolve()),'stagingMeta':dict(db.execute('select key,value from meta')),'scannedRegions':scanned,'counts':dict(counts),'targetReceiptStatuses':statuses,'reviewedMappings':0,'coverageGranted':0,'output':str(Path(output).resolve()),'outputSha256':hashlib.sha256(Path(output).read_bytes()).hexdigest(),'limitations':'Candidate counts are not unique questions; OCR boundaries, signs, source content, grade constraints, generator fit and local receipt freshness require human source-page review.'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--staging',required=True);p.add_argument('--ledger',required=True);p.add_argument('--output',required=True);a=p.parse_args();print(json.dumps(run(a.staging,a.ledger,a.output),indent=2))
if __name__=='__main__':main()
