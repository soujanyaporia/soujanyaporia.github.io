#!/usr/bin/env python3
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('reuse',Path(__file__).with_name('corpus-template-reuse.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ReuseTest(unittest.TestCase):
 def test_precise_rules_and_captures(self):
  cases=[('Round 589.02 to the nearest tenth.', 'round-decimal-tenth',{'number':'589.02'}),('How many minutes are there in 7 hours?', 'whole-hours-to-minutes',{'hours':'7'}),('The radius of a circle is 21 cm. Find the circumference in terms of π.', 'circle-radius-symbolic-circumference',{'radius':'21','unit':'cm'})]
  for text,rule,fields in cases:
   with self.subTest(text=text):
    hit=m.matches(text);self.assertEqual([x['rule'] for x in hit],[rule]);self.assertEqual(hit[0]['capturedValues'],fields);a,b=hit[0]['characterSpan'];self.assertEqual(text[a:b],hit[0]['matchedText'])
 def test_tens_place_and_unit_equation(self):
  self.assertEqual(m.matches('Which digit is in the tens place?')[0]['rule'],'tens-place-digit')
  self.assertEqual(m.matches('2 hours = minutes')[0]['capturedValues'],{'hours':'2'})
 def test_different_tasks_are_not_promoted(self):
  for text in ['Round 17.45 to the nearest hundredth.','How many minutes are there in 4 hours and 27 minutes?','The diameter of a circle is 21 cm. Find the circumference in terms of π.','A circle has radius 21 cm. Find its circumference using π = 3.14.']:
   with self.subTest(text=text):self.assertEqual(m.matches(text),[])
 def test_merged_region_stays_a_proposal(self):
  text='23 (a) How many minutes are there in 7 hours? (b) At this rate how many pages in 15 minutes?';hit=m.matches(text);self.assertEqual(len(hit),1);self.assertNotEqual(hit[0]['matchedText'],text)
if __name__=='__main__':unittest.main()
