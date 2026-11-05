#!/usr/bin/env python3
"""Find conservative, unverified reuse leads; never writes to the coverage ledger."""
import argparse
import json
import re
import sqlite3
from decimal import Decimal
from pathlib import Path

DEFAULT = Path('/Users/poriasoujanya/Documents/Singapore Maths Paper Library/structure/3745570f8c47568c0effca712f45db5d234b50151012df46fc30d3d80910ad61/staging.sqlite')
OUTPUT = Path('.generated/batch10-upper-source-leads.json')
# These deliberately require the full relationship, rather than a topic keyword.
CUPS = re.compile(r'two cups and a jug contain\s+([\d.]+)\s+lit(?:re|er)s?.*?volume of water in each cup is the same.*?one cup is\s+([\d.]+)\s+lit(?:re|er)s? less than.*?jug.*?volume of water in each cup',re.I)
BOOKS = re.compile(r'average price of (?:a set of |some )?books? is\s*\$\s*([\d.]+).*?(?:one more|another) book.*?\$\s*([\d.]+).*?average (?:price )?(?:of the books? )?(?:became|becomes|is)\s*\$\s*([\d.]+).*?how many books.*?(?:at first|originally)',re.I)
SQUARE_BASE = re.compile(r'(?:solid )?cuboid (?:of|has a) height (?:of )?([\d.]+)\s*cm (?:has |and )?(?:a )?square base (?:of )?(?:side(?: of)? )?([\d.]+)\s*cm.*?(?:what is|find) (?:its |the )?volume',re.I)
CUBOID = re.compile(r'cuboid is\s*([\d.]+)\s*m\s+long and\s*([\d.]+)\s*cm\s+w[il]de.*?volume of\s*([\d ,]+)\s*cm.*?height of the cuboid',re.I)
KEY = re.compile(r'\b(?:marking scheme|worked solution|answer key)\b',re.I)

def lead(text):
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text)>700 or KEY.search(text):
        return None
    m=CUPS.search(text)
    if m:
        total,difference=map(Decimal,m.groups())
        value=(total-difference)/3
        if total>difference>0 and value>0:
            return {'pattern':'two-equal-small-units-and-larger-difference','generator':'makeBatch10Upper:jug-cups','givens':{'total':str(total),'jugMinusCup':str(difference),'cupCount':2,'unit':'litres'},'independentSourceAnswer':{'value':str(value.normalize()),'unit':'litres'},'sourceEquation':'(total - difference) / 3','conditions':['two equal cup volumes','jug exceeds one cup by stated difference']}
    m=SQUARE_BASE.search(text)
    if m:
        height,side=map(Decimal,m.groups())
        if height>0 and side>0:
            value=height*side*side
            return {'pattern':'square-base-cuboid-volume','generator':'makeBatch3Upper:square-base-volume','givens':{'heightCm':str(height),'baseSideCm':str(side)},'independentSourceAnswer':{'value':str(value.normalize()),'unit':'cm³'},'sourceEquation':'height * base side * base side','conditions':['square base','height and side given in cm']}
    m=CUBOID.search(text)
    if m:
        length,width,volume=map(Decimal,[m.group(1),m.group(2),m.group(3).replace(' ','').replace(',','')])
        if length>0 and width>0 and volume>0:
            value=volume/(length*100*width)
            if value==value.to_integral_value() and value<=1000:
                return {'pattern':'cuboid-volume-mixed-unit-missing-height','generator':'makeBatch10Upper:mixed-unit-cuboid','givens':{'lengthM':str(length),'widthCm':str(width),'volumeCm3':str(volume)},'independentSourceAnswer':{'value':str(value.normalize()),'unit':'cm'},'sourceEquation':'volume / (100 * length in m * width in cm)','conditions':['rectangular cuboid','conversion from metres to centimetres']}
    m=BOOKS.search(text)
    if m:
        old,added,new=map(Decimal,m.groups())
        if added>new>old>0:
            value=(added-new)/(new-old)
            if value==value.to_integral_value() and 0<value<=1000:
                return {'pattern':'average-after-addition-find-count','generator':'makeBatch7Upper:average-added','givens':{'oldAverage':str(old),'addedPrice':str(added),'newAverage':str(new),'unit':'dollars'},'independentSourceAnswer':{'value':str(value.normalize()),'unit':'books'},'sourceEquation':'(added price - new average) / (new average - old average)','conditions':['one additional item','original count is a positive integer']}
    return None

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--database',type=Path,default=DEFAULT);p.add_argument('--output',type=Path,default=OUTPUT);args=p.parse_args()
    connection=sqlite3.connect(f'file:{args.database}?mode=ro',uri=True);connection.row_factory=sqlite3.Row
    rows=connection.execute('SELECT r.candidate_id,r.paper_id,r.question_number,r.page_numbers_json,r.source_sha256,r.raw_text,p.level,p.title FROM regions r JOIN papers p USING(paper_id) WHERE p.level IN (5,6)').fetchall()
    leads=[]
    for row in rows:
        found=lead(row['raw_text'])
        if found:
            leads.append({**{k:row[k] for k in ('candidate_id','paper_id','question_number','source_sha256','level','title')},'sourcePages':json.loads(row['page_numbers_json']),'sourceText':row['raw_text'],'reviewStatus':'unverified-lead; visual review and source-boundary reconciliation required','coverageCredit':False,**found})
    known_sources={('0101b054e77d10c7','10'),('2f1f41b0729593d8','29'),('5fbc921e504c0195','25')}
    additional=[x for x in leads if (x['paper_id'],x['question_number']) not in known_sources]
    result={'additionalCandidateMappings':len(additional),'additionalCandidatePapers':len({x['paper_id'] for x in additional}),'scope':'Conservative literal-text source leads, no coverage credit or automatic publication. Counts include repeated papers and heuristic OCR regions.','scannedRegions':len(rows),'candidateMappings':len(leads),'reviewedMappings':0,'patterns':sorted({x['pattern'] for x in leads}),'leads':leads}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ('scannedRegions','candidateMappings','additionalCandidateMappings','additionalCandidatePapers','reviewedMappings','patterns')}))
if __name__=='__main__':main()
