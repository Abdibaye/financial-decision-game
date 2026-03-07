import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion'
import './App.css'
import { scenarios, STARTING_VALUES } from './data/scenarios'

function App() {
  const [phase, setPhase] = useState('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userName, setUserName] = useState('')
  const [cash, setCash] = useState(STARTING_VALUES.cash)
  const [projectedWealth, setProjectedWealth] = useState(STARTING_VALUES.projectedWealth)
  const [moneyHabits, setMoneyHabits] = useState(STARTING_VALUES.moneyHabits)
  const [lastChoice, setLastChoice] = useState(null)
  const [particles, setParticles] = useState([])
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

    // Trigger particles
    if (choice.cashChange !== 0 || choice.futureImpact !== 0) {
      const isPositive = choice.futureImpact > 0 || choice.cashChange > 0
      const newParticles = Array.from({ length: 8 }).map((_, i) => ({
        id: Date.now() + i,
        isPositive,
        x: Math.random() * 100 - 50, // Random spread
        y: Math.random() * 100 - 50
      }))
      setParticles(newParticles)
      setTimeout(() => setParticles([]), 2000)
    }

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
    setUserName('')
    setCash(STARTING_VALUES.cash)
    setProjectedWealth(STARTING_VALUES.projectedWealth)
    setMoneyHabits(STARTING_VALUES.moneyHabits)
    setLastChoice(null)
  }

  const getRank = (wealth) => {
    if (wealth >= 1000000) return { title: '👑 Wealth Wizard', color: '#f97316' }
    if (wealth >= 500000) return { title: '📈 Savvy Saver', color: '#0ea5a0' }
    if (wealth >= 100000) return { title: '🧗 Climbing the Ladder', color: '#8b5cf6' }
    return { title: '💸 Impulse Explorer', color: '#94a3b8' }
  }

  const canShowPanels = phase !== 'intro' && phase !== 'setup'

  const currentBackgroundImage = useMemo(() => {
    if (phase === 'intro' || phase === 'setup' || phase === 'final') {
      return '/Mar7Skyline.png'
    }
    return scenario?.image || '/Mar7Skyline.png'
  }, [phase, scenario])

  return (
    <main className="game-layout">
      <AnimatePresence>
        <motion.div
          key={currentBackgroundImage}
          className="background-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <img src={currentBackgroundImage} alt="" className="background-image" />
          <div className="background-overlay" />
        </motion.div>
      </AnimatePresence>

      <aside className="score-panel" aria-label="Running score">
        <h3>Running Score</h3>
        <ScoreCard label="Projected Wealth at 40" value={projectedWealth} isCurrency />
        <ScoreCard label="Cash Available" value={cash} isCurrency />
        <ScoreCard label="Money Habits" value={moneyHabits} suffix="/100" />

        <AnimatePresence>
          {particles.map(p => (
            <CoinParticle key={p.id} x={p.x} y={p.y} isPositive={p.isPositive} />
          ))}
        </AnimatePresence>
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
                  <div className="name-input-group">
                    <input
                      type="text"
                      className="name-input"
                      placeholder="Enter your name..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                  <motion.button
                    className="action-button"
                    disabled={!userName.trim()}
                    onClick={() => {
                      playClickSound()
                      setPhase('setup')
                    }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    style={{ opacity: userName.trim() ? 1 : 0.5 }}
                  >
                    Start the Simulation
                  </motion.button>
                </>
              )}

              {phase === 'setup' && (
                <>
                  <p className="eyebrow">Welcome, {userName}</p>
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

                  <div className="wealth-visualizer-container">
                    <p className="eyebrow" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>Wealth Trajectory</p>
                    <WealthVisualizer value={projectedWealth} />
                  </div>

                  <motion.button
                    className="action-button"
                    onClick={goToNextScenario}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    style={{ marginTop: '2rem' }}
                  >
                    {currentIndex + 1 === scenarios.length ? 'See Final Results' : 'Next Scenario'}
                  </motion.button>
                </>
              )}

              {phase === 'final' && (
                <>
                  <p className="eyebrow">Simulation Complete</p>
                  <h2>{userName}'s Outcome at 40</h2>

                  <div className="rank-display" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <p className="eyebrow">Your Final Rank</p>
                    <motion.h1
                      style={{ color: getRank(projectedWealth).color, background: 'none', WebkitTextFillColor: 'initial' }}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      {getRank(projectedWealth).title}
                    </motion.h1>
                  </div>

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
                    style={{ marginTop: '2rem' }}
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

function ScoreCard({ label, value, isCurrency = false, suffix = '' }) {
  const [display, setDisplay] = useState(
    isCurrency ? `$${value.toLocaleString()}` : value.toLocaleString()
  )

  const springValue = useSpring(value, {
    stiffness: 40,
    damping: 20,
    mass: 1
  })

  useEffect(() => {
    springValue.set(value)
  }, [value, springValue])

  useEffect(() => {
    return springValue.on('change', (latest) => {
      const rounded = Math.round(latest)
      setDisplay(isCurrency ? `$${rounded.toLocaleString()}` : rounded.toLocaleString())
    })
  }, [springValue, isCurrency])

  return (
    <div className="score-card">
      <p>{label}</p>
      <motion.strong>
        {display}{suffix}
      </motion.strong>
    </div>
  )
}

function CoinParticle({ x, y, isPositive }) {
  return (
    <motion.div
      className={`coin-particle ${isPositive ? 'positive' : 'negative'}`}
      initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: isPositive ? -150 : 150,
        x: x,
        scale: [0, 1.5, 1.5, 0],
        rotate: isPositive ? 360 : -360
      }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none' }}
    >
      {isPositive ? '💰' : '💸'}
    </motion.div>
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

function WealthVisualizer({ value }) {
  // Max wealth for visualization purposes is $1.5M
  const percentage = Math.min(100, (value / 1500000) * 100)

  return (
    <div className="wealth-visualizer">
      <motion.div
        className="wealth-bar"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
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

