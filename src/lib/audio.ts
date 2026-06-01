/**
 * audio.ts — Tuskr Audio Engine
 * Pure Web Audio API. No external files needed.
 * Hermians-style ambient sound effects.
 */

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private _ready = false
  private _muted = false
  private _droneNode: OscillatorNode | null = null

  init() {
    if (this._ready) return
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.7
      this.master.connect(this.ctx.destination)
      this._ready = true
    } catch (e) {
      // Audio not available
    }
  }

  private _beep(
    freq: number,
    vol: number,
    duration: number,
    type: OscillatorType = 'sine'
  ) {
    if (!this._ready || !this.ctx || !this.master || this._muted) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(this.master)
      osc.start()
      osc.stop(this.ctx.currentTime + duration)
    } catch (e) {}
  }

  setMute(muted: boolean) {
    this._muted = muted
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.7,
        this.ctx.currentTime,
        0.1
      )
    }
  }

  // "Press any key" idle hum
  startDrone() {
    if (!this._ready || !this.ctx || !this.master || this._muted) return
    try {
      this._droneNode = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 300
      this._droneNode.type = 'sawtooth'
      this._droneNode.frequency.value = 55
      gain.gain.value = 0.04
      this._droneNode.connect(filter)
      filter.connect(gain)
      gain.connect(this.master)
      this._droneNode.start()
    } catch (e) {}
  }

  stopDrone() {
    try {
      this._droneNode?.stop()
      this._droneNode = null
    } catch (e) {}
  }

  // Character rain tick
  rain() {
    if (!this._ready || this._muted) return
    this._beep(600 + Math.random() * 1400, 0.015, 0.02, 'square')
  }

  // Key press / any interaction
  keypress() {
    if (!this._ready || this._muted) return
    this._beep(440, 0.08, 0.05, 'square')
    setTimeout(() => this._beep(660, 0.05, 0.04, 'square'), 40)
  }

  // Terminal line typing
  type() {
    if (!this._ready || this._muted) return
    this._beep(800 + Math.random() * 200, 0.03, 0.015, 'square')
  }

  // Scene transition whoosh
  whoosh() {
    if (!this._ready || !this.ctx || !this.master || this._muted) return
    try {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3
      const src = this.ctx.createBufferSource()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 1200
      filter.Q.value = 0.5
      src.buffer = buf
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3)
      src.connect(filter)
      filter.connect(gain)
      gain.connect(this.master)
      src.start()
    } catch (e) {}
  }

  // Big boot sound - Hermians-style
  boot() {
    if (!this._ready || this._muted) return
    const freqs = [80, 120, 180, 260, 380]
    freqs.forEach((f, i) => {
      setTimeout(() => this._beep(f, 0.25, 0.18, 'sawtooth'), i * 60)
    })
    setTimeout(() => {
      this._beep(1200, 0.1, 0.3, 'sine')
    }, 400)
  }

  // Wallet selected confirm
  confirm() {
    if (!this._ready || this._muted) return
    ;[523, 659, 784].forEach((f, i) =>
      setTimeout(() => this._beep(f, 0.12, 0.1, 'sine'), i * 80)
    )
  }

  // Hover on wallet option
  hover() {
    if (!this._ready || this._muted) return
    this._beep(880, 0.03, 0.03, 'sine')
  }
}

export const SFX = new AudioEngine()
