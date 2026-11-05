import runpy
import unittest
from pathlib import Path
m=runpy.run_path(str(Path(__file__).with_name('batch10-upper-source-leads.py')))
lead=m['lead']
class ConservativeSourceLeads(unittest.TestCase):
 def test_square_volume_and_missing_givens(self):
  q='A solid cuboid of height 10 cm has a square base of side 4 cm. What is the volume?'
  result=lead(q);self.assertEqual(result['independentSourceAnswer']['value'],'1.6E+2');self.assertEqual(result['givens']['baseSideCm'],'4')
  self.assertIsNone(lead('A solid cuboid has a square base of side 4 cm. What is its volume?'))
  self.assertIsNone(lead('A square has side 4 cm. What is its volume?'))
 def test_average_and_source_key(self):
  q='The average price of a set of books is $12. When one more book which cost $42 is added into the set of books, the average price of the books became $18. How many books are there at first?'
  self.assertEqual(lead(q)['independentSourceAnswer']['value'],'4')
  self.assertIsNone(lead('Answer key: '+q))
  self.assertIsNone(lead(q.replace('$42','$15')))
 def test_mixed_units(self):
  q='A cuboid is 0.4 m long and 20 cm wide. It has a volume of 20000 cm3. Find the height of the cuboid.'
  self.assertEqual(lead(q)['independentSourceAnswer']['value'],'25')
  self.assertIsNone(lead(q.replace('0.4 m','0.4 cm')))
if __name__=='__main__':unittest.main()
