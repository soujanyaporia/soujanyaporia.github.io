#!/usr/bin/env python3
"""Finite-sample content audit. Reads visible givens, never generator factsOf/answer proofs to solve.
Run: node scripts/export-content-audit.mjs && python3 scripts/audit-content.py
Proof-tree checks are deliberately reported separately from independent visible-given solutions.
The manifest records every sampled family, including unsupported/unverified ones.
"""
from pathlib import Path
from fractions import Fraction as F
from collections import Counter,defaultdict
import ast,json,re,math,datetime
ROOT=Path(__file__).resolve().parents[1]
s=json.loads((ROOT/'.generated/content-audit/snapshot.json').read_text())
OUT=ROOT/'audits';OUT.mkdir(exist_ok=True)

def calc(expr):
 expr=expr.strip().rstrip('.?').replace(',','').replace('−','-')
 expr=re.sub(r'(\d+)\s+(\d+)/(\d+)',r'(\1+\2/\3)',expr)
 expr=re.sub(r'(?<![\d.])(\d+)/(\d+)(?![\d.])',r'(\1/\2)',expr).replace('×','*').replace('÷','/')
 expr=re.sub(r'(\d+)\s+(\d+)/(\d+)',r'(\1+\2/\3)',expr)
 if not expr or re.search(r'[^\d.()+*/\-\s]',expr): raise ValueError(expr)
 def ev(n):
  if isinstance(n,ast.Expression):return ev(n.body)
  if isinstance(n,ast.Constant) and isinstance(n.value,(int,float)):return F(str(n.value))
  if isinstance(n,ast.UnaryOp) and isinstance(n.op,(ast.USub,ast.UAdd)):return -ev(n.operand) if isinstance(n.op,ast.USub) else ev(n.operand)
  if isinstance(n,ast.BinOp):
   a,b=ev(n.left),ev(n.right)
   if isinstance(n.op,ast.Add):return a+b
   if isinstance(n.op,ast.Sub):return a-b
   if isinstance(n.op,ast.Mult):return a*b
   if isinstance(n.op,ast.Div):return a/b
  raise ValueError(expr)
 return ev(ast.parse(expr,mode='eval'))

def same(a,b):
 try:return abs(float(calc(str(a))-calc(str(b))))<1e-6
 except (ValueError,SyntaxError,ZeroDivisionError):return re.sub(r'\s+','',str(a)).lower()==re.sub(r'\s+','',str(b)).lower()
SMALL=dict(zip('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety'.split(),list(range(21))+[30,40,50,60,70,80,90]))
def namevalue(name):
 total=part=0
 for w in name.replace('-',' ').lower().split():
  if w=='and':continue
  if w=='hundred':part*=100
  elif w in ['thousand','million']:total+=part*({'thousand':1000,'million':1000000}[w]);part=0
  else:part+=SMALL[w]
 return total+part

def roundto(n,u):return math.floor(n/u+F(1,2))*u

def independent(q,activity_kind=''):
 p=q.get('prompt','');display=q.get('display','');tool=q.get('tool',{});picture=q.get('picture',{})
 # Full arithmetic expression is directly shown to the pupil.
 for text in [display if activity_kind in ['add','subtract','multiply','divide','operations','decimalAdd','decimalMultiply','decimalDivide','fractionAdd','fractionSubtract','fractionMultiply','fractionDivide'] else '',re.sub(r'^(?:What is|Calculate|Work out|Add|Find)\s+','',p)]:
  expression=re.sub(r'\s*=\s*\?\s*$','',text).strip().rstrip('.?')
  try:
   if re.search(r'[+×÷−]|\d/\d',expression):return str(calc(expression)),'displayed-expression'
  except (ValueError,SyntaxError,ZeroDivisionError):pass
 m=re.fullmatch(r'Find ([\d/ ]+) of (\d+)\.',p)
 if m:return str(calc(m[1])*int(m[2])),'fraction-of-visible-set'
 m=re.fullmatch(r'Write “(.+)” in numerals\.',p)
 if m:return str(namevalue(m[1])),'read-number-words'
 m=re.fullmatch(r'Write ([\d,]+) in words\.',p)
 if m:return ('number-name',int(m[1].replace(',',''))),'write-number-words'
 m=re.fullmatch(r'Round ([\d.]+) to the nearest (\d+)\.',p)
 if m:return str(roundto(calc(m[1]),int(m[2]))),'nearest-multiple'
 m=re.fullmatch(r'Round ([\d.]+) to (\d) decimal places\.',p)
 if m:return str(roundto(calc(m[1]),F(1,10**int(m[2])))),'round-decimal'
 m=re.fullmatch(r'What is the remainder in (\d+) ÷ (\d+)\?',p)
 if m:return str(int(m[1])%int(m[2])),'visible-remainder'
 m=re.fullmatch(r'Find the greatest common factor of (\d+) and (\d+)\.',p)
 if m:return str(math.gcd(int(m[1]),int(m[2]))),'visible-gcf'
 m=re.fullmatch(r'What is the smallest positive common multiple of (\d+) and (\d+)\?',p)
 if m:return str(math.lcm(int(m[1]),int(m[2]))),'visible-lcm'
 m=re.fullmatch(r'What is the (\d+)(?:st|nd|rd|th) positive multiple of (\d+)\?',p)
 if m:return str(int(m[1])*int(m[2])),'visible-multiple'
 m=re.fullmatch(r'Is (\d+) odd or even\?',p)
 if m:return 'Odd' if int(m[1])%2 else 'Even','parity'
 m=re.fullmatch(r'(?:Choose the correct relation:|Compare) ([\d./,]+) □ ([\d./,]+)\.',p)
 if m:
  a,b=calc(m[1]),calc(m[2]);return '<' if a<b else '>' if a>b else '=','visible-compare'
 m=re.fullmatch(r'Write (\d+)/(\d+) (?:in simplest form|as a decimal)\.',p)
 if m:return str(F(int(m[1]),int(m[2]))),'visible-fraction-value'
 m=re.fullmatch(r'Complete the equivalent fraction: (\d+)/(\d+) = (\d+|□)/(\d+|□)\.',p)
 if m:return str(F(int(m[1])*int(m[4]),int(m[2])) if m[3]=='□' else F(int(m[3])*int(m[2]),int(m[1]))),'equivalent-fraction-cross-products'
 m=re.fullmatch(r'Write (\d+) (\d+)/(\d+) as an improper fraction\.',p)
 if m:return str(F(int(m[1])*int(m[3])+int(m[2]),int(m[3]))),'mixed-to-improper'
 m=re.fullmatch(r'Write (\d+)/(\d+) as a mixed number in simplest form\.',p)
 if m:return str(F(int(m[1]),int(m[2]))),'improper-to-mixed'
 # A missing number is solved from the public equation, independently of generated evidence.
 m=re.search(r'(\d+(?:\.\d+)?|□) ([+−×÷]) (\d+(?:\.\d+)?|□) = (\d+(?:\.\d+)?)',p+' '+display)
 if m and '□' in [m[1],m[3]] and re.fullmatch(r'[\d.,/ \t]+',str(q.get('answer',''))) and not re.search(r'\d+ \+ \d+ \+',p+' '+display):
  left,op,right,total=m[1],m[2],m[3],calc(m[4]);known=calc(right if left=='□' else left)
  if left=='□':v={'+':lambda:total-known,'−':lambda:total+known,'×':lambda:total/known,'÷':lambda:total*known}[op]()
  else:v={'+':lambda:total-known,'−':lambda:known-total,'×':lambda:total/known,'÷':lambda:known/total}[op]()
  return str(v),'visible-missing-number'
 if activity_kind=='count' and picture.get('type')=='counters':return str(picture['count']),'counter-picture'
 if activity_kind=='place':
  m=re.search(r'in the (\d+) place',p)
  if m:return str((int(display)//int(m[1])%10)*int(m[1])),'place-from-visible-numeral'
 if activity_kind in ['compare','decimalCompare','fractionCompare']:
  m=re.fullmatch(r'(.+?)\s+□\s+(.+)',display)
  if m:
   a,b=calc(m[1]),calc(m[2]);return '<' if a<b else '>' if a>b else '=','displayed-comparison'
 if activity_kind=='order' and q.get('order'):return ','.join(sorted(q['order'],key=calc)),'visible-number-order'
 if activity_kind=='pattern':
  vals=re.findall(r'\d+',display)
  if len(vals)>=3 and len({int(b)-int(a) for a,b in zip(vals,vals[1:])})==1:return str(2*int(vals[-1])-int(vals[-2])),'constant-difference-pattern'
 if tool.get('kind')=='table':
  rows=tool.get('rows',[]);headers=tool.get('headers',[])
  if rows and p=='Multiply the amount in the table by the number beside it.':return str(calc(rows[0][0])*calc(rows[0][1])),'visible-table-product'
  if rows and p=='Divide the amount in the table by the number beside it.':return str(calc(rows[0][0])/calc(rows[0][1])),'visible-table-quotient'
  if rows and p=='Work out the expression in the table. Do the brackets first.':return str(calc(rows[0][0])),'visible-table-brackets'
 return None,None

# Audit-parser regressions prevent expression precedence or wording from creating false defects.
assert calc('1/2 ÷ 1/3')==F(3,2)
assert calc('2 1/3 × 3/4')==F(7,4)
assert calc('(4 + 3) × 2')==14
assert calc('1,000 + 2,000')==3000
assert independent({'prompt':'Write “one thousand and one” in numerals.'})[0]=='1001'
assert independent({'prompt':'Sam says □ + 4 = 19 is 23. What do you think?','answer':'No'})==(None,None)

def proofvalue(p):
 if isinstance(p,(int,float)):return p
 a,b=proofvalue(p['a']),proofvalue(p['b']);return {'+':lambda:a+b,'-':lambda:a-b,'*':lambda:a*b,'/':lambda:a/b,'round':lambda:math.floor(a/b+0.50000001)*b,'floor':lambda:math.floor(a/b)*b}[p['op']]()

scope=defaultdict(lambda:{'samples':0,'independentVisibleGivenChecks':0,'generatorProofChecks':0,'numericStepEqualities':0,'unverifiedAnswers':0,'models':Counter(),'solvers':Counter()})
failures=[];stats=Counter();unverified=defaultdict(list)
def check(q,owner,family,source):
 row=scope[family];row['samples']+=1;stats['samples']+=1
 if not str(q.get('prompt','')).strip() or not str(q.get('answer','')).strip():failures.append({'type':'empty-prompt-answer','owner':owner,'key':q.get('key')})
 tool=q.get('tool') or q.get('picture') or {};row['models'][tool.get('kind',tool.get('type','none'))]+=1
 if q.get('choices') and not any(same(c,q['answer']) for c in q['choices']):failures.append({'type':'answer-not-in-choices','owner':owner,'prompt':q['prompt'],'answer':q['answer']})
 try:expected,solver=independent(q,source)
 except (KeyError,ValueError,SyntaxError,ZeroDivisionError):expected=solver=None
 if solver:
  row['independentVisibleGivenChecks']+=1;row['solvers'][solver]+=1;stats['independentVisibleGivenChecks']+=1
  good=namevalue(q['answer'])==expected[1] if isinstance(expected,tuple) else same(expected,q['answer'])
  if not good:failures.append({'type':'visible-givens-answer-mismatch','owner':owner,'key':q.get('key'),'prompt':q['prompt'],'display':q.get('display'),'answer':q['answer'],'expected':expected,'solver':solver})
 else:
  row['unverifiedAnswers']+=1
  if len(unverified[family])<2:unverified[family].append({'owner':owner,'prompt':q.get('prompt'),'answer':q.get('answer')})
 if 'proof' in q:
  row['generatorProofChecks']+=1;stats['generatorProofChecks']+=1
  if not same(proofvalue(q['proof']),q['answer']):failures.append({'type':'proof-answer-mismatch','owner':owner,'key':q.get('key')})
 for step in [*q.get('steps',[]),q.get('check',''),q.get('explanation','')]:
  normalized=re.sub(r'(\d+(?:\.\d+)?)%',r'(\1/100)',str(step)).replace(' of ',' × ')
  if re.search(r'□|[²³]|\b[xyz]\b|\d[xyz]|\d\s*:\s*\d|remainder|\b(?:tens|hundreds|thousands|tenths|hundredths|thousandths)\b',normalized):continue
  for match in re.finditer(r'[\d(),.+×÷−*/= \t]+',normalized):
   expr=match.group().strip().rstrip('.')
   if '=' not in expr:continue
   sides=expr.split('=')
   try:values=[calc(side) for side in sides]
   except (ValueError,SyntaxError,ZeroDivisionError):continue
   row['numericStepEqualities']+=1;stats['numericStepEqualities']+=1
   if any(abs(float(v-values[0]))>1e-6 for v in values[1:]):failures.append({'type':'worked-equality-mismatch','owner':owner,'key':q.get('key'),'prompt':q['prompt'],'step':step,'expression':expr})

for a in s['activities']:
 for q in a['questions']:check(q,a['id'],'activity:'+a['kind'],a['kind'])
for lesson in s['lessons']:
 for stage in lesson['stages']:
  for q in stage.get('items',[]):check(q,lesson['id'],'lesson:'+q.get('kind','unlabelled'),'lesson')
  for frame in stage.get('frames',[]):
   q=frame.get('ask')
   if isinstance(q,dict):check(q,lesson['id'],'worked-frame:'+q.get('kind','unlabelled'),'lesson')
# Deduplicate failures while keeping the count of occurrences.
unique={}
for f in failures:
 key=json.dumps({k:v for k,v in f.items() if k!='key'},sort_keys=True)
 if key not in unique:unique[key]={**f,'occurrences':0}
 unique[key]['occurrences']+=1
result={'date':'2026-11-04','seedSet':[0,1,7,31,129,217,7919], 'counts':dict(stats),'activityConfigurations':len(s['activities']),'activityKinds':len({a['kind'] for a in s['activities']}),'lessons':len(s['lessons']),'mappedObjectives':len(s['skills']),'failureOccurrences':len(failures),'uniqueFindings':len(unique),'scope':dict(scope),'unverifiedExamples':dict(unverified),'findings':list(unique.values()),'limits':['Finite seed coverage, not exhaustive random-instance proof.','Generator proof trees check self-consistency, not visible problem correctness.','Unverified answers remain explicit; this script does not solve every semantic/diagram question.','Numeric equality parsing covers only fully numeric expressions and does not verify prose, units, geometry rendering or pedagogy.','All 2,406 PDFs have not been visually or semantically reviewed by this audit.']}
(OUT/'content-math-verification-2026-11-04.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['scope','findings','unverifiedExamples']},indent=2))
print('First findings:',json.dumps(list(unique.values())[:16],indent=2))

# A regression makes this audit fail in automation; unsupported content remains explicitly listed.
raise SystemExit(1 if failures else 0)
