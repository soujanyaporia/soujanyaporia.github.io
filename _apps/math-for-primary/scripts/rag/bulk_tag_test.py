import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('bulk',Path(__file__).parents[1]/'rag-bulk-tag.py');bulk=importlib.util.module_from_spec(spec);spec.loader.exec_module(bulk)

def source(n=1):return {'bankLine':n,'paperId':'paper','rawTextSha256':bulk.digest('source'+str(n)),'flags':[]}
def tag(n=1):return {'bankLine':n,'paperId':'paper','rawTextSha256':bulk.digest('source'+str(n)),'classification':'real-question','topic':'MONEY','unknowns':['u1: total'],'relations':['u1=g1+g2'],'linkedSubparts':[],'units':['dollars'],'numericalDomain':{'numberTypes':['whole'],'constraints':['nonnegative']},'response':{'kind':'numeric','fieldCount':1,'ordered':True,'requirements':['dollars']},'representation':{'kind':'text','figureNeed':'not-required','constraints':[]},'boundaries':'complete','confidence':'high','gaps':[]}

class BulkTagTests(unittest.TestCase):
 def test_exact_text_normalization_keeps_numbers_names_and_math(self):
  self.assertEqual(bulk.exact_normalized('  ALI has 12\ncoins.'),bulk.exact_normalized('ali HAS 12 coins.'))
  self.assertNotEqual(bulk.exact_normalized('Ali has 12 coins.'),bulk.exact_normalized('Ali has 13 coins.'))
  self.assertNotEqual(bulk.exact_normalized('Ali has 12 coins.'),bulk.exact_normalized('Mei has 12 coins.'))
 def test_no_theme_only_merge_and_response_parts_units_domain_are_bound(self):
  original=tag();key=bulk.group_tag(original,source())[0]
  same=json.loads(json.dumps(original));same['topic']='AS';self.assertEqual(bulk.group_tag(same,source())[0],key)
  for change in [lambda t:t.update(relations=['u1=g1-g2']),lambda t:t['response'].update(fieldCount=2),lambda t:t.update(units=['cents']),lambda t:t['numericalDomain'].update(numberTypes=['decimal'])]:
   other=json.loads(json.dumps(original));change(other);self.assertNotEqual(bulk.group_tag(other,source())[0],key)
 def test_ocr_boundary_figure_unknown_and_answer_keys_are_held(self):
  for change in [lambda t:t.update(classification='answer-key'),lambda t:t.update(boundaries='uncertain'),lambda t:t.update(confidence='medium'),lambda t:t['representation'].update(figureNeed='required'),lambda t:t.update(gaps=['Missing denominator'])]:
   other=tag();change(other);key,holds,_=bulk.group_tag(other,source());self.assertIsNone(key);self.assertTrue(holds)
  self.assertIsNone(bulk.group_tag(tag(),{**source(),'flags':['low-ocr-confidence']})[0])
 def test_bound_batch_requires_exactly_every_original_source(self):
  packet={'batchId':'batch','sources':[source(1),source(2)]};out={'schema':1,'batchId':'batch','tags':[tag(1),tag(2)]};self.assertEqual(len(bulk.tag_check(out,packet)),2)
  for mutate in [lambda o:o['tags'].pop(),lambda o:o['tags'][0].update(rawTextSha256='0'*64),lambda o:o['tags'][1].update(bankLine=1),lambda o:o['tags'][0].update(paperId='wrong')]:
   changed=json.loads(json.dumps(out));mutate(changed)
   with self.assertRaises(ValueError):bulk.tag_check(changed,packet)
 def test_saved_result_is_idempotent_and_tampering_is_blocked(self):
  with tempfile.TemporaryDirectory()as temp:
   work=Path(temp);packet={'batchId':'batch','sources':[source(1),source(2)]};path=work/'batches/batch/packet.json';bulk.atomic(path,packet)
   with bulk.connect(work)as db:
    db.execute('insert into batches(batch_id,ordinal,status,packet_path,packet_sha256)values(?,?,?,?,?)',('batch',1,'prepared',str(path),bulk.file_hash(path)));db.commit()
    calls=[]
    def run(command,**kwargs):
     calls.append(command);output=Path(command[command.index('--output-last-message')+1]);bulk.atomic(output,{'schema':1,'batchId':'batch','tags':[tag(1),tag(2)]});return subprocess.CompletedProcess(command,0,'{}','')
    row=dict(db.execute('select *from batches').fetchone());result=bulk.run_batch(work,row,'fake',30,0,run);bulk.persist_result(db,*result);bulk.persist_result(db,*result)
    self.assertEqual(db.execute('select count(*)from region_tags').fetchone()[0],2);self.assertEqual(db.execute('select count(*)from dictionary').fetchone()[0],1)
    saved=dict(db.execute('select *from batches').fetchone());bulk.run_batch(work,saved,'fake',30,0,run);self.assertEqual(len(calls),1)
    Path(saved['result_path']).write_text('{}')
    with self.assertRaises(ValueError):bulk.run_batch(work,saved,'fake',30,0,run)

if __name__=='__main__':unittest.main()
