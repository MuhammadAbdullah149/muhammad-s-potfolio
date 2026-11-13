import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { profile, projects, services, skills, socialLinks } from './portfolioData.js'
import HeroArt from './HeroArt.jsx'
import './portfolio.css'

const tagline = 'useful websites & films.'
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const bootMessages = [
  'ASTRA / PERSONAL SYSTEM BIOS v1.08',
  'Checking memory ............. 640K OK',
  'Loading portfolio ........... OK',
]
const motionPreference = '(prefers-reduced-motion: reduce)'
function subscribeToMotionPreference(onChange) {
  const preference = window.matchMedia(motionPreference)
  preference.addEventListener('change', onChange)
  return () => preference.removeEventListener('change', onChange)
}

function getMotionPreference() {
  return window.matchMedia(motionPreference).matches
}

function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotionPreference, getMotionPreference, () => false)
}

function BootScreen({ onFinish, reducedMotion }) {
  const [lineCount, setLineCount] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      onFinish(true)
      return undefined
    }

    const timers = [
      window.setTimeout(() => setLineCount(1), 220),
      window.setTimeout(() => setLineCount(2), 710),
      window.setTimeout(() => setLineCount(3), 1200),
      window.setTimeout(() => setLeaving(true), 2050),
      window.setTimeout(() => onFinish(true), 2450),
    ]

    return () => timers.forEach(window.clearTimeout)
  }, [onFinish, reducedMotion])

  return (
    <div className={`boot-screen${leaving ? ' boot-screen--leaving' : ''}`} role="status" aria-live="polite">
      <div className="boot-screen__mark" aria-hidden="true">MAS<span>_</span></div>
      <div className="boot-screen__copy">
        {bootMessages.slice(0, lineCount).map((message) => <p key={message}>{message}</p>)}
        <span className="boot-screen__cursor" aria-hidden="true" />
      </div>
      <button className="boot-screen__skip" type="button" onClick={() => onFinish(true)}>SKIP INTRO <span aria-hidden="true">[ENTER]</span></button>
    </div>
  )
}

function Reveal({ children, className = '', delay = 0 }) {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const elementRef = useRef(null)

  useEffect(() => {
    if (reducedMotion || !elementRef.current) {
      setVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })

    observer.observe(elementRef.current)
    return () => observer.disconnect()
  }, [reducedMotion])

  return (
    <div ref={elementRef} className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`} style={{ '--reveal-delay': `${delay}ms` }}>
      {children}
    </div>
  )
}

function WindowBar({ title, number }) {
  return (
    <div className="window-bar">
      <span className="window-bar__title"><span className="window-bar__icon" aria-hidden="true">{number}</span>{title}</span>
      <span className="window-bar__controls" aria-hidden="true"><i>_</i><i>×</i></span>
    </div>
  )
}

function App() {
  const reducedMotion = useReducedMotion()
  const [booted, setBooted] = useState(false)
  const [typedCharacters, setTypedCharacters] = useState(0)
  const [soundOn, setSoundOn] = useState(false)
  const [theme, setTheme] = useState('crt')
  const [confettiOn, setConfettiOn] = useState(false)
  const [formSent, setFormSent] = useState(false)
  const audioContextRef = useRef(null)

  useEffect(() => {
    if (reducedMotion) return undefined

    let characterIndex = 0
    const typingTimer = window.setInterval(() => {
      characterIndex += 1
      setTypedCharacters(characterIndex)
      if (characterIndex >= tagline.length) window.clearInterval(typingTimer)
    }, 52)

    return () => window.clearInterval(typingTimer)
  }, [reducedMotion])

  useEffect(() => {
    let keyIndex = 0
    let confettiTimer

    const handleKeyDown = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      keyIndex = key === konamiCode[keyIndex] ? keyIndex + 1 : (key === konamiCode[0] ? 1 : 0)
      if (keyIndex === konamiCode.length) {
        setConfettiOn(true)
        window.clearTimeout(confettiTimer)
        confettiTimer = window.setTimeout(() => setConfettiOn(false), 2600)
        keyIndex = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(confettiTimer)
    }
  }, [])

  const playBlip = (event) => {
    if (!soundOn || !event.target.closest('button, a')) return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = audioContextRef.current ?? new AudioContextClass()
    audioContextRef.current = audioContext
    if (audioContext.state === 'suspended') void audioContext.resume()

    const oscillator = audioContext.createOscillator()
    const volume = audioContext.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(520, audioContext.currentTime + 0.07)
    volume.gain.setValueAtTime(0.04, audioContext.currentTime)
    volume.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.075)
    oscillator.connect(volume)
    volume.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.08)
  }

  const handleContactSubmit = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const subject = encodeURIComponent(`Portfolio enquiry from ${formData.get('name')}`)
    const body = encodeURIComponent(`${formData.get('message')}\n\nFrom: ${formData.get('name')} (${formData.get('email')})`)
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`
    setFormSent(true)
  }

  const updatePointerGlow = (event) => {
    if (event.pointerType !== 'mouse') return

    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--pointer-x', `${Math.round(event.clientX - bounds.left)}px`)
    event.currentTarget.style.setProperty('--pointer-y', `${Math.round(event.clientY - bounds.top)}px`)
  }

  const clearPointerGlow = (event) => {
    event.currentTarget.style.setProperty('--pointer-x', '-500px')
    event.currentTarget.style.setProperty('--pointer-y', '-500px')
  }

  const xpThemeOn = theme === 'xp'

  const confettiPieces = Array.from({ length: 42 }, (_, index) => ({
    '--confetti-x': `${(index * 37) % 100}%`,
    '--confetti-drift': `${((index * 19) % 160) - 80}px`,
    '--confetti-delay': `${(index % 9) * 35}ms`,
    '--confetti-hue': `${(index * 43) % 360}deg`,
  }))

  return (
    <div
      className={`site-shell${xpThemeOn ? ' theme-xp' : ' crt-on'}`}
      onClick={playBlip}
      onPointerMove={updatePointerGlow}
      onPointerLeave={clearPointerGlow}
    >
      {!booted && <BootScreen onFinish={setBooted} reducedMotion={reducedMotion} />}
      {confettiOn && <div className="confetti" aria-hidden="true">{confettiPieces.map((piece, index) => <i key={index} style={piece} />)}</div>}

      <a className="skip-link" href="#main">SKIP TO CONTENT</a>
      <div className="screen-noise" aria-hidden="true" />
      <header className="site-header wrap">
        <a className="wordmark" href="#top" aria-label="Muhammad Abdullah, home">MAS<span>_</span><small>PERSONAL SYSTEM</small></a>
        <nav className="terminal-nav" aria-label="Main navigation">
          <a href="#about"><span aria-hidden="true">&gt;</span> ABOUT</a>
          <a href="#skills"><span aria-hidden="true">&gt;</span> SKILLS</a>
          <a href="#projects"><span aria-hidden="true">&gt;</span> PROJECTS</a>
          <a href="#contact"><span aria-hidden="true">&gt;</span> CONTACT</a>
        </nav>
        <div className="system-controls" role="group" aria-label="Theme and sound settings">
          <button type="button" className={`system-toggle${xpThemeOn ? ' is-active' : ''}`} aria-label="Toggle Windows XP light theme" aria-pressed={xpThemeOn} onClick={() => setTheme((value) => value === 'crt' ? 'xp' : 'crt')} title="Toggle Windows XP light theme">THEME <span>{xpThemeOn ? 'XP' : 'CRT'}</span></button>
          <button type="button" className={`system-toggle${soundOn ? ' is-active' : ''}`} aria-label="8-bit sound effects" aria-pressed={soundOn} onClick={() => setSoundOn((value) => !value)} title="Toggle 8-bit sound effects">SFX <span>{soundOn ? 'ON' : 'OFF'}</span></button>
        </div>
      </header>

      <main id="main">
        <section className="hero wrap" id="top" aria-labelledby="hero-title">
          <div className="hero__content">
            <p className="eyebrow"><span className="status-dot" /> BSSE UOS <span className="eyebrow__divider">//</span> MERN-STACK DEVELOPER <span className="status-dot" /> backend in progress</p>
            <h1 id="hero-title">MUHAMMAD<br /><span>ABDULLAH</span></h1>
            <p className="hero__role">I BUILD FOR THE <span>REAL WORLD.</span></p>
            <p className="hero__type-line"><span className="prompt-mark">&gt;</span> {reducedMotion ? tagline : tagline.slice(0, typedCharacters)}<span className="type-cursor" aria-hidden="true" /></p>
            <div className="hero__actions">
              <a className="pixel-button pixel-button--primary" href="#projects">PRESS START <span aria-hidden="true">▶</span></a>
              <a className="text-link" href="#about">MEET THE DEVELOPER <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero__meta"><span>SYS.LOC: CAMPUS / REMOTE</span><span>STATUS: OPEN TO WORK</span></div>
          </div>

          <HeroArt xpThemeOn={xpThemeOn} />
          <a className="scroll-hint" href="#about"><span className="scroll-hint__track" /> SCROLL TO EXPLORE</a>
        </section>

        <section className="section wrap" id="about" aria-labelledby="about-title">
          <Reveal>
            <div className="section-heading"><p className="section-heading__index">01 / PLAYER PROFILE</p><h2 id="about-title">A little about me<span className="accent-dot">.</span></h2></div>
            <article className="window-panel about-window">
              <WindowBar title="ABOUT_ABDULLAH.TXT" number="A" />
              <div className="about-window__body">
                <div className="about-window__stamp" aria-hidden="true"><span><img height={120} width={120} src="/src/assets/dp.jpeg" alt="Muhammad Abdullah" /></span></div>
                <div className="about-window__copy">
                  <p className="terminal-label">C:\USER\ABDULLAH&gt; WHOAMI</p>
                  <p>I’m Muhammad Abdullah, a university student and full-stack developer who likes making the internet feel a little more human. I build responsive websites with React and Node.js, and create clear, polished documents that help people put their best work forward.</p>
                  <p>From the first sketch to the final period, I care about the details that make a good idea genuinely useful.</p>
                  <div className="about-window__footer"><span><i className="status-dot" /> AVAILABLE FOR SELECT PROJECTS</span><span>READ TIME: 20 SEC</span></div>
                </div>
              </div>
            </article>
          </Reveal>
        </section>

        <section className="section wrap" id="skills" aria-labelledby="skills-title">
          <div className="section-heading section-heading--row"><div><p className="section-heading__index">02 / TOOLKIT</p><h2 id="skills-title">Loadout<span className="accent-dot">.</span></h2></div><p className="section-heading__aside">A balanced inventory for shipping useful things.</p></div>
          <div className="skills-grid">
            {skills.map((skill, index) => (
              <Reveal key={skill.name} delay={index * 55}>
                <article className="skill-item">
                  <div className="skill-item__top"><span className="skill-icon" aria-hidden="true">{skill.icon}</span><span className="skill-item__name">{skill.name}</span><span className="skill-item__level">{String(skill.level).padStart(2, '0')}</span></div>
                  <div className="skill-bar" role="meter" aria-label={`${skill.name} proficiency`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={skill.level}><span className="skill-bar__fill" style={{ '--skill-level': `${skill.level}%` }} /></div>
                  <p className="skill-item__category">{skill.category}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="skills-footnote"><span aria-hidden="true">*</span> BARS REPRESENT CURRENT COMFORT LEVEL, NOT A FINAL BOSS SCORE.</p>
        </section>

        <section className="section projects-section" id="projects" aria-labelledby="projects-title">
          <div className="wrap">
            <div className="section-heading section-heading--row"><div><p className="section-heading__index">03 / SELECTED WORK</p><h2 id="projects-title">Insert project<span className="accent-dot">.</span></h2></div><span className="project-count">3 ITEMS FOUND <span aria-hidden="true">▰</span></span></div>
            <div className="projects-grid">
              {projects.map((project, index) => (
                <Reveal key={project.title} delay={index * 90}>
                  <article className={`project-card project-card--${project.color}`}>
                    <div className="project-card__top"><span>DISK {String(index + 1).padStart(2, '0')} / PROJECT</span><span className="project-card__pixel" aria-hidden="true">{project.mark}</span></div>
                    <div className="project-card__art" aria-hidden="true"><span>{project.art}</span><i /><i /><i /></div>
                    <h3>{project.title}</h3>
                    <p className="project-card__description">{project.description}</p>
                    <ul className="tag-list" aria-label="Technologies">{project.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                    <div className="project-card__actions">
                      <a className="small-button" href={project.liveUrl || '#contact'} aria-label={`${project.liveUrl ? 'View' : 'Ask about'} ${project.title} live demo`} aria-disabled={!project.liveUrl} onClick={!project.liveUrl ? (event) => { event.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' }) } : undefined}>LIVE <span aria-hidden="true">↗</span></a>
                      <a className="small-button small-button--quiet" href={project.githubUrl || '#contact'} aria-label={`${project.githubUrl ? 'View' : 'Ask about'} ${project.title} source`} aria-disabled={!project.githubUrl} onClick={!project.githubUrl ? (event) => { event.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' }) } : undefined}>GITHUB <span aria-hidden="true">↗</span></a>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
            <p className="projects-note"><span aria-hidden="true">[i]</span> PROJECT DETAILS AND LINKS ARE READY TO PERSONALIZE IN <code>src/portfolioData.js</code>.</p>
          </div>
        </section>

        <section className="section wrap" id="services" aria-labelledby="services-title">
          <div className="section-heading section-heading--row"><div><p className="section-heading__index">04 / SIDE QUESTS</p><h2 id="services-title">How I can help<span className="accent-dot">.</span></h2></div><p className="section-heading__aside">Good work, without the side-quest confusion.</p></div>
          <div className="services-grid">
            {services.map((service, index) => (
              <Reveal key={service.title} delay={index * 90}>
                <article className="service-row"><span className="service-row__icon" aria-hidden="true">{service.icon}</span><div><p className="service-row__number">SERVICE 0{index + 1}</p><h3>{service.title}</h3><p className="service-row__description">{service.description}</p></div><a className="service-row__link" href="#contact" aria-label={`Ask about ${service.title}`}>↗</a></article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section contact-section" id="contact" aria-labelledby="contact-title">
          <div className="wrap">
            <div className="section-heading"><p className="section-heading__index">05 / OPEN CHANNEL</p><h2 id="contact-title">Let’s make it real<span className="accent-dot">.</span></h2></div>
            <div className="contact-grid">
              <Reveal>
                <div className="terminal-window">
                  <WindowBar title="NEW_MESSAGE.EXE" number="C" />
                  <div className="terminal-window__body">
                    <p className="terminal-label">C:\CONTACT\NEW_MESSAGE&gt; INIT</p>
                    <form className="contact-form" onSubmit={handleContactSubmit}>
                      <label htmlFor="contact-name"><span>NAME <i>*</i></span><input id="contact-name" name="name" type="text" placeholder="Your name" autoComplete="name" required /></label>
                      <label htmlFor="contact-email"><span>EMAIL <i>*</i></span><input id="contact-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></label>
                      <label htmlFor="contact-message"><span>MESSAGE <i>*</i></span><textarea id="contact-message" name="message" placeholder="Tell me what you're building..." rows="4" required /></label>
                      <div className="contact-form__submit"><button className="pixel-button pixel-button--primary" type="submit">SEND MESSAGE <span aria-hidden="true">↗</span></button><span>ALL FIELDS REQUIRED</span></div>
                      {formSent && <p className="form-status" role="status">MESSAGE READY. YOUR EMAIL APP SHOULD OPEN NOW.</p>}
                    </form>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <aside className="contact-aside">
                  <p className="terminal-label">C:\USER\ABDULLAH&gt; CONNECT</p>
                  <p className="contact-aside__copy">Got a project in mind, need a hand with a document, or just want to say hello? My inbox is open.</p>
                  <a className="email-link" href={`mailto:${profile.email}`}><span aria-hidden="true">@</span>{profile.email}<span aria-hidden="true">↗</span></a>
                  <div className="social-links"><p>ELSEWHERE ON THE NETWORK</p>{socialLinks.map((link) => <a href={link.url} key={link.label} target="_blank" rel="noreferrer">{link.label}<span aria-hidden="true">↗</span></a>)}</div>
                  <div className="contact-aside__note"><span className="status-dot" /> TYPICAL RESPONSE: WITHIN 2 BUSINESS DAYS</div>
                </aside>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer wrap">
        <a className="wordmark wordmark--footer" href="#top">MA<span>_</span></a>
        <p>BUILT WITH CURIOSITY <span aria-hidden="true">♥</span> AND A FEW PIXELS.</p>
        <div className="system-status"><span className="status-dot" /> SYSTEM STATUS: ONLINE <span className="visitor-counter" aria-label="Visitor counter">VISITORS 000042</span></div>
        <a className="back-to-top" href="#top" aria-label="Back to top">↑</a>
      </footer>
    </div>
  )
}

export default App
