import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-initial-charge-started-blocks',
  level: 5,
  title: 'Charges for repeated bookings and journeys',
  objective: 'Calculate one charge using an included allowance and fully charged started blocks, then find the cost of repeated bookings or journeys.',
  skillIds: ['P5.S.RATE.02', 'P5.S.DEC.02', 'P4.S.DEC.06'],
  canonicalPatternId: 'p5-initial-charge-and-started-blocks',
} as const;

type Steps = NonNullable<Question['workedSteps']>;
const dollars = (cents: number): string => (cents / 100).toFixed(2);
const cash = (cents: number): string => `$${dollars(cents)}`;

function clock(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}

function chooseExtent(r: Rng, included: number, block: number, maximumWhole: number): number {
  const mode = r.int(0, 5);
  const whole = r.int(2, maximumWhole);
  switch (mode) {
    case 0: return included - r.int(0, 1);
    case 1: return included + 1;
    case 2: return included + whole * block - 1;
    case 3: return included + whole * block;
    case 4: return included + whole * block + 1;
    default: return included + (whole - 1) * block + Math.floor(block / 2);
  }
}

function chargeSteps(
  extent: number,
  included: number,
  block: number,
  initialCents: number,
  blockCents: number,
  unit: string,
  item: string,
): {oneCents: number; steps: Steps} {
  const extra = Math.max(0, extent - included);
  const full = Math.floor(extra / block);
  const remainder = extra % block;
  const charged = Math.ceil(extra / block);
  const oneCents = initialCents + charged * blockCents;
  return {
    oneCents,
    steps: [
      extra === 0
        ? {
            text: `The use is within the ${included} ${unit} covered by the initial charge.`,
            equation: `Additional use = 0 ${unit}`,
          }
        : {
            text: 'Subtract the amount covered by the initial charge.',
            equation: `${extent} − ${included} = ${extra} ${unit}`,
          },
      {
        text: remainder === 0
          ? 'There is no partly used block, so no extra block needs to be added.'
          : `The remaining ${remainder} ${unit} start one more block, which must be paid for in full.`,
        equation: `${extra} = ${full} × ${block} + ${remainder}; charge for ${charged} blocks`,
      },
      {
        text: `Find the charge for one ${item}.`,
        equation: `${cash(initialCents)} + ${charged} × ${cash(blockCents)} = ${cash(oneCents)}`,
      },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = r.int(0, 2);
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const finish = (context: string[], prompt: string, totalCents: number, hint: string, steps: Steps): Question => ({
    key,
    context,
    prompt,
    answer: dollars(totalCents),
    unit: 'dollars',
    hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation ?? ''}`).join(' '),
  });

  if (variant < 2) {
    const bicycle = variant === 0;
    const singular = bicycle ? 'bicycle' : 'badminton court';
    const plural = bicycle ? 'bicycles' : 'badminton courts';
    const includedHours = bicycle ? 1 : 2;
    const included = includedHours * 60;
    const block = bicycle ? 30 : 60;
    const initialCents = r.pick(bicycle ? [450, 550, 650, 750] : [900, 1050, 1200, 1350]);
    const blockCents = r.pick(bicycle ? [125, 175, 225, 275] : [225, 275, 325, 375, 425]);
    const count = r.int(2, 5);
    const duration = chooseExtent(r, included, block, 5);
    const start = 8 * 60 + r.int(0, 7) * 15;
    const end = start + duration;
    const charge = chargeSteps(duration, included, block, initialCents, blockCents, 'minutes', singular);
    const totalCents = charge.oneCents * count;
    const steps: Steps = [
      {
        text: `From ${clock(start)} to ${clock(end)} is ${Math.floor(duration / 60)} h ${duration % 60} min.`,
        equation: `${Math.floor(duration / 60)} × 60 + ${duration % 60} = ${duration} minutes`,
      },
      ...charge.steps,
      {
        text: `Each of the ${count} ${plural} has the same charge.`,
        equation: `${count} × ${cash(charge.oneCents)} = ${cash(totalCents)}`,
      },
    ];
    return finish(
      [
        `Fees for 1 ${singular}:`,
        `The first ${includedHours} ${includedHours === 1 ? 'hour' : 'hours'} or less costs ${cash(initialCents)}.`,
        `Each additional ${block} minutes costs ${cash(blockCents)}. A partly used block also costs the full amount.`,
        `${count} ${plural} are ${bicycle ? 'rented' : 'booked'} from ${clock(start)} to ${clock(end)} on the same day. Each ${singular} is charged separately. There are no other charges.`,
      ],
      `How much is paid for all the ${plural}?`,
      totalCents,
      'Find the elapsed time and the charge for one booking. Include any partly used extra block, then multiply by the number of bookings.',
      steps,
    );
  }

  const included = 1000;
  const block = r.pick([250, 300, 350, 400]);
  const initialCents = r.pick([280, 340, 380, 420]);
  const blockCents = r.pick([15, 25, 35, 45]);
  const distance = chooseExtent(r, included, block, 12);
  const distanceKm = (distance / 1000).toFixed(3);
  const weeks = 4;
  const weekdays = 5;
  const journeys = weeks * weekdays;
  const charge = chargeSteps(distance, included, block, initialCents, blockCents, 'm', 'journey');
  const totalCents = charge.oneCents * journeys;
  const steps: Steps = [
    {
      text: 'Use metres throughout. The initial charge covers 1 km, which is 1000 m.',
      equation: `${distanceKm} × 1000 = ${distance} m`,
    },
    ...charge.steps,
    {
      text: 'Monday to Friday gives 5 journeys each week. Count only the stated outward journeys.',
      equation: `${weekdays} × ${weeks} = ${journeys} journeys`,
    },
    {
      text: 'Multiply the fare for one journey by the number of journeys.',
      equation: `${journeys} × ${cash(charge.oneCents)} = ${cash(totalCents)}`,
    },
  ];
  return finish(
    [
      'Taxi fares for 1 journey:',
      `The first 1 km or less costs ${cash(initialCents)}.`,
      `Each additional ${block} m costs ${cash(blockCents)}. A partly used block also costs the full amount. These rates apply to journeys of up to 10 km.`,
      `Ms Devi travels ${distanceKm} km by taxi on each weekday, Monday to Friday.`,
      `For this question, the month has ${weeks} weeks. She makes 1 one-way journey on each of those days, with no return journey included. There are no other charges.`,
    ],
    'How much does Ms Devi pay for these taxi journeys in the month?',
    totalCents,
    'Convert the distance to metres and find one fare, counting any partly used extra block. Then count the journeys in the month.',
    steps,
  );
}
