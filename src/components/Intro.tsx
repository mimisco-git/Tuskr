/**
 * Intro.tsx — Tuskr Terminal Intro
 * Hermians-style multi-scene experience:
 *
 * Scene 0: PRESS ANY KEY / TAP TO ENTER
 * Scene 1: Character rain flood
 * Scene 2: ASCII art reveal (Tuskr logo)
 * Scene 3: Terminal boot sequence
 * Scene 4: Sui wallet selector
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConnectWallet, useWallets, useCurrentAccount } from '@mysten/dapp-kit'
import { SFX } from '../lib/audio'
import styles from './Intro.module.css'

// ── ASCII ART ──────────────────────────────────────────────
const TUSKR_ASCII = `
      ___________________________
     |  _______________________  |
     | |  ___________________  | |
     | | |                   | | |
     | | |   T  U  S  K  R   | | |
     | | |  NFT  MARKETPLACE  | | |
     | | |___________________ | | |
     | |  SUI  +  WALRUS  NET | | |
     | |_____________________| | |
     |_________________________| |
              |       |
         .----'-------'----.
         |   BLOB STORAGE  |
         |   MOVE OBJECTS  |
         |   PTB TRADING   |
         '------------------'`

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*<>?/'

const BOOT_LINES = [
  'tuskr@sui:~$ init --network testnet',
  'connecting to Sui RPC... [OK]',
  'loading Walrus blob registry... [OK]',
  'mounting NFT marketplace module... [OK]',
  'verifying Move package... [OK]',
  'initialising wallet adapters... [OK]',
  'tuskr@sui:~$ ready',
  '',
  'SELECT YOUR NODE TO CONTINUE',
]

// Wallet options — Sui ecosystem
const WALLET_OPTIONS = [
  { id: 'slushie',  label: 'Slushie Wallet',  desc: 'Official Sui wallet',    icon: '❄️' },
  { id: 'phantom',  label: 'Phantom',          desc: 'Multi-chain wallet',     icon: '👻' },
  { id: 'backpack', label: 'Backpack',          desc: 'xNFT wallet',           icon: '🎒' },
  { id: 'email',    label: 'Email (zkLogin)',   desc: 'No wallet required',    icon: '✉️' },
]

// ── SCENE 0 — Press any key ─────────────────────────────────
function SceneZero({ onNext }: { onNext: () => void }) {
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530)
    SFX.startDrone()
    return () => { clearInterval(t); SFX.stopDrone() }
  }, [])

  const handleAny = useCallback(() => {
    SFX.stopDrone()
    SFX.keypress()
    onNext()
  }, [onNext])

  useEffect(() => {
    window.addEventListener('keydown', handleAny)
    return () => window.removeEventListener('keydown', handleAny)
  }, [handleAny])

  return (
    <div className={styles.scene} onClick={handleAny}>
      <div className={styles.scanlines} />
      <div className={styles.centerContent}>
        <div className={styles.transmissionLabel}>TUSKR PROTOCOL v1.0.0</div>
        <div className={styles.pressKey} style={{ opacity: blink ? 1 : 0 }}>
          PRESS ANY KEY TO BEGIN TRANSMISSION
        </div>
        <div className={styles.subLabel}>TAP ANYWHERE ON MOBILE</div>
      </div>
      <div className={styles.cornerTL}>SUI:TESTNET</div>
      <div className={styles.cornerTR}>WALRUS:ONLINE</div>
      <div className={styles.cornerBL}>NODE:ACTIVE</div>
      <div className={styles.cornerBR}>ENC:E2E</div>
    </div>
  )
}

// ── SCENE 1 — Character rain ────────────────────────────────
function SceneRain({ onNext }: { onNext: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cols = Math.floor(canvas.width / 16)
    const drops = Array.from({ length: cols }, () => Math.random() * -50)

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 8, 12, 0.12)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00e5cc'
      ctx.font = '14px monospace'

      drops.forEach((y, i) => {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        ctx.fillStyle = y < 3 ? '#ffffff' : `rgba(0,229,204,${0.4 + Math.random() * 0.6})`
        ctx.fillText(char, i * 16, y * 16)
        if (Math.random() > 0.9) SFX.rain()
        drops[i] = y > canvas.height / 16 + 10 ? -Math.random() * 20 : y + 1
      })
    }

    const interval = setInterval(draw, 40)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      SFX.whoosh()
      onNext()
    }, 2800)

    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [onNext])

  return (
    <div className={styles.scene}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}

// ── SCENE 2 — ASCII art reveal ──────────────────────────────
function SceneASCII({ onNext }: { onNext: () => void }) {
  const [revealed, setRevealed] = useState('')
  const target = TUSKR_ASCII

  useEffect(() => {
    let i = 0
    SFX.boot()
    const t = setInterval(() => {
      i += 3
      setRevealed(target.slice(0, i))
      if (i >= target.length) {
        clearInterval(t)
        setTimeout(() => { SFX.whoosh(); onNext() }, 1200)
      }
    }, 18)
    return () => clearInterval(t)
  }, [onNext])

  return (
    <div className={styles.scene}>
      <div className={styles.scanlines} />
      <div className={styles.asciiWrap}>
        <pre className={styles.ascii}>{revealed}</pre>
      </div>
    </div>
  )
}

// ── SCENE 3 — Terminal boot ─────────────────────────────────
function SceneBoot({ onNext }: { onNext: () => void }) {
  const [lines, setLines] = useState<string[]>([])

  useEffect(() => {
    let i = 0
    const next = () => {
      if (i >= BOOT_LINES.length) {
        setTimeout(onNext, 600)
        return
      }
      SFX.type()
      setLines(prev => [...prev, BOOT_LINES[i]])
      i++
      setTimeout(next, i === BOOT_LINES.length - 1 ? 900 : 260 + Math.random() * 120)
    }
    setTimeout(next, 300)
  }, [onNext])

  return (
    <div className={styles.scene}>
      <div className={styles.scanlines} />
      <div className={styles.terminal}>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.12 }}
            className={`${styles.termLine} ${line.includes('[OK]') ? styles.termOK : ''} ${line.includes('ready') ? styles.termReady : ''} ${line.includes('SELECT') ? styles.termSelect : ''}`}
          >
            {line || '\u00A0'}
          </motion.div>
        ))}
        <span className={styles.cursor}>█</span>
      </div>
    </div>
  )
}

// ── SCENE 4 — Wallet selector ───────────────────────────────
function SceneWallet({ onDone }: { onDone: () => void }) {
  const wallets = useWallets()
  const { mutate: connect } = useConnectWallet()
  const account = useCurrentAccount()
  const [selected, setSelected] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (account) { SFX.confirm(); setTimeout(onDone, 800) }
  }, [account, onDone])

  const handleSelect = (optId: string) => {
    SFX.hover()
    setSelected(optId)
    setError(null)
  }

  const handleConnect = () => {
    if (!selected) return
    setConnecting(true)
    SFX.keypress()

    if (selected === 'email') {
      // zkLogin — for now skip straight through
      setTimeout(() => { setConnecting(false); onDone() }, 1200)
      return
    }

    // Match against installed wallets
    const match = wallets.find(w =>
      w.name.toLowerCase().includes(selected.toLowerCase()) ||
      selected === 'slushie' && w.name.toLowerCase().includes('sui') ||
      selected === 'phantom' && w.name.toLowerCase().includes('phantom') ||
      selected === 'backpack' && w.name.toLowerCase().includes('backpack')
    ) || wallets[0]

    if (match) {
      connect(
        { wallet: match },
        {
          onSuccess: () => { setConnecting(false) },
          onError: (e) => { setConnecting(false); setError(e.message || 'Connection failed') },
        }
      )
    } else {
      setConnecting(false)
      setError('Wallet not installed. Install it or choose Email.')
    }
  }

  return (
    <div className={styles.scene}>
      <div className={styles.scanlines} />
      <div className={styles.walletWrap}>
        <div className={styles.walletHeader}>
          <div className={styles.walletTitle}>SELECT NODE</div>
          <div className={styles.walletSub}>Choose your Sui wallet to enter Tuskr</div>
        </div>

        <div className={styles.walletGrid}>
          {WALLET_OPTIONS.map((opt) => (
            <motion.button
              key={opt.id}
              className={`${styles.walletBtn} ${selected === opt.id ? styles.walletBtnSelected : ''}`}
              onClick={() => handleSelect(opt.id)}
              onMouseEnter={() => SFX.hover()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={styles.walletIcon}>{opt.icon}</span>
              <div className={styles.walletInfo}>
                <span className={styles.walletName}>{opt.label}</span>
                <span className={styles.walletDesc}>{opt.desc}</span>
              </div>
              {selected === opt.id && (
                <span className={styles.walletCheck}>▶</span>
              )}
            </motion.button>
          ))}
        </div>

        {error && <p className={styles.walletError}>{error}</p>}

        <div className={styles.walletActions}>
          <motion.button
            className={styles.connectBtn}
            onClick={handleConnect}
            disabled={!selected || connecting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {connecting ? 'CONNECTING...' : selected ? `CONNECT ${selected.toUpperCase()}` : 'SELECT A NODE'}
          </motion.button>
          <button className={styles.skipBtn} onClick={() => { SFX.keypress(); onDone() }}>
            SKIP — BROWSE WITHOUT WALLET
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN INTRO ORCHESTRATOR ─────────────────────────────────
type Scene = 0 | 1 | 2 | 3 | 4

interface Props {
  onComplete: () => void
}

export default function Intro({ onComplete }: Props) {
  const [scene, setScene] = useState<Scene>(0)

  const next = useCallback(() => {
    setScene(s => Math.min(s + 1, 4) as Scene)
  }, [])

  useEffect(() => {
    SFX.init()
  }, [])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scene}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
      >
        {scene === 0 && <SceneZero onNext={next} />}
        {scene === 1 && <SceneRain onNext={next} />}
        {scene === 2 && <SceneASCII onNext={next} />}
        {scene === 3 && <SceneBoot onNext={next} />}
        {scene === 4 && <SceneWallet onDone={onComplete} />}
      </motion.div>
    </AnimatePresence>
  )
}
