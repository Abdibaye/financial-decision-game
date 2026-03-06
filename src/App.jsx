import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'
import { scenarios, STARTING_VALUES } from './data/scenarios'

function App() {
  const [phase, setPhase] = useState('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_VALUES.cash)
  const [projectedWealth, setProjectedWealth] = useState(STARTING_VALUES.projectedWealth)
  const [moneyHabits, setMoneyHabits] = useState(STARTING_VALUES.moneyHabits)
  const [lastChoice, setLastChoice] = useState(null)
  const [soundOn, setSoundOn] = useState(true)
  const audioContextRef = useRef(null)

  const scenario = scenarios[currentIndex]

  const progressPercent = useMemo(() => {
    if (phase === 'intro' || phase === 'setup') {
      return 0
    }

    return ((currentIndex + (phase === 'final' ? 1 : 0)) / scenarios.length) * 100
  }, [phase, currentIndex])

  const clampMoneyHabits = (value) => Math.max(0, Math.min(100, value))

  const playTone = (frequency, durationMs, type = 'sine', gainValue = 0.025) => {
    if (!soundOn || typeof window === 'undefined' || !window.AudioContext) {
      return
    }

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new window.AudioContext()
    }

    const context = audioContextRef.current
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, context.currentTime)

    gainNode.gain.setValueAtTime(0.0001, context.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationMs / 1000)

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + durationMs / 1000)
  }

  const playClickSound = () => {
    playTone(420, 60, 'triangle', 0.024)
  }

  const playOutcomeSound = (futureImpact) => {
    if (futureImpact >= 0) {
      playTone(560, 85, 'triangle', 0.03)
      setTimeout(() => playTone(740, 130, 'sine', 0.024), 70)
      return
    }

    playTone(250, 95, 'sawtooth', 0.02)
    setTimeout(() => playTone(180, 135, 'triangle', 0.018), 60)
  }

  const handleChoice = (choice) => {
    playOutcomeSound(choice.futureImpact)
    setCash((value) => value + choice.cashChange)
    setProjectedWealth((value) => value + choice.futureImpact)
    setMoneyHabits((value) => clampMoneyHabits(value + choice.moneyHabitsChange))
    setLastChoice(choice)
    setPhase('outcome')
  }

  const goToNextScenario = () => {
    playClickSound()
    const nextIndex = currentIndex + 1

    if (nextIndex >= scenarios.length) {
      setPhase('final')
      return
    }

    setCurrentIndex(nextIndex)
    setLastChoice(null)
    setPhase('decision')
  }

  const replay = () => {
    playClickSound()
    setPhase('intro')
    setCurrentIndex(0)
    setCash(STARTING_VALUES.cash)
    setProjectedWealth(STARTING_VALUES.projectedWealth)
    setMoneyHabits(STARTING_VALUES.moneyHabits)
    setLastChoice(null)
  }

  const canShowPanels = phase !== 'intro' && phase !== 'setup'

  return (
    <main className="game-layout">
      <aside className="score-panel" aria-label="Running score">
        <h3>Running Score</h3>
        <ScoreCard label="Projected Wealth at 40" value={`$${projectedWealth.toLocaleString()}`} />
        <ScoreCard label="Cash Available" value={`$${cash.toLocaleString()}`} />
        <ScoreCard label="Money Habits" value={`${moneyHabits}/100`} />
      </aside>

      <section className="game-shell">
        <section className="card-stage">
          <AnimatePresence mode="wait">
            <motion.article
              className="game-card"
              key={`${phase}-${currentIndex}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.28 }}
            >
              {phase === 'intro' && (
                <>
                  <p className="eyebrow">Financial Decision Game</p>
                  <h1>Could your everyday decisions make you a millionaire by 40?</h1>
                  <p className="card-copy">Let’s find out.</p>
                  <motion.button
                    className="action-button"
                    onClick={() => {
                      playClickSound()
                      setPhase('setup')
                    }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    Start the Simulation
                  </motion.button>
                </>
              )}

              {phase === 'setup' && (
                <>
                  <p className="eyebrow">Before You Begin</p>
                  <h2>You are 16 years old.</h2>
                  <p className="card-copy">
                    Over the next few minutes you will make a series of everyday financial decisions.
                    Each one will affect your financial future.
                  </p>
                  <motion.button
                    className="action-button"
                    onClick={() => {
                      playClickSound()
                      setPhase('decision')
                    }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    Begin
                  </motion.button>
                </>
              )}

              {phase === 'decision' && (
                <>
                  <div className="challenge-head">
                    <span className="challenge-chip">🎮 Decision {currentIndex + 1}</span>
                    <span className="challenge-chip icon">{scenario.icon ?? '🎯'}</span>
                  </div>
                  <p className="eyebrow game-eyebrow">Money Challenge</p>
                  <h2 className="challenge-title">{scenario.title.replace(/^Scenario\s\d+\s—\s/, '')}</h2>
                  <p className="card-copy scenario-copy">{scenario.context}</p>
                  <p className="choice-prompt">What do you do next?</p>
                  <div className="button-stack">
                    {scenario.choices.map((choice) => (
                      <motion.button
                        key={choice.label}
                        className="decision-button"
                        onClick={() => handleChoice(choice)}
                        whileHover={{ y: -2, scale: 1.005 }}
                        whileTap={{ scale: 0.985 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                      >
                        <span className="choice-tag">{getChoiceTag(choice.label)}</span>
                        <span>{choice.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              {phase === 'outcome' && lastChoice && (
                <>
                  <p className="eyebrow">Result</p>
                    <motion.h2
                      className="consequence-title"
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      Choice Consequence
                    </motion.h2>
                    <motion.p
                      className="card-copy consequence-copy"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.05, ease: 'easeOut' }}
                    >
                      {lastChoice.resultText}
                    </motion.p>
                  <div className="impact-grid">
                      <Impact label="Cash Change" value={lastChoice.cashChange} currency delay={0.08} />
                      <Impact
                        label="Projected Wealth Impact"
                        value={lastChoice.futureImpact}
                        currency
                        delay={0.14}
                      />
                      <Impact
                        label="Money Habits Change"
                        value={lastChoice.moneyHabitsChange}
                        delay={0.2}
                      />
                      <Impact label="Bias" value={lastChoice.bias} text delay={0.26} />
                  </div>
                  <motion.button
                    className="action-button"
                    onClick={goToNextScenario}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    {currentIndex + 1 === scenarios.length ? 'See Final Results' : 'Next Scenario'}
                  </motion.button>
                </>
              )}

              {phase === 'final' && (
                <>
                  <p className="eyebrow">Simulation Complete</p>
                  <h2>Your Projected Outcome at 40</h2>
                  <div className="results-grid">
                    <Result label="Projected Wealth at 40" value={`$${projectedWealth.toLocaleString()}`} />
                    <Result label="Cash Available" value={`$${cash.toLocaleString()}`} />
                    <Result label="Money Habits" value={`${moneyHabits}/100`} />
                  </div>
                  <motion.button
                    className="action-button"
                    onClick={replay}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    Replay Simulation
                  </motion.button>
                </>
              )}
            </motion.article>
          </AnimatePresence>
        </section>
      </section>

      <aside className="progress-panel" aria-label="Decision progress">
        <h3>Progress</h3>
        <button
          className="sound-toggle"
          onClick={() => {
            setSoundOn((value) => !value)
          }}
        >
          {soundOn ? '🔊 Sound On' : '🔈 Sound Off'}
        </button>
        <p className="progress-text">
          {canShowPanels
            ? `Decision ${Math.min(currentIndex + 1, scenarios.length)} of ${scenarios.length}`
            : `Decision 0 of ${scenarios.length}`}
        </p>
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </aside>
    </main>
  )
}

function ScoreCard({ label, value }) {
  return (
    <div className="score-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function Impact({ label, value, currency = false, text = false, delay = 0 }) {
  const formatNumber = (numberValue) => {
    const absolute = Math.abs(numberValue).toLocaleString()

    if (numberValue > 0) {
      return `+${absolute}`
    }

    if (numberValue < 0) {
      return `-${absolute}`
    }

    return '0'
  }

  const displayValue = (() => {
    if (text) {
      return value
    }

    if (currency) {
      if (value === 0) {
        return '$0'
      }

      const prefix = value > 0 ? '+$' : '-$'
      return `${prefix}${Math.abs(value).toLocaleString()}`
    }

    return formatNumber(value)
  })()

  return (
    <motion.div
      className="impact-card"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, delay, ease: 'easeOut' }}
    >
      <p>{label}</p>
      <strong>{displayValue}</strong>
    </motion.div>
  )
}

function Result({ label, value }) {
  return (
    <div className="result-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function getChoiceTag(label) {
  if (/skip|wait|research|subway and keep|eat at home/i.test(label)) {
    return '🧠 Strategic'
  }

  if (/buy|order|uber|grab/i.test(label)) {
    return '⚡ Quick Move'
  }

  return '🎲 Your Move'
}

export default App

