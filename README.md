# Financial Decision Game (MVP)

Teen players make 5 everyday financial decisions and see how each choice affects projected wealth at age 40.

## MVP Flow

1. Intro screen
2. Setup screen
3. Scenario screen (3 choices)
4. Result screen after each choice
5. Final results after scenario 5

## Starting Values

- Projected Wealth at 40: `$50,000`
- Cash Available: `$100`
- Money Habits: `50` (range: `0–100`)

## Game Logic

After each choice:

- `cash = cash + cashChange`
- `projectedWealth = projectedWealth + futureImpact`
- `moneyHabits = clamp(0..100, moneyHabits + moneyHabitsChange)`

## Scenario Data

Scenario content is data-driven and editable in:

- [src/data/scenarios.js](src/data/scenarios.js)

Each scenario includes:

- `context`
- `choices` (3 options)
- `cashChange`
- `futureImpact`
- `moneyHabitsChange`
- `bias`
- `resultText`

## Run

- `npm install`
- `npm run dev`
