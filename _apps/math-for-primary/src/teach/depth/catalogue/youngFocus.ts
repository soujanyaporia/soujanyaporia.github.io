import type {PlanEntry} from '../../build/plan';
import type {Tool} from '../../model';
import type {TeachingFocus} from './focus';

const idea=(question:string,answer:string,error:string,why:string,look:string,goal:string):TeachingFocus=>({question,answer,error,why,look,goal});
/** P1–P2 predictions use words a child can act on, with genuinely different answers. */
export function youngFocus(p:PlanEntry,picture?:Tool):TeachingFocus|undefined{
 if(p.level>2)return;
 const o=p.objective.toLowerCase();
 switch(p.code){
  case 'WN':{
   if(/ordinal/.test(o))return idea('Where do we start counting this queue?','At the front.','At either end.','Start at the front and count each child once: first, second, third. Counting from the other end changes their places.','Find the front of the queue. Count from there.','name a place in a queue');
   if(/odd|even/.test(o))return idea('How can we check if a number is even?','Give every counter a partner.','Put all the counters in one row.','An even number makes pairs with none left over. One counter without a partner means the number is odd.','Make pairs. Look for a counter without a partner.','use pairs to tell odd from even');
   if(/pattern/.test(o))return idea('How do we find the next number?','Find the same jump each time.','Choose any bigger number.','Look at the jump from one number to the next. Use that same jump again.','Check each jump before making the next one.','continue a number pattern');
   if(/compare|order/.test(o))return idea(p.level===1?'Which do we compare first: tens or ones?':'Which do we compare first: hundreds, tens or ones?',p.level===1?'Tens.':'Hundreds.','Ones.','Compare the biggest places first. If they match, look at the next place.','Line up matching places. Start on the left.','compare numbers using their places');
   if(/number names|read and write/.test(o))return p.level===1
    ?idea('Which do we write first: tens or ones?','Tens, then ones.','Ones, then tens.','The tens go on the left. The ones go on the right. The order matters.','Say the tens, then the ones.','write a number from its name')
    :idea('What do we write when a place is empty?','Zero.','Leave that place out.','Zero keeps an empty place. Leaving it out can move the other digits into the wrong places.','Write a digit for each place. Use zero for an empty place.','write hundreds, tens and ones from a number name');
   if(picture?.kind==='scene'&&picture.scene==='bundle-ten')return idea('How many counters make one group of ten?','Ten counters.','One counter.','A group of ten holds ten counters. Moving them together does not change how many there are.','Watch the same counters move into groups of ten.','count in tens and ones');
   return p.level===1
    ?idea('What is one ten worth?','10 ones.','1 one.','One ten holds 10 ones. Count the tens first, then any single ones.','Count each ten as 10, then count the ones.','read a number as tens and ones')
    :idea('How many tens make one hundred?','10 tens.','1 ten.','Count ten tens: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100.','Count hundreds, then tens, then ones.','read a number as hundreds, tens and ones');
  }
  case 'AS':{
   if(/taking away/.test(o))return idea('After we take some away, which counters do we count?','The counters that stay.','The counters taken away.','We want to know how many are left. Count only the counters that stay.','Cross out the counters taken away. Count the rest.','find how many stay after taking some away');
   if(/number bond/.test(o))return idea('What do the two parts make when we join them?','The whole.','Just one of the parts.','Join both parts to make the whole. Leave a part out and some counters are missing.','Point to each part, then join both parts.','join two parts to make a whole');
   if(/three one-digit/.test(o))return idea('Have we finished after joining just two groups?','No. One group is still waiting.','Yes. We can leave one group out.','We need all three groups. Join two first, then add the last group.','Keep an eye on the group still waiting.','add all three groups once');
   if(/symbol|correctly/.test(o))return idea('What does the = sign mean?','Both sides have the same amount.','The right side has more.','The = sign means “is equal to”. Both sides must have the same value.','Check the amount on each side of =.','use the equals sign for matching amounts');
   if(/combining/.test(o))return idea('When we join two groups, which counters belong in the total?','All the counters in both groups.','Only the bigger group.','Both groups belong in the total. Count one group, then count on the other.','Keep every counter. Count each one once.','add by joining two groups');
   if(/recall|facts within/.test(o))return idea('If we add one more counter, what happens to the total?','It goes up by one.','It goes down by one.','One extra counter makes the total one bigger. Use a fact you know, then adjust it.','Use a fact you know. Look at what changed.','use a known fact to find another');
   if(/mental/.test(o))return idea('If we add 10, which place do we add to?','The tens.','The ones.','Adding 10 means adding one ten. Adding 1 would add one single one.','Say whether you are adding ones, tens or hundreds.','add or subtract the right-sized units');
   return idea('If we swap one ten for ten ones, does the amount change?','No. It is still the same amount.','Yes. There is more now.','One ten and ten ones are equal. We can swap them to help us add or subtract.','Keep the same amount when you swap a ten for ones.','regroup without changing the amount');
  }
  case 'MD':{
   if(/equal groups/.test(o))return idea('What makes these groups equal?','Each group has the same number.','The groups can have different numbers.','Check how many are in each group. Equal groups have the same number in every group.','Count one group. Check the other groups match.','recognise equal groups');
   if(/share or group/.test(o))return idea('How do we share fairly?','Give everyone the same number.','Give the first person the most.','Deal one counter to each person in turn. Check everyone has the same number.','Share one at a time. Compare the shares.','share counters equally');
   if(/division symbol/.test(o))return idea('In a division sentence, which amount comes first?','The whole amount we start with.','The number each person gets.','Start with the whole amount. The next number tells us how to share or group it.','Start with the whole amount. Make equal shares.','read a division sentence');
   if(/connect|related/.test(o))return idea('If we share these counters equally again, must we use them all?','Yes. Every counter belongs in a share.','No. We can leave some out.','Grouping and sharing use the same total. Check that every counter is in an equal group.','Follow the same counters as we group and share them.','connect multiplication and division');
   return idea('If we add one more equal group, what do we add?','One whole group.','Always just one counter.','Each new group has the same number as the others. Add that number again.','Count by the number in each group.','build multiplication facts with equal groups');
  }
  case 'FRAC':{
   if(/compare unit/.test(o))return idea('Cut the same whole into more equal pieces. What happens to each piece?','Each piece gets smaller.','Each piece gets bigger.','The whole stays the same size. More equal pieces means smaller pieces.','Check the wholes are the same size. Compare one piece from each.','compare unit fractions');
   if(/compare/.test(o))return idea('The pieces are the same size. Which chosen share is bigger?','The share with more pieces.','The share with fewer pieces.','When each piece is the same size, more pieces cover more of the whole.','Check the pieces match in size, then count the blue ones.','compare like fractions');
   if(/add|subtract/.test(o))return idea('When we add one quarter to one quarter, do the pieces change size?','No. They are still quarters.','Yes. They become eighths.','We have two quarters now. We count more pieces, but each piece stays the same size.','Count the chosen pieces. Keep their name the same.','add or subtract like-sized fraction pieces');
   return idea('Which parts does the bottom number of a fraction count?','All the equal parts.','Only the white parts.','Count every part of the whole, blue and white. The top number counts the chosen parts.','Point to the whole. Count all its equal parts.','name a fraction using all parts and chosen parts');
  }
  case 'MONEY':{
   if(/decimal|convert/.test(o))return idea('How many cents have the same value as $1?','100 cents.','10 cents.','One dollar is worth 100 cents. The value stays the same when we change its name.','Keep dollars and cents separate as you count.','connect dollars and cents');
   return idea('To count money, what do we add?','The value on each coin or note.','Just the number of coins or notes.','A 10-cent coin is worth more than a 5-cent coin. Read each value before adding.','Read each coin or note. Add its value.','count money by its value');
  }
  case 'LENGTH':return idea('Where should the line start on the ruler?','At 0.','At 1.','Start at zero so every centimetre of the line is counted. Then read where it ends.','Line up the start with zero. Look at the end.','measure a line from zero');
  case 'MEASURE':{
   if(/mass/.test(o))return idea('What can a weighing scale tell us?','How heavy something is.','How long something is.','We measure mass in grams or kilograms. Read the scale and its unit.','Look at the scale. Say grams or kilograms with the number.','read a mass measurement');
   if(/liquid/.test(o))return idea('What does the litre mark on a jug measure?','How much liquid it holds.','How heavy the jug is.','Litres measure an amount of liquid. Look at where the liquid reaches the scale.','Read the liquid level, then say the unit.','read a liquid measurement');
   if(/suitable/.test(o))return idea('Which unit could we use for the length of a classroom?','Metres.','Litres.','Metres measure length. Litres measure liquid, so they cannot tell us the length of a room.','Decide what you are measuring before choosing a unit.','choose a unit that fits the measurement');
   return idea('What does one metre equal?','100 centimetres.','10 centimetres.','A metre is the same length as 100 centimetres. The unit changes, but the length stays the same.','Check the unit before comparing two lengths.','connect metres and centimetres');
  }
  case 'TIME':{
   if(/duration/.test(o))return idea('Which way do we move on a clock to find a later time?','Forwards.','Backwards.','Start at the first time. Move forwards by the time that passes.','Start at the given time. Count on.','find a later time');
   if(/clock/.test(o))return idea('Which hand tells us the minutes?','The long hand.','The short hand.','The long hand shows minutes. The short hand shows the hour.','Find the short hand for the hour and the long hand for minutes.','read the two hands of a clock');
   return idea('How many minutes make one hour?','60 minutes.','100 minutes.','One full trip of the minute hand takes 60 minutes. That is one hour.','Count each full hour as 60 minutes.','connect hours and minutes');
  }
  case 'SHAPE':{
   if(/pattern/.test(o))return idea('How do we find the next shape in a pattern?','Find the group that repeats.','Pick any shape we like.','Look for the same shapes in the same order. Repeat that group again.','Say the repeating group aloud.','continue a repeating shape pattern');
   if(/compose|decompose/.test(o))return idea('When pieces make one shape, how should they fit?','With no gaps or overlaps.','With some pieces on top of others.','The pieces must cover the whole shape. Turn them to make the edges fit.','Match the edges. Check for gaps.','make a shape from smaller pieces');
   if(/copy/.test(o))return idea('To copy a line on a grid, what should we count?','The spaces between the dots.','Only the dots.','A line from one dot to the next is one space long. Count the spaces as you copy it.','Start at the matching dot. Count each space.','copy a figure on a grid');
   return idea('If we turn a shape, does its name change?','No. It is still the same shape.','Yes. Turning it makes a new shape.','Turning does not change its sides, corners or curved parts. Look all around the shape.','Look at the whole shape, even after it turns.','recognise a shape in different positions');
  }
  case 'GRAPH':return p.level===1
   ?idea('The key says one picture means one object. How do we find the number?','Count each picture once.','Count each picture twice.','Use the key: one picture stands for one object. Count the pictures in the row you need.','Read the key. Find the right row. Count its pictures.','read a picture graph with one object per picture')
   :idea('Can one picture in a graph stand for more than one object?','Yes. Look at the key.','No. A picture always means one.','The key tells us what each picture is worth. Use that number as you count the pictures.','Read the key before counting the pictures.','use the key of a picture graph');
 }
}
