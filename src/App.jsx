import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion'
import './App.css'
import { scenarios, STARTING_VALUES } from './data/scenarios'

function App() {
  const [phase, setPhase] = useState('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_VALUES.cash)
  const [projectedWealth, setProjectedWealth] = useState(STARTING_VALUES.projectedWealth)
  const [moneyHabits, setMoneyHabits] = useState(STARTING_VALUES.moneyHabits)
  const [lastChoice, setLastChoice] = useState(null)
  const [decisionResults, setDecisionResults] = useState([])
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

    const prevValues = {
      cash,
      projectedWealth,
      moneyHabits
    }

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

    setLastChoice({ ...choice, prevValues })
    setDecisionResults((prev) => [
      ...prev,
      {
        scenarioTitle: scenario.title.replace(/^Scenario\s\d+\s—\s/, ''),
        choiceText: choice.label,
        futureImpact: choice.futureImpact,
        resultTag: choice.resultTag
      }
    ])
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
    setDecisionResults([])
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
    <main className={`game-layout ${phase === 'intro' || phase === 'final' ? 'intro-layout' : ''}`}>
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

      {phase !== 'intro' && phase !== 'final' && (
        <aside className="score-panel" aria-label="Running score">
          <h3>Running Score</h3>
          <ScoreCard
            label="Projected Wealth at 40"
            value={projectedWealth}
            isCurrency
            tone="score-wealth"
            change={phase === 'outcome' ? lastChoice?.futureImpact : null}
            prevValue={phase === 'outcome' ? lastChoice?.prevValues?.projectedWealth : null}
          />
          <ScoreCard
            label="Cash Available"
            value={cash}
            isCurrency
            tone="score-cash"
            change={phase === 'outcome' ? lastChoice?.cashChange : null}
            prevValue={phase === 'outcome' ? lastChoice?.prevValues?.cash : null}
          />
          <ScoreCard
            label="Money Habits Score"
            value={moneyHabits}
            suffix="/100"
            tone="score-habits"
            change={phase === 'outcome' ? lastChoice?.moneyHabitsChange : null}
            prevValue={phase === 'outcome' ? lastChoice?.prevValues?.moneyHabits : null}
          />

          <AnimatePresence>
            {particles.map(p => (
              <CoinParticle key={p.id} x={p.x} y={p.y} isPositive={p.isPositive} />
            ))}
          </AnimatePresence>
        </aside>
      )}

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
                <div className="intro-content">
                  <h1>Can your everyday decisions <br /> make you a <span className="gradient-text">millionaire by 40?</span></h1>
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
                    Start
                  </motion.button>
                </div>
              )}

              {phase === 'setup' && (
                <>
                  <p className="eyebrow">Welcome</p>
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
                  <p className="eyebrow game-eyebrow">What do you do next?</p>
                  <h2 className="challenge-title">{scenario.title.replace(/^Scenario\s\d+\s—\s/, '')}</h2>
                  <p className="card-copy scenario-copy">{scenario.context}</p>
                  <div className="button-stack">
                    {scenario.choices.map((choice) => (
                      <motion.button
                        key={choice.label}
                        className="decision-button"
                        onClick={() => handleChoice(choice)}
                        whileHover={{ y: -2, scale: 1.005, backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                        whileTap={{ scale: 0.985 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                      >
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
                    {lastChoice.feedbackHeadline}
                  </motion.h2>
                  <motion.p
                    className="card-copy consequence-copy"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05, ease: 'easeOut' }}
                  >
                    {lastChoice.wealthExplanation}
                  </motion.p>

                  <div className="result-cards-container">
                    <motion.div
                      className="result-card-item compound-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="card-label">Projected Wealth Impact</p>
                      <strong className={`card-value ${lastChoice.futureImpact >= 0 ? 'positive' : 'negative'}`}>
                        {lastChoice.futureImpact >= 0 ? '+' : '-'}${Math.abs(lastChoice.futureImpact).toLocaleString()}
                      </strong>
                      <p className="card-subtext">Compound value at age 40</p>
                    </motion.div>

                    <motion.div
                      className="result-card-item bias-card"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="card-label">Behavioral Bias</p>
                      <strong className="card-value">{lastChoice.bias}</strong>
                      <p className="card-subtext">{lastChoice.biasExplanation}</p>
                    </motion.div>
                  </div>

                  <motion.button
                    className="action-button"
                    onClick={goToNextScenario}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    style={{ marginTop: '2rem' }}
                  >
                    {currentIndex + 1 === scenarios.length ? 'See Final Results' : 'Next Decision →'}
                  </motion.button>
                </>
              )}

              {phase === 'final' && (
                <SummaryScreen
                  projectedWealth={projectedWealth}
                  cash={cash}
                  moneyHabits={moneyHabits}
                  decisionResults={decisionResults}
                  onReplay={replay}
                />
              )}
            </motion.article>
          </AnimatePresence>
        </section>
      </section>

      {phase !== 'intro' && phase !== 'final' && (
        <aside className="progress-panel" aria-label="Decision progress">
          <h3>Progress</h3>
          <p className="progress-text">
            {canShowPanels
              ? `Decision ${Math.min(currentIndex + 1, scenarios.length)} of ${scenarios.length}`
              : `Decision 1 of ${scenarios.length}`}
          </p>
          <div className="progress-track">
            <motion.div
              className="progress-fill"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          <ul className="scenario-progress-list" aria-label="Scenario list">
            {scenarios.map((item, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex

              return (
                <li
                  key={item.id}
                  className={`scenario-progress-item ${
                    isCompleted ? 'is-complete' : isCurrent ? 'is-current' : 'is-upcoming'
                  }`}
                >
                  <span className="scenario-toggle" aria-hidden="true" />
                  <span className="scenario-progress-title">
                    {item.title.replace(/^Scenario\s\d+\s—\s/, '')}
                  </span>
                </li>
              )
            })}
          </ul>
        </aside>
      )}

      <div className={`bottom-stats-bar ${phase === 'intro' ? 'intro-stats-bar' : ''}`}>
        <div className="stat-item">
          <span className="stat-value" style={{ color: '#4ade80' }}>${projectedWealth.toLocaleString()}</span>
          <span className="stat-label">Projected Wealth at 40</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: '#38bdf8' }}>${cash.toLocaleString()}</span>
          <span className="stat-label">Cash Available</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{moneyHabits}/100</span>
          <span className="stat-label">Money Habits Score</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{scenarios.length - currentIndex}</span>
          <span className="stat-label">Decisions Ahead</span>
        </div>
      </div>
    </main>
  )
}

function ScoreCard({ label, value, isCurrency = false, suffix = '', change = null, prevValue = null, tone = '' }) {
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

  const formatChange = (val) => {
    if (val === 0) return ''
    const sign = val > 0 ? '+' : '-'
    const absVal = Math.abs(val).toLocaleString()
    return `(${sign}${absVal})`
  }

  return (
    <div className={`score-card ${tone}`}>
      <p className="score-label">{label}</p>
      {prevValue !== null ? (
        <div className="score-transition">
          <span className="prev-value">
            {isCurrency ? `$${prevValue.toLocaleString()}` : prevValue}{suffix}
          </span>
          <span className="arrow">→</span>
          <span className="current-value">
            {isCurrency ? `$${value.toLocaleString()}` : value}{suffix}
          </span>
          {change !== null && change !== 0 && (
            <span className={`change-pill ${change > 0 ? 'positive' : 'negative'}`}>
              {formatChange(change)}
            </span>
          )}
        </div>
      ) : (
        <motion.strong>
          {display}{suffix}
        </motion.strong>
      )}
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

function SummaryScreen({ projectedWealth, cash, moneyHabits, decisionResults, onReplay }) {
  const moneyStyleData = useMemo(() => {
    if (moneyHabits >= 80) return {
      title: "The Long Game",
      desc: "You consistently made decisions that favor future wealth. Your habits are working for you."
    }
    if (moneyHabits >= 65) return {
      title: "Building Momentum",
      desc: "Good decisions are starting to compound. Keep the streak going."
    }
    if (moneyHabits >= 50) return {
      title: "Learning the Game",
      desc: "You’re starting to see how small choices shape long-term outcomes. Some decisions helped, others held you back."
    }
    if (moneyHabits >= 35) return {
      title: "Wake Up Call",
      desc: "Several costly choices slowed your progress — and now you know why."
    }
    return {
      title: "Fresh Start",
      desc: "This run showed how expensive habits can become. The good news: every decision is a chance to reset."
    }
  }, [moneyHabits])

  const wealthIncrease = projectedWealth - STARTING_VALUES.projectedWealth
  const multiplier = (projectedWealth / STARTING_VALUES.projectedWealth).toFixed(1)

  return (
    <div className="summary-container">
      <aside className="summary-left-panel">
        <p className="eyebrow">Final Score</p>
        <div className="final-score-cards">
          <div className="final-score-card">
            <p>Projected Wealth at 40</p>
            <div className="final-val-group">
              <strong className="wealth-val">${projectedWealth.toLocaleString()}</strong>
              <span className="final-change positive">+{wealthIncrease.toLocaleString()}</span>
            </div>
          </div>
          <div className="final-score-card">
            <p>Cash Available</p>
            <strong className="cash-val">${cash.toLocaleString()}</strong>
          </div>
          <div className="final-score-card">
            <p>Money Habits</p>
            <div className="habits-progress-container">
              <strong>{moneyHabits}/100</strong>
              <div className="habits-bar-mini">
                <div className="habits-fill-mini" style={{ width: `${moneyHabits}%` }} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="summary-main">
        <header className="summary-header">
          <p className="eyebrow">Your Projected Wealth at 40</p>
          <motion.h1
            className="final-wealth-amount"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            ${projectedWealth.toLocaleString()}
          </motion.h1>
          <p className="wealth-context">
            You nearly <strong>{multiplier}x your starting wealth</strong> — in 5 decisions.
          </p>
          <p className="wealth-disclaimer">Assumes 8% returns from age 16–40</p>
        </header>

        <div className="money-style-card">
          <div className="style-icon">↗</div>
          <div className="style-content">
            <div className="style-header">
              <p className="eyebrow" style={{ margin: 0, color: 'var(--accent-secondary)' }}>Money Style</p>
              <span className="style-score">{moneyHabits}/100 Money Habits</span>
            </div>
            <h2 className="style-title">{moneyStyleData.title}</h2>
            <p className="style-desc">{moneyStyleData.desc}</p>
          </div>
        </div>

        <section className="decision-recap">
          <p className="eyebrow">Decision Recap</p>
          <div className="recap-list">
            {decisionResults.map((res, idx) => (
              <div key={idx} className="recap-row">
                <span className="recap-number">{String(idx + 1).padStart(2, '0')}</span>
                <div className="recap-info">
                  <p className="recap-scenario">{res.scenarioTitle}</p>
                  <p className="recap-choice">"{res.choiceText}"</p>
                </div>
                <div className="recap-impact">
                  <span className={`impact-value ${res.futureImpact >= 0 ? 'positive' : 'negative'}`}>
                    {res.futureImpact >= 0 ? '+' : '-'}${Math.abs(res.futureImpact).toLocaleString()}
                  </span>
                  <span className={`result-tag ${res.resultTag.toLowerCase()}`}>
                    {res.resultTag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <motion.button
          className="action-button play-again-btn"
          onClick={onReplay}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Play Again
        </motion.button>
      </div>

      <aside className="summary-right-panel">
        <p className="eyebrow">Progress</p>
        <h3 className="stage-complete">Stage 1 Complete</h3>
        <ul className="scenario-list-final">
          {scenarios.map(s => (
            <li key={s.id} className="scenario-item-final">
              <span className="dot" />
              {s.title.replace(/^Scenario\s\d+\s—\s/, '')}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

export default App

