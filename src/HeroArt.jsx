import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'

const gamePlatforms = [
  { left: 0.2, width: 0.28, bottom: 92 },
  { left: 0.54, width: 0.26, bottom: 158 },
  { left: 0.79, width: 0.17, bottom: 218 },
]

function PixelCharacter({ gameMode = false }) {
  return (
    <div className={`character-stage${gameMode ? ' character-stage--game' : ''}`} aria-label="A tiny pixel-art developer" role="img">
      <div className="pixel-person" aria-hidden="true">
        <i className="pixel-hair" />
        <i className="pixel-face" />
        <i className="pixel-shirt" />
        <i className="pixel-arm" />
        <i className="pixel-trousers" />
        <i className="pixel-shoes" />
      </div>
      {!gameMode && <span className="character-stage__ground" aria-hidden="true" />}
      {!gameMode && <span className="character-stage__caption">PLAYER 01 / DEV MODE</span>}
    </div>
  )
}

function PlatformGame({ inputRef, onExit, onRestart, xpThemeOn }) {
  const sceneRef = useRef(null)
  const playerRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [coinsCollected, setCoinsCollected] = useState(0)
  const [complete, setComplete] = useState(false)
  const collectedRef = useRef(new Set())
  const completeRef = useRef(false)

  useEffect(() => {
    if (!sceneRef.current) return undefined

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(sceneRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const { width, height } = size
    if (!width || !height || !playerRef.current) return undefined

    const { Bodies, Body, Engine, Events, Runner, World } = Matter
    const engine = Engine.create()
    engine.gravity.y = 1
    const runner = Runner.create()
    const groundedRef = { current: false }
    const player = Bodies.rectangle(62, height - 39, 28, 44, {
      label: 'player',
      friction: 0,
      frictionAir: 0,
      restitution: 0,
    })
    Body.setInertia(player, Infinity)

    const ground = Bodies.rectangle(width / 2, height - 7, width, 14, { isStatic: true, label: 'ground' })
    const walls = [
      Bodies.rectangle(-6, height / 2, 12, height, { isStatic: true, label: 'wall' }),
      Bodies.rectangle(width + 6, height / 2, 12, height, { isStatic: true, label: 'wall' }),
    ]
    const platforms = gamePlatforms.map((platform) => Bodies.rectangle(
      width * (platform.left + platform.width / 2),
      height - platform.bottom - 6,
      width * platform.width,
      12,
      { isStatic: true, label: 'platform' },
    ))
    const coins = gamePlatforms.map((platform, index) => Bodies.circle(
      width * (platform.left + platform.width / 2),
      height - platform.bottom - 33,
      10,
      { isStatic: true, isSensor: true, label: `coin-${index}` },
    ))

    World.add(engine.world, [player, ground, ...walls, ...platforms, ...coins])
    Events.on(engine, 'collisionActive', ({ pairs }) => {
      groundedRef.current = pairs.some(({ bodyA, bodyB }) => {
        const other = bodyA === player ? bodyB : bodyB === player ? bodyA : null
        return other && (other.label === 'ground' || other.label === 'platform') && player.position.y < other.position.y
      })
    })
    Events.on(engine, 'collisionStart', ({ pairs }) => {
      for (const { bodyA, bodyB } of pairs) {
        const other = bodyA === player ? bodyB : bodyB === player ? bodyA : null
        if (!other || !other.label.startsWith('coin-')) continue

        const coinIndex = Number(other.label.slice(5))
        if (collectedRef.current.has(coinIndex)) continue

        collectedRef.current.add(coinIndex)
        const nextCount = collectedRef.current.size
        setCoinsCollected(nextCount)
        if (nextCount === gamePlatforms.length) {
          completeRef.current = true
          setComplete(true)
          Runner.stop(runner)
        }
      }
    })

    let animationFrame = 0
    const movePlayer = () => {
      if (completeRef.current || !playerRef.current) return

      const { keys, jumpQueued } = inputRef.current
      const movingLeft = keys.has('ArrowLeft') || keys.has('a')
      const movingRight = keys.has('ArrowRight') || keys.has('d')
      const horizontalVelocity = (movingRight ? 4.1 : 0) - (movingLeft ? 4.1 : 0)
      Body.setVelocity(player, { x: horizontalVelocity, y: player.velocity.y })

      if (jumpQueued) {
        if (groundedRef.current) {
          Body.setVelocity(player, { x: player.velocity.x, y: -10 })
          groundedRef.current = false
        }
        inputRef.current.jumpQueued = false
      }

      playerRef.current.style.transform = `translate3d(${player.position.x - 62}px, ${player.position.y - (height + 90)}px, 0)`
      animationFrame = window.requestAnimationFrame(movePlayer)
    }

    inputRef.current.keys.clear()
    inputRef.current.jumpQueued = false
    Runner.run(runner, engine)
    animationFrame = window.requestAnimationFrame(movePlayer)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      Runner.stop(runner)
      Events.off(engine)
      World.clear(engine.world, false)
      Engine.clear(engine)
    }
  }, [inputRef, size])

  const setDirection = (direction, pressed) => {
    if (pressed) inputRef.current.keys.add(direction)
    else inputRef.current.keys.delete(direction)
  }

  const queueJump = () => {
    inputRef.current.jumpQueued = true
  }

  return (
    <div className={`platform-game${xpThemeOn ? ' platform-game--xp' : ''}`}>
      <div className="platform-game__hud"><span>STAGE 01 / SKY CIRCUIT</span><span>COINS {String(coinsCollected).padStart(2, '0')} / 03</span><button type="button" onClick={onExit}>EXIT</button></div>
      <div className="platform-game__world" ref={sceneRef} onClick={(event) => { if (!event.target.closest('button')) queueJump() }}>
        <div className="game-cloud game-cloud--one" />
        <div className="game-cloud game-cloud--two" />
        <div className="game-ground" />
        {gamePlatforms.map((platform, index) => (
          <div className="game-platform" key={index} style={{ left: `${platform.left * 100}%`, width: `${platform.width * 100}%`, bottom: `${platform.bottom}px` }} />
        ))}
        {gamePlatforms.map((platform, index) => (
          <span
            className={`game-coin${coinsCollected > index ? ' game-coin--collected' : ''}`}
            key={`coin-${index}`}
            aria-hidden="true"
            style={{ left: `${(platform.left + platform.width / 2) * 100}%`, bottom: `${platform.bottom + 25}px` }}
          >$</span>
        ))}
        <div className="game-player" ref={playerRef}><PixelCharacter gameMode /></div>
      </div>
      <div className="platform-game__controls" role="group" aria-label="Game touch controls">
        <button type="button" aria-label="Move left" onPointerDown={(event) => { event.preventDefault(); setDirection('ArrowLeft', true) }} onPointerUp={() => setDirection('ArrowLeft', false)} onPointerCancel={() => setDirection('ArrowLeft', false)}>←</button>
        <button type="button" aria-label="Move right" onPointerDown={(event) => { event.preventDefault(); setDirection('ArrowRight', true) }} onPointerUp={() => setDirection('ArrowRight', false)} onPointerCancel={() => setDirection('ArrowRight', false)}>→</button>
        <button type="button" aria-label="Jump" onPointerDown={(event) => { event.preventDefault(); queueJump() }}>JUMP ↑</button>
      </div>
      <p className="platform-game__help" id="platform-game-help">MOVE: A / D OR ← → <span>JUMP: SPACE / ↑</span></p>
      {complete && (
        <div className="platform-game__complete" role="status">
          <span>ALL COINS FOUND | Hire ME!</span>
          <button type="button" onClick={onRestart}>PLAY AGAIN ↻</button>
        </div>
      )}
    </div>
  )
}

export default function HeroArt({ xpThemeOn }) {
  const [gameActive, setGameActive] = useState(false)
  const [gameRound, setGameRound] = useState(0)
  const gameInputRef = useRef({ keys: new Set(), jumpQueued: false })

  const startMiniGame = () => {
    gameInputRef.current.keys.clear()
    gameInputRef.current.jumpQueued = false
    setGameRound((round) => round + 1)
    setGameActive(true)
  }

  const handleGameClick = (event) => {
    event.currentTarget.focus()
    if (!gameActive) {
      startMiniGame()
    } else if (!event.target.closest('button')) {
      gameInputRef.current.jumpQueued = true
    }
  }

  const handleGameKeyDown = (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (!gameActive && (key === 'Enter' || key === ' ')) {
      event.preventDefault()
      startMiniGame()
      return
    }
    if (!gameActive) return

    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(key)) {
      event.preventDefault()
      gameInputRef.current.keys.add(key)
    } else if (['ArrowUp', 'w', ' '].includes(key)) {
      event.preventDefault()
      gameInputRef.current.jumpQueued = true
    }
  }

  const handleGameKeyUp = (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    gameInputRef.current.keys.delete(key)
  }

  const clearGameInput = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    gameInputRef.current.keys.clear()
    gameInputRef.current.jumpQueued = false
  }

  return (
    <div
      className={`hero__art${gameActive ? ' hero__art--playing' : ''}`}
      role="application"
      aria-label="Pixel platform game. Click or press Enter to start. Move with A and D or arrow keys; jump with Space or Up."
      aria-describedby={gameActive ? 'platform-game-help' : 'hero-game-guide'}
      tabIndex={0}
      onClick={handleGameClick}
      onKeyDown={handleGameKeyDown}
      onKeyUp={handleGameKeyUp}
      onBlur={clearGameInput}
    >
      {gameActive ? (
        <PlatformGame
          key={gameRound}
          inputRef={gameInputRef}
          onExit={() => setGameActive(false)}
          onRestart={startMiniGame}
          xpThemeOn={xpThemeOn}
        />
      ) : (
        <>
          <span className="pixel-star pixel-star--one" aria-hidden="true">✦</span>
          <span className="pixel-star pixel-star--two" aria-hidden="true">✳</span>
          
          <div className="coin" aria-hidden="true">$</div>
          <PixelCharacter />
          <div className="hero__art-label"><span>FIG. 01</span><span>THE BUILDER</span></div>
          <p className="game-start-guide" id="hero-game-guide"><i>CLICK ART TO PLAY</i></p>
        </>
      )}
    </div>
  )
}