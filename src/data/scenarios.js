export const STARTING_VALUES = {
  projectedWealth: 50000,
  cash: 100,
  moneyHabits: 50,
}

export const scenarios = [
  {
    id: 'after-school-bodega',
    title: 'Scenario 1 — After-School Bodega',
    icon: '🥤',
    image: '/BodegaFinal.png',
    context:
      'School just ended and you stop at the corner bodega with friends. Everyone is grabbing snacks and drinks before heading home. You realize you spend about $6 here most school days. Your friend jokes: “This place probably makes half its money from us.”',
    choices: [
      {
        label: 'Grab a snack and drink',
        cashChange: -6,
        futureImpact: -25000,
        moneyHabitsChange: -2,
        bias: 'Present Bias',
        resultText:
          'You grabbed a snack and drink. Small daily habits can quietly drain money over time.',
      },
      {
        label: 'Just grab a drink',
        cashChange: -3,
        futureImpact: -10000,
        moneyHabitsChange: 1,
        bias: 'Present Bias',
        resultText:
          'You spent less than usual. Cutting costs, even a little, improves long-term outcomes.',
      },
      {
        label: 'Skip the bodega today',
        cashChange: 0,
        futureImpact: 0,
        moneyHabitsChange: 3,
        bias: 'Present Bias',
        resultText:
          'You skipped the bodega. Building this habit creates more control over your money.',
      },
    ],
  },
  {
    id: 'uber-vs-subway',
    title: 'Scenario 2 — Uber vs Subway',
    icon: '🚇',
    image: '/UberFinal.png',
    context:
      'You and your friends are heading home after hanging out. The subway costs about $3. An Uber ride would cost about $22. Your friend says: “Let’s just Uber — it’s faster.”',
    choices: [
      {
        label: 'Split the Uber',
        cashChange: -11,
        futureImpact: -18000,
        moneyHabitsChange: -2,
        bias: 'Convenience Bias',
        resultText:
          'You chose convenience. Frequent premium choices can heavily reduce future wealth.',
      },
      {
        label: 'Take the subway',
        cashChange: -3,
        futureImpact: -500,
        moneyHabitsChange: 1,
        bias: 'Convenience Bias',
        resultText:
          'You took the subway. Choosing lower-cost options protects your long-term trajectory.',
      },
      {
        label: 'Subway and keep the difference',
        cashChange: -3,
        futureImpact: 8000,
        moneyHabitsChange: 3,
        bias: 'Convenience Bias',
        resultText:
          'You took the subway and kept the difference. Smart tradeoffs compound over time.',
      },
    ],
  },
  {
    id: 'food-delivery',
    title: 'Scenario 3 — Food Delivery',
    icon: '🍔',
    image: '/GamerFinal.png',
    context:
      'You’re home studying and don’t feel like cooking. Food delivery would cost about $18. There’s food in the kitchen, but ordering would be easier.',
    choices: [
      {
        label: 'Order delivery',
        cashChange: -18,
        futureImpact: -12000,
        moneyHabitsChange: -2,
        bias: 'Present Bias',
        resultText:
          'You ordered delivery. Convenience spending can quietly eat into long-term growth.',
      },
      {
        label: 'Split delivery with a friend',
        cashChange: -9,
        futureImpact: -5000,
        moneyHabitsChange: 0,
        bias: 'Present Bias',
        resultText:
          'You reduced the cost by splitting. Better than full price, but still a tradeoff.',
      },
      {
        label: 'Eat at home',
        cashChange: 0,
        futureImpact: 4000,
        moneyHabitsChange: 2,
        bias: 'Present Bias',
        resultText:
          'You ate at home. Choosing what you already have supports healthier money habits.',
      },
    ],
  },
  {
    id: 'sneaker-drop',
    title: 'Scenario 4 — Sneaker Drop',
    icon: '👟',
    image: '/SneakerDropFinal.png',
    context:
      'Everyone at school is talking about a sneaker release this weekend. Price: $240. Your friend says: “If you don’t buy them now, you’ll regret it.”',
    choices: [
      {
        label: 'Buy the sneakers now',
        cashChange: -240,
        futureImpact: -5000,
        moneyHabitsChange: -3,
        bias: 'Social Proof',
        resultText:
          'You bought immediately. Pressure-based spending can weaken future financial flexibility.',
      },
      {
        label: 'Wait a week',
        cashChange: 0,
        futureImpact: 800,
        moneyHabitsChange: 2,
        bias: 'Social Proof',
        resultText:
          'You waited before deciding. Delaying impulse purchases often leads to better choices.',
      },
      {
        label: 'Skip the drop',
        cashChange: 0,
        futureImpact: 2500,
        moneyHabitsChange: 3,
        bias: 'Social Proof',
        resultText:
          'You skipped the drop. Staying focused on your priorities strengthens long-term wealth.',
      },
    ],
  },
  {
    id: 'paycheck-bitcoin',
    title: 'Scenario 5 — First Paycheck & Bitcoin Screenshot',
    icon: '₿',
    image: '/PaycheckFinal.png',
    context:
      'You just received your first paycheck from your part-time job. After taxes it is $320. Later that day a friend shows you a screenshot on their phone. Their Bitcoin investment is up $800. They say: “You should buy some before it goes higher.”',
    choices: [
      {
        label: 'Buy Bitcoin immediately',
        cashChange: -100,
        futureImpact: -1500,
        moneyHabitsChange: -4,
        bias: 'Herd Behavior / FOMO',
        resultText:
          'You bought based on hype. Emotional investing can increase risk and reduce outcomes.',
      },
      {
        label: 'Research before investing',
        cashChange: 0,
        futureImpact: 1200,
        moneyHabitsChange: 4,
        bias: 'Herd Behavior / FOMO',
        resultText:
          'You researched first. Informed decisions build confidence and better investing habits.',
      },
      {
        label: 'Ignore the hype',
        cashChange: 0,
        futureImpact: 800,
        moneyHabitsChange: 2,
        bias: 'Herd Behavior / FOMO',
        resultText:
          'You ignored the hype. Avoiding crowd pressure helps you stay disciplined.',
      },
    ],
  },
]