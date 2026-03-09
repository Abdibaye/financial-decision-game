import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useSpring } from 'framer-motion'
import './App.css'
import { scenarios, STARTING_VALUES } from './data/scenarios'
import { moneyStyles } from './data/moneyStyles'

const SCENARIO_AMBIENCE_BY_ID = {
  'after-school-bodega': '/teen_chatter.mp3',
  'uber-vs-subway': '/new_york.mp3'
}

function App() {
  const [phase, setPhase] = useState('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_VALUES.cash)
  const [projectedWealth, setProjectedWealth] = useState(STARTING_VALUES.projectedWealth)
  const [moneyHabits, setMoneyHabits] = useState(STARTING_VALUES.moneyHabits)
  const [lastChoice, setLastChoice] = useState(null)
  const [decisionResults, setDecisionResults] = useState([])
  const [particles, setParticles] = useState([])
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)
  const audioContextRef = useRef(null)
  const ambienceAudioRef = useRef(null)
  const resultChimeAudioRef = useRef(null)
  const activeAmbienceIdRef = useRef(null)
  const fadeFrameRef = useRef(null)
  void motion

  const scenario = scenarios[currentIndex]

  const completedDecisions = useMemo(() => {
    if (phase === 'intro' || phase === 'setup') {
      return 0
    }

    const completed = currentIndex + (phase === 'outcome' || phase === 'final-score' || phase === 'final-recap' ? 1 : 0)
    return Math.max(0, Math.min(completed, scenarios.length))
  }, [phase, currentIndex])

  const progressPercent = useMemo(() => {
    if (phase === 'intro' || phase === 'setup') {
      return 0
    }

    return (completedDecisions / scenarios.length) * 100
  }, [phase, completedDecisions])

  const clampMoneyHabits = (value) => Math.max(0, Math.min(100, value))

  const playTone = (frequency, durationMs, type = 'sine', gainValue = 0.025) => {
    if (!isAudioUnlocked || typeof window === 'undefined' || !window.AudioContext) {
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

  const cancelFade = () => {
    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current)
      fadeFrameRef.current = null
    }
  }

  const fadeAudioVolume = (audio, targetVolume, durationMs, onComplete) => {
    if (!audio) {
      onComplete?.()
      return
    }

    cancelFade()

    if (durationMs <= 0) {
      audio.volume = targetVolume
      onComplete?.()
      return
    }

    const startingVolume = audio.volume
    let startTime = null

    const tick = (now) => {
      if (startTime === null) {
        startTime = now
      }

      const progress = Math.min((now - startTime) / durationMs, 1)
      audio.volume = startingVolume + (targetVolume - startingVolume) * progress

      if (progress < 1) {
        fadeFrameRef.current = requestAnimationFrame(tick)
        return
      }

      fadeFrameRef.current = null
      onComplete?.()
    }

    fadeFrameRef.current = requestAnimationFrame(tick)
  }

  const fadeOutAndStopAmbience = (durationMs = 600) => new Promise((resolve) => {
    const ambienceAudio = ambienceAudioRef.current

    if (!ambienceAudio || ambienceAudio.paused) {
      resolve()
      return
    }

    fadeAudioVolume(ambienceAudio, 0, durationMs, () => {
      ambienceAudio.pause()
      ambienceAudio.currentTime = 0
      activeAmbienceIdRef.current = null
      resolve()
    })
  })

  const unlockAudio = async () => {
    if (isAudioUnlocked || typeof window === 'undefined') {
      return true
    }

    let unlocked = false

    try {
      if (window.AudioContext) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new window.AudioContext()
        }

        if (audioContextRef.current.state !== 'running') {
          await audioContextRef.current.resume()
        }

        unlocked = audioContextRef.current.state === 'running'
      }
    } catch (error) {
      console.warn('WebAudio unlock failed:', error)
    }

    const warmupTargets = [ambienceAudioRef.current, resultChimeAudioRef.current].filter(
      (audio) => audio && audio.src
    )

    const warmupResults = await Promise.allSettled(
      warmupTargets.map(async (audio) => {
        const prevMuted = audio.muted
        const prevVolume = audio.volume
        const prevTime = audio.currentTime

        audio.muted = true
        audio.volume = 0
        audio.currentTime = 0
        await audio.play()
        audio.pause()
        audio.currentTime = prevTime
        audio.muted = prevMuted
        audio.volume = prevVolume
      })
    )

    if (warmupResults.some((result) => result.status === 'fulfilled')) {
      unlocked = true
    }

    if (unlocked) {
      setIsAudioUnlocked(true)
      return true
    }

    return false
  }

  const playScenarioAmbience = (scenarioId) => {
    if (!isAudioUnlocked || !scenarioId) {
      return
    }

    const ambienceSrc = SCENARIO_AMBIENCE_BY_ID[scenarioId]
    if (!ambienceSrc) {
      return
    }

    const ambienceAudio = ambienceAudioRef.current
    if (!ambienceAudio) {
      return
    }

    if (activeAmbienceIdRef.current !== scenarioId) {
      ambienceAudio.src = ambienceSrc
      ambienceAudio.load()
      ambienceAudio.currentTime = 0
      activeAmbienceIdRef.current = scenarioId
    }

    ambienceAudio.volume = 0
    void ambienceAudio.play().catch((error) => {
      console.warn('Ambience audio could not start:', ambienceSrc, error)
    })
    fadeAudioVolume(ambienceAudio, 0.12, 800)
  }

  useEffect(() => {
    const ambienceAudio = new Audio()
    ambienceAudio.preload = 'auto'
    ambienceAudio.loop = true
    ambienceAudio.volume = 0

    const resultChimeAudio = new Audio('/result_chime.mp3')
    resultChimeAudio.preload = 'auto'
    resultChimeAudio.loop = false
    resultChimeAudio.volume = 0.14

    ambienceAudioRef.current = ambienceAudio
    resultChimeAudioRef.current = resultChimeAudio

    return () => {
      cancelFade()
      ambienceAudio.pause()
      resultChimeAudio.pause()
    }
  }, [])

  useEffect(() => {
    if (isAudioUnlocked || typeof window === 'undefined') {
      return
    }

    const unlockOnFirstInteraction = () => {
      void unlockAudio()
    }

    window.addEventListener('pointerdown', unlockOnFirstInteraction, { once: true, capture: true })
    window.addEventListener('keydown', unlockOnFirstInteraction, { once: true, capture: true })

    return () => {
      window.removeEventListener('pointerdown', unlockOnFirstInteraction, { capture: true })
      window.removeEventListener('keydown', unlockOnFirstInteraction, { capture: true })
    }
  }, [isAudioUnlocked])

  useEffect(() => {
    if (!isAudioUnlocked || phase !== 'decision') {
      return
    }

    const ambienceSrc = SCENARIO_AMBIENCE_BY_ID[scenario?.id]
    if (!ambienceSrc) {
      return
    }

    const ambienceAudio = ambienceAudioRef.current
    if (!ambienceAudio) {
      return
    }

    if (activeAmbienceIdRef.current !== scenario.id) {
      ambienceAudio.src = ambienceSrc
      ambienceAudio.load()
      ambienceAudio.currentTime = 0
      activeAmbienceIdRef.current = scenario.id
    }

    ambienceAudio.volume = 0
    void ambienceAudio.play().catch((error) => {
      console.warn('Ambience audio could not start:', ambienceSrc, error)
    })
    fadeAudioVolume(ambienceAudio, 0.12, 800)
  }, [phase, scenario, isAudioUnlocked])

  useEffect(() => {
    if (!isAudioUnlocked || phase !== 'outcome') {
      return
    }

    const chimeAudio = resultChimeAudioRef.current
    if (!chimeAudio) {
      return
    }

    chimeAudio.currentTime = 0
    void chimeAudio.play().catch(() => {})
  }, [phase, isAudioUnlocked])

  const handleChoice = async (choice) => {
    await unlockAudio()
    await fadeOutAndStopAmbience(600)

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
        x: Math.random() * 100 - 50 // Random spread
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
        resultTag: choice.resultTag,
        bias: choice.bias,
        biasExplanation: choice.biasExplanation
      }
    ])
    setPhase('outcome')
  }

  const goToNextScenario = () => {
    void unlockAudio()
    playClickSound()
    const nextIndex = currentIndex + 1

    if (nextIndex >= scenarios.length) {
      setPhase('final-score')
      return
    }

    playScenarioAmbience(scenarios[nextIndex]?.id)
    setCurrentIndex(nextIndex)
    setLastChoice(null)
    setPhase('decision')
  }

  const replay = () => {
    playClickSound()
    void fadeOutAndStopAmbience(0)
    setPhase('intro')
    setCurrentIndex(0)
    setCash(STARTING_VALUES.cash)
    setProjectedWealth(STARTING_VALUES.projectedWealth)
    setMoneyHabits(STARTING_VALUES.moneyHabits)
    setLastChoice(null)
    setDecisionResults([])
  }

  const getCardTransitionDuration = (currentPhase) => {
    if (currentPhase === 'outcome') return 0.36
    if (currentPhase === 'decision') return 0.25
    if (currentPhase === 'final-score') return 0.5
    return 0.28
  }

  const canShowPanels = phase !== 'intro' && phase !== 'setup'

  const currentBackgroundImage = useMemo(() => {
    if (phase === 'intro' || phase === 'setup' || phase === 'final-score' || phase === 'final-recap') {
      return '/Mar7Skyline.png'
    }
    return scenario?.image || '/Mar7Skyline.png'
  }, [phase, scenario])

  return (
    <main className={`game-layout ${phase === 'intro' || phase === 'setup' ? 'intro-layout' : ''}`}>
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

      {canShowPanels && (
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
              className={`game-card ${phase === 'final-score' || phase === 'final-recap' ? 'final-full-card' : ''}`}
              key={`${phase}-${currentIndex}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: getCardTransitionDuration(phase), ease: 'easeOut' }}
            >
              {phase === 'intro' && (
                <div className="intro-content">
                  <h1>Can your everyday decisions <br /> make you a <span className="gradient-text">millionaire by 40?</span></h1>
                  <p className="card-copy">Let’s find out.</p>
                  <motion.button
                    className="action-button"
                    onClick={() => {
                      void unlockAudio()
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
                      void unlockAudio()
                      playClickSound()
                      playScenarioAmbience(scenarios[0]?.id)
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

                  {lastChoice.resultTag !== 'SMART' && (
                    <motion.section
                      className="result-card-item bias-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: 0.1, ease: 'easeOut' }}
                    >
                      <p className="card-label">Behavioral Bias</p>
                      <p className="card-value">{lastChoice.bias}</p>
                      <p className="card-subtext">{lastChoice.biasExplanation}</p>
                    </motion.section>
                  )}

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

              {phase === 'final-score' && (
                <FinalScoreScreen
                  projectedWealth={projectedWealth}
                  moneyHabits={moneyHabits}
                  onContinue={() => {
                    playClickSound()
                    setPhase('final-recap')
                  }}
                />
              )}

              {phase === 'final-recap' && (
                <DecisionRecapScreen
                  decisionResults={decisionResults}
                  onReplay={replay}
                />
              )}
            </motion.article>
          </AnimatePresence>
        </section>
      </section>

      {canShowPanels && (
        <aside className="progress-panel" aria-label="Decision progress">
          <h3>Progress</h3>
          <p className="progress-text">
            {canShowPanels
              ? `Decision ${Math.min(currentIndex + 1, scenarios.length)} of ${scenarios.length}`
              : `Decision 1 of ${scenarios.length}`}
          </p>
          <p className="progress-subtext">{Math.max(scenarios.length - completedDecisions, 0)} decisions ahead</p>
          <div className="progress-track">
            <motion.div
              className="progress-fill"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          <ul className="scenario-progress-list" aria-label="Scenario list">
            {scenarios.map((item, index) => {
              const allComplete = phase === 'final-score' || phase === 'final-recap'
              const isCompleted = allComplete || index < completedDecisions
              const isCurrent = !allComplete && phase === 'decision' && index === currentIndex

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

      {phase === 'intro' && (
        <div className="bottom-stats-bar intro-stats-bar">
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
      )}
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

function CoinParticle({ x, isPositive }) {
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

function buildOutcomeSubline(projectedWealth) {
  if (projectedWealth > STARTING_VALUES.projectedWealth) {
    const multiplier = (projectedWealth / STARTING_VALUES.projectedWealth).toFixed(1)
    return `You nearly ${multiplier}x your starting wealth — in 5 decisions.`
  }

  if (projectedWealth < STARTING_VALUES.projectedWealth) {
    const loss = STARTING_VALUES.projectedWealth - projectedWealth
    return `Your choices cost you $${loss.toLocaleString()} — now you know why.`
  }

  return 'You broke even — in 5 decisions.'
}

function MoneyStyleStrip({ moneyHabits }) {
  const currentTier = useMemo(
    () => moneyStyles.find((tier) => moneyHabits >= tier.minScore) ?? moneyStyles[moneyStyles.length - 1],
    [moneyHabits]
  )

  return (
    <section className="money-style-strip" aria-label="Money style tiers">
      <div className="money-style-strip-head">
        <p className="money-style-strip-title">Money Style — All Five Tiers</p>
        <p className="money-style-strip-score">{moneyHabits}/100</p>
      </div>

      <ul className="money-style-tier-list">
        {moneyStyles.map((tier) => {
          const isCurrent = tier.name === currentTier.name

          return (
            <li
              key={tier.name}
              className={`money-style-tier ${isCurrent ? 'is-current' : ''}`}
              style={{ '--tier-color': tier.color }}
            >
              <div className="money-style-tier-left">
                <span className="money-style-tier-icon" aria-hidden="true">{tier.icon}</span>
                <div className="money-style-tier-copy">
                  <p className="money-style-tier-name">{tier.name}</p>
                  <p className="money-style-tier-description">{tier.description}</p>
                </div>
              </div>
              <span className="money-style-tier-range">{tier.rangeLabel}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function FinalScoreScreen({ projectedWealth, moneyHabits, onContinue }) {
  return (
    <div className="final-screen final-score-screen">
      <header className="summary-header">
        <p className="eyebrow">Final Score</p>
        <motion.h1
          className="final-wealth-amount"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          ${projectedWealth.toLocaleString()}
        </motion.h1>
        <p className="wealth-context">{buildOutcomeSubline(projectedWealth)}</p>
        <p className="wealth-disclaimer">Assumes 8% returns from age 16–40</p>
      </header>

      <MoneyStyleStrip moneyHabits={moneyHabits} />

      <motion.button
        className="action-button play-again-btn"
        onClick={onContinue}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        View Decision Recap
      </motion.button>
    </div>
  )
}

function DecisionRecapScreen({ decisionResults, onReplay }) {
  return (
    <div className="final-screen final-recap-screen">
      <section className="decision-recap">
        <p className="eyebrow">Decision Recap</p>
        <div className="recap-list">
          {decisionResults.map((res, idx) => (
            <div key={idx} className="recap-row">
              <span className="recap-number">{String(idx + 1).padStart(2, '0')}</span>
              <div className="recap-info">
                <p className="recap-scenario">{res.scenarioTitle}</p>
                <p className="recap-choice">"{res.choiceText}"</p>
                {res.resultTag !== 'SMART' && (
                  <p className="recap-bias">Bias: {res.bias} — {res.biasExplanation}</p>
                )}
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
  )
}

export default App

