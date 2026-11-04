#!/usr/bin/env python3
import importlib.util,unittest
from pathlib import Path
p=Path(__file__).with_name('corpus-literal-arithmetic.py');spec=importlib.util.spec_from_file_location('arithmetic',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class LiteralArithmeticTests(unittest.TestCase):
 def check(self,text,level,answer):
  result,reason=m.classify(text,level);self.assertIsNone(reason,text);self.assertEqual(result['evaluatedExactly'],answer);return result
 def reject(self,text,level):
  result,reason=m.classify(text,level);self.assertIsNone(result,text);self.assertTrue(reason)
 def test_tree_precedence_exact_arithmetic_and_regrouping(self):
  q=self.check('16. Find the value of 6 + 3 × (14 - 6)\nAns:',5,'30');self.assertEqual(q['operationTree']['operator'],'+');self.assertEqual(q['operationTree']['right']['operator'],'×')
  q=self.check('Find the value of 43 + 29.',1,'72');self.assertTrue(q['operandDomain']['carrying']);self.assertEqual(q['generatorCandidates'][0]['parameter'],'hp25-05')
  q=self.check('Calculate 12.50 + 3.25.\nAnswer:',5,'63/4');self.assertEqual(q['operandDomain']['operandLiteralPrecision'],[2,2]);self.assertEqual(q['generatorCandidates'][0]['parameter'],'2a')
  q=self.check('Find the value of 24.4 + 5.67',6,'3007/100');self.assertTrue(q['operandDomain']['decimalColumnRegrouping']);self.assertEqual(q['generatorCandidates'][0]['patternId'],'pilot:p5-mb25:decimal-addition');
  self.assertEqual(self.check('Find the value of 0.35 × 4000',5,'1400')['generatorCandidates'],[]);
  self.check('20 ÷ 4 = ?',3,'5');self.check('Calculate 1,200 ÷ 200',5,'6')
 def test_reject_key_fragments_and_merged_questions(self):
  for t in ['Q5) 5 + 4 = 9','1. Calculate 3 + 4. 2. Calculate 4 + 5.','Find the value of 2 + 3 = 5','Answer key: Calculate 2 + 3','Find the value of 2 + 3.\n(1) 5\n(2) 6']:
   self.reject(t,4)
 def test_reject_missing_given_ocr_and_wrong_domain(self):
  for t in ['Find the value of □ + 7','Find the value of 5 +','Calculate 5 + 2 and give the answer in simplest form','Find the value of 3 + 4 cm','Calculate 6 ÷ 0','Calculate 3 ** 2','Find the value of - 2 + 5','Find the value of 1 + − 3']:
   self.reject(t,5)
  self.reject('Calculate 1.25 + 2.50',2);self.reject('Calculate 3 × 4',1);self.reject('Calculate 7 ÷ 2',3);self.reject('Calculate 2 + 3 + 4',2)
 def test_no_evaluated_answer_for_trailing_ocr_number_or_missing_diagram(self):
  self.reject('Calculate 4 + 3\n9',2);self.reject('Find the value of 7 + 4. See the diagram.',2);self.reject('Find the missing number: 7 + ? = 10',2)
 def test_same_line_number_product_prose_and_answer_blank(self):
  self.check('19 Find the value of 5.8 ÷ 40\nAns:',5,'29/200')
  q=self.check('19. Find the product of 658 and 39.\nAnswer: _',4,'25662')
  self.assertEqual(q['operationTree']['operator'],'×')
  self.check('7 Find the product of 274 and 6.\nAnswer: ______',3,'1644')
  for text in ['Find the product of 658 and 39.\nAnswer: 25662','Find the product of 658 and 39 cm.','Find the product of 658 and 39.\n(1)25662\n(2)25000','Find the value of 5.8 ÷ 40\nAns: 0.145','19 Find the value of 5.8 ÷ 40\n20 Find the value of 3 + 4']:
   self.reject(text,5)
 def test_explicit_subparts_keep_exact_parent_slices_and_answers(self):
  raw='19\n(a)\nFind the value of 290 × 42.\nAns : (a).\n(b)\nFind the value of 3800 ÷ 20.\nAns: (b)'
  tasks,why=m.extract_tasks(raw,5)
  self.assertIsNone(why);self.assertEqual([t['sourcePart'] for t in tasks],['a','b'])
  self.assertEqual([t['evaluatedExactly'] for t in tasks],['12180','190'])
  clean=raw.replace('Ans : (a).','Ans : (a)')
  tasks,why=m.extract_tasks(clean,5)
  self.assertIsNone(why);self.assertEqual([t['evaluatedExactly'] for t in tasks],['12180','190'])
  for task in tasks:
   span=task['sourceSlice'];self.assertEqual(clean[span['start']:span['end']],span['rawText'])
   self.assertEqual(clean[task['contentStart']:span['end']].lstrip().splitlines()[0],task['sourceSlice']['rawText'].splitlines()[1])
  self.assertEqual(tasks[0]['leftoverRegions'][0]['rawText'],'19\n')
 def test_subpart_nonarithmetic_sibling_and_residue_are_not_dropped(self):
  raw='21\n(a)\nFind the value of 6.48 + 7.94.\nAns: (a)\n(b)\nConvert 5 kg 5 g to kilograms.\nAns: (b)\n_kg'
  tasks,why=m.extract_tasks(raw,5);self.assertIsNone(why);self.assertEqual(len(tasks),1)
  self.assertEqual(tasks[0]['evaluatedExactly'],'721/50')
  spans=[tasks[0]['sourceSlice'],*tasks[0]['leftoverRegions']]
  self.assertEqual(''.join(x['rawText'] for x in sorted(spans,key=lambda x:x['start'])),raw)
  self.assertIn('Convert 5 kg 5 g',tasks[0]['leftoverRegions'][1]['rawText'])
 def test_shared_givens_duplicate_parts_keys_and_footer_stay_rejected(self):
  for raw in ['Round all answers to the nearest tenth.\n(a) Calculate 1.25 + 3.14\n(b) Calculate 2.75 + 4.18','19\n(a) Calculate 2 + 3\n(a) Calculate 4 + 5','Answer key\n(a) Calculate 2 + 3\n(b) Calculate 4 + 5','19\n(a) Calculate 2 + 3\n(c) Calculate 4 + 5']:
   tasks,why=m.extract_tasks(raw,5);self.assertEqual(tasks,[]);self.assertTrue(why)
  self.reject('12\nFind the value of 102÷6.\n• Ans:.',3)
  self.reject('13\nFind the value of1078 - 156.\nAns:\n3\nATS 2025 P3 Math End-of-Year Paper',3)
 def test_spaced_numerals_cannot_be_concatenated_or_decimal_guessed(self):
  self.reject('18 Find the value of 4 92x8\nAns:',4)
  self.reject('Calculate 34 578 + 12',4)
  self.reject('Calculate 3 + 4\n9',4)
  self.check('18 Find the value of 4.92 × 8\nAns:',4,'984/25')
  self.check('Calculate 34,578 + 12',4,'34590')
if __name__=='__main__':unittest.main()
