import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './App.css'

const STARTING_CASH = 1200
const STARTING_FUTURE_WEALTH = 3000

const scenarios = [
  {
    id: 'sneakers-drop',
    title: 'Limited Sneaker Drop',
    text: 'Your favorite pair drops today for $220. You also planned to add money to your investment account.',
    illustration: '👟',
    options: [
      {
        label: 'Buy the sneakers now',
        cashDelta: -220,
        investedDelta: 0,
        futureWealthImpact: 80,
        feedback: 'Fun now, but less money had time to grow.',
        disciplineDelta: 0,
      },
      {
        label: 'Skip this drop, invest instead',
        cashDelta: -120,
        investedDelta: 120,
        futureWealthImpact: 360,
        feedback: 'Strong call. You delayed spending and gave your money time to compound.',
        disciplineDelta: 2,
      },
    ],
  },
  {
    id: 'tiktok-tip',
    title: 'TikTok Stock Tip',
    text: 'A creator says a random stock is “about to 10x.” Your friend says “everyone is buying it.”',
    illustration: '📱',
    options: [
      {
        label: 'YOLO on the hype stock',
        cashDelta: -150,
        investedDelta: 150,
        futureWealthImpact: 120,
        feedback: 'Risk was high. Hype investing usually underperforms a steady plan.',
        disciplineDelta: 0,
      },
      {
        label: 'Invest in a diversified index fund',
        cashDelta: -150,
        investedDelta: 150,
        futureWealthImpact: 420,
        feedback: 'Smart move. Diversification lowers risk and supports long-term growth.',
        disciplineDelta: 2,
      },
    ],
  },
  {
    id: 'bodega-routine',
    title: 'After-School Bodega Habit',
    text: 'You spend about $8 every school day on snacks and drinks. You can keep the habit or split it with savings.',
    illustration: '🥤',
    options: [
      {
        label: 'Keep daily bodega spending',
        cashDelta: -160,
        investedDelta: 0,
        futureWealthImpact: 90,
        feedback: 'Small daily expenses add up quickly over time.',
        disciplineDelta: 0,
      },
      {
        label: 'Cut it in half, auto-invest the rest',
        cashDelta: -80,
        investedDelta: 80,
        futureWealthImpact: 280,
        feedback: 'Great discipline. Tiny consistent investments can become major gains.',
        disciplineDelta: 2,
      },
    ],
  },
]

function App() {
  const reduceMotion = useReducedMotion()
  const sounds = useMemo(() => createGameSounds(), [])

  const [phase, setPhase] = useState('start')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_CASH)
  const [invested, setInvested] = useState(0)
  const [futureWealth, setFutureWealth] = useState(STARTING_FUTURE_WEALTH)
  const [disciplineScore, setDisciplineScore] = useState(0)
  const [lastFeedback, setLastFeedback] = useState('')
  const [lastImpact, setLastImpact] = useState(0)
  const [animatedImpact, setAnimatedImpact] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)
  const [muted, setMuted] = useState(false)
  const [jobStrikes, setJobStrikes] = useState(0)
  const lastTransitionKeyRef = useRef('')

  const scenario = scenarios[currentIndex]
  const dayNumber = Math.min(currentIndex + 1, scenarios.length)

  const progressPercent = useMemo(() => {
    return ((currentIndex + (phase === 'final' ? 1 : 0)) / scenarios.length) * 100
  }, [currentIndex, phase])

  const transitionMode = useMemo(() => {
    if (phase === 'start') {
      return 'intro'
    }

    if (phase === 'decision') {
      return ['glide', 'flip', 'swerve'][currentIndex % 3]
    }

    if (phase === 'outcome') {
      return ['impact-rise', 'impact-bloom', 'impact-shift'][currentIndex % 3]
    }

    return 'summary'
  }, [phase, currentIndex])

  useEffect(() => {
    if (phase !== 'outcome') {
      setAnimatedImpact(0)
      return
    }

    const duration = 800
    const start = performance.now()
    let frameId = 0

    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setAnimatedImpact(Math.round(lastImpact * eased))

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [phase, lastImpact])

  useEffect(() => {
    const transitionKey = `${phase}-${currentIndex}`

    if (!lastTransitionKeyRef.current) {
      lastTransitionKeyRef.current = transitionKey
      return
    }

    if (lastTransitionKeyRef.current === transitionKey) {
      return
    }

    lastTransitionKeyRef.current = transitionKey
    sounds.playTransition(transitionMode, muted)
  }, [phase, currentIndex, transitionMode, muted, sounds])

  const startGame = () => {
    sounds.playClick(muted)
    setSlideDirection(1)
    setPhase('decision')
  }

  const handleChoice = (option) => {
    if (option.disciplineDelta > 0) {
      sounds.playPositive(muted)
    } else {
      sounds.playNegative(muted)
    }

    setSlideDirection(1)
    setCash((value) => value + option.cashDelta)
    setInvested((value) => value + option.investedDelta)
    setFutureWealth((value) => value + option.futureWealthImpact)
    setDisciplineScore((value) => value + option.disciplineDelta)
    if (option.disciplineDelta === 0) {
      setJobStrikes((value) => Math.min(value + 1, 3))
    }
    setLastFeedback(option.feedback)
    setLastImpact(option.futureWealthImpact)
    setPhase('outcome')
  }

  const nextStep = () => {
    sounds.playClick(muted)
    const nextIndex = currentIndex + 1
    if (nextIndex >= scenarios.length) {
      setSlideDirection(1)
      setPhase('final')
      return
    }

    setSlideDirection(1)
    setCurrentIndex(nextIndex)
    setPhase('decision')
  }

  const replay = () => {
    sounds.playClick(muted)
    setSlideDirection(-1)
    setPhase('start')
    setCurrentIndex(0)
    setCash(STARTING_CASH)
    setInvested(0)
    setFutureWealth(STARTING_FUTURE_WEALTH)
    setDisciplineScore(0)
    setLastFeedback('')
    setLastImpact(0)
    setAnimatedImpact(0)
    setJobStrikes(0)
  }

  const cardVariants = {
    enter: (custom) => {
      const direction = custom?.direction ?? 1
      const mode = custom?.mode ?? 'glide'

      if (reduceMotion) {
        return { opacity: 0 }
      }

      if (mode === 'flip') {
        return { x: direction > 0 ? 90 : -90, rotateY: direction > 0 ? -28 : 28, opacity: 0, scale: 0.96 }
      }

      if (mode === 'swerve') {
        return { x: direction > 0 ? 120 : -120, y: 20, rotate: direction > 0 ? 4 : -4, opacity: 0, scale: 0.95 }
      }

      if (mode.startsWith('impact')) {
        return { y: 42, opacity: 0, scale: 0.93 }
      }

      if (mode === 'summary') {
        return { opacity: 0, scale: 0.92 }
      }

      return { x: direction > 0 ? 120 : -120, opacity: 0, scale: 0.98 }
    },
    center: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      rotateY: 0,
    },
    exit: (custom) => {
      const direction = custom?.direction ?? 1
      const mode = custom?.mode ?? 'glide'

      if (reduceMotion) {
        return { opacity: 0 }
      }

      if (mode === 'flip') {
        return { x: direction > 0 ? -95 : 95, rotateY: direction > 0 ? 30 : -30, opacity: 0, scale: 0.95 }
      }

      if (mode === 'swerve') {
        return { x: direction > 0 ? -120 : 120, y: -18, rotate: direction > 0 ? -5 : 5, opacity: 0, scale: 0.95 }
      }

      if (mode.startsWith('impact')) {
        return { y: -35, opacity: 0, scale: 0.94 }
      }

      if (mode === 'summary') {
        return { opacity: 0, scale: 1.04 }
      }

      return { x: direction > 0 ? -120 : 120, opacity: 0, scale: 0.98 }
    },
  }

  return (
    <main className="game-layout">
      <aside className="left-rail" aria-hidden="true">
        <p className="rail-label">Job Strikes</p>
        <div className="strike-list">
          {[0, 1, 2].map((index) => (
            <span key={index} className={`strike-mark ${index < jobStrikes ? 'active' : ''}`}>
              ×
            </span>
          ))}
        </div>
        <p className="rail-label">Need Cash?</p>
        <div className="rail-icons">
          <span>🐷</span>
          <span>🔥</span>
          <span>🌙</span>
        </div>
      </aside>

      <section className="game-shell">
        <header className="hud-bar">
          <div className="hud-block">
            <p className="hud-label">Balance</p>
            <strong className="hud-value">${cash.toLocaleString()}</strong>
          </div>

          <div className="hud-stats">
            <Stat label="Invested" value={`$${invested.toLocaleString()}`} />
            <Stat label="Future Wealth" value={`$${futureWealth.toLocaleString()}`} />
            <Stat label="Discipline" value={`${disciplineScore}`} />
          </div>

          <div className="hud-block hud-day">
            <p className="hud-label">Day</p>
            <strong className="hud-value">{phase === 'final' ? scenarios.length : dayNumber}</strong>
          </div>
        </header>

        <section className="top-bar">
          <button className="sound-toggle" onClick={() => setMuted((value) => !value)}>
            {muted ? '🔇 Sound Off' : '🔊 Sound On'}
          </button>

          <div className="progress-wrap" aria-label="Progress">
            <div className="progress-track">
              <motion.div
                className="progress-fill"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            </div>
            <p className="progress-label">
              {dayNumber} / {scenarios.length}
            </p>
          </div>
        </section>

        <section className={`card-stage mode-${transitionMode}`}>
          <button className="stage-arrow left" aria-hidden="true" tabIndex={-1}>
            ‹
          </button>
          <button className="stage-arrow right" aria-hidden="true" tabIndex={-1}>
            ›
          </button>

          <div className="stack-layer back-one" aria-hidden="true" />
          <div className="stack-layer back-two" aria-hidden="true" />

          <AnimatePresence
            mode="wait"
            custom={{ direction: slideDirection, mode: transitionMode }}
          >
            <motion.article
              className={`game-card mode-${transitionMode}`}
              key={`${phase}-${currentIndex}`}
              custom={{ direction: slideDirection, mode: transitionMode }}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: reduceMotion ? 0.1 : transitionMode.includes('impact') ? 0.48 : 0.4,
                ease: transitionMode === 'flip' ? 'anticipate' : 'easeOut',
              }}
            >
            {phase === 'start' && (
              <>
                <p className="eyebrow">Financial Decision Game</p>
                <h1>Build Your Future Wealth</h1>
                <p className="card-copy">
                  You will face quick NYC money decisions. Pick an option and see how each choice changes your long-term future.
                </p>
                <motion.button
                  className="action-button"
                  onClick={startGame}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start Game
                </motion.button>
              </>
            )}

            {phase === 'decision' && (
              <>
                <p className="eyebrow">Scenario {currentIndex + 1}</p>
                <motion.div
                  className="illustration"
                  aria-hidden="true"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                >
                  {scenario.illustration}
                </motion.div>
                <h2>{scenario.title}</h2>
                <p className="card-copy">{scenario.text}</p>
                <div className="button-stack">
                  {scenario.options.map((option, index) => (
                    <motion.button
                      key={option.label}
                      className="decision-button"
                      onClick={() => handleChoice(option)}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, duration: 0.28 }}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </>
            )}

            {phase === 'outcome' && (
              <>
                <p className="eyebrow">Outcome</p>
                <h2>Future Wealth Impact</h2>
                <motion.p
                  className="impact-number"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                >
                  +${animatedImpact.toLocaleString()}
                </motion.p>
                <p className="card-copy">{lastFeedback}</p>
                <motion.button
                  className="action-button"
                  onClick={nextStep}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {currentIndex + 1 === scenarios.length ? 'See Final Results' : 'Next Scenario'}
                </motion.button>
              </>
            )}

            {phase === 'final' && (
              <>
                <p className="eyebrow">Final Results</p>
                <h2>Game Complete</h2>
                <div className="results-grid">
                  <Result label="Final Cash" value={`$${cash.toLocaleString()}`} />
                  <Result label="Total Invested" value={`$${invested.toLocaleString()}`} />
                  <Result label="Total Future Wealth" value={`$${futureWealth.toLocaleString()}`} />
                  <Result label="Discipline Score" value={`${disciplineScore}`} />
                </div>
                <motion.button
                  className="action-button"
                  onClick={replay}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Replay
                </motion.button>
              </>
            )}
            </motion.article>
          </AnimatePresence>
        </section>
      </section>

      <aside className="right-rail" aria-hidden="true">
        <p className="rail-label">Day</p>
        <div className="day-list">
          {scenarios.map((_, index) => (
            <span
              key={index}
              className={index === currentIndex && phase !== 'final' ? 'active' : ''}
            >
              {index + 1}
            </span>
          ))}
        </div>
      </aside>
    </main>
  )
}

function createGameSounds() {
  const getAudioContext = () => {
    if (!window.__fdgAudioContext || window.__fdgAudioContext.state === 'closed') {
      window.__fdgAudioContext = new window.AudioContext()
    }

    return window.__fdgAudioContext
  }

  const playTone = (frequency, durationMs, type, gainValue, muted) => {
    if (muted) {
      return
    }

    const context = getAudioContext()
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

  const playClick = (muted) => {
    playTone(420, 70, 'triangle', 0.04, muted)
  }

  const playPositive = (muted) => {
    playTone(520, 90, 'triangle', 0.045, muted)
    setTimeout(() => {
      playTone(760, 130, 'sine', 0.035, muted)
    }, 70)
  }

  const playNegative = (muted) => {
    playTone(240, 110, 'sawtooth', 0.024, muted)
    setTimeout(() => {
      playTone(180, 170, 'triangle', 0.021, muted)
    }, 60)
  }

  const playReveal = (muted) => {
    playTone(300, 80, 'sine', 0.03, muted)
    setTimeout(() => {
      playTone(620, 170, 'triangle', 0.035, muted)
    }, 80)
  }

  const playSequence = (notes, muted) => {
    notes.forEach((note, index) => {
      setTimeout(() => {
        playTone(note.frequency, note.duration, note.type, note.gain, muted)
      }, index * 70)
    })
  }

  const playTransition = (mode, muted) => {
    if (mode === 'flip') {
      playSequence([
        { frequency: 360, duration: 70, type: 'square', gain: 0.02 },
        { frequency: 480, duration: 85, type: 'triangle', gain: 0.03 },
      ], muted)
      return
    }

    if (mode === 'swerve') {
      playSequence([
        { frequency: 420, duration: 60, type: 'triangle', gain: 0.03 },
        { frequency: 520, duration: 60, type: 'triangle', gain: 0.028 },
        { frequency: 620, duration: 70, type: 'sine', gain: 0.025 },
      ], muted)
      return
    }

    if (mode.startsWith('impact')) {
      playReveal(muted)
      return
    }

    if (mode === 'summary') {
      playSequence([
        { frequency: 440, duration: 80, type: 'triangle', gain: 0.028 },
        { frequency: 554, duration: 100, type: 'triangle', gain: 0.03 },
        { frequency: 660, duration: 130, type: 'sine', gain: 0.032 },
      ], muted)
      return
    }

    playClick(muted)
  }

  return { playClick, playPositive, playNegative, playReveal, playTransition }
}

function Stat({ label, value }) {
  return (
    <div className="stat-pill">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
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

export default App
