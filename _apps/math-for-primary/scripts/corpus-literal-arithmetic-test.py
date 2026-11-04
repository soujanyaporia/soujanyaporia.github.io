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
if __name__=='__main__':unittest.main()
