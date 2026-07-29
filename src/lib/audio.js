/**
 * WebAudio chain that degrades the source audio to match a preset.
 *
 * Signal path:
 *   video -> highpass -> lowpass -> wobble delay -> bitcrusher -> drive -> bus
 *   tape hiss ------------------------------------------------> bus
 *   bus -> monitor gain -> speakers
 *   bus -> stream destination -> MediaRecorder
 *
 * The graph is built once per loaded file because createMediaElementSource can
 * only ever be called once for a given media element. Presets then just retune
 * the existing nodes.
 */

// Sample rate reduction plus bit depth quantisation, the two things that make
// old camera audio sound the way it does.
const CRUSHER_SOURCE = `
class RetroCrusher extends AudioWorkletProcessor {
  constructor() {
    super()
    this.phase = 1
    this.hold = []
    this.reduction = 1
    this.bits = 16
    this.port.onmessage = (event) => {
      if (typeof event.data.reduction === 'number') this.reduction = event.data.reduction
      if (typeof event.data.bits === 'number') this.bits = event.data.bits
    }
  }

  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    if (!output || output.length === 0) return true
    if (!input || input.length === 0) {
      for (let c = 0; c < output.length; c++) output[c].fill(0)
      return true
    }

    const reduction = Math.max(1, this.reduction || 1)
    const bits = Math.max(1, this.bits || 16)
    const step = Math.pow(0.5, bits)
    const frames = output[0].length

    for (let i = 0; i < frames; i++) {
      this.phase += 1 / reduction
      let take = false
      if (this.phase >= 1) {
        this.phase -= 1
        take = true
      }
      for (let c = 0; c < output.length; c++) {
        const channel = input[Math.min(c, input.length - 1)]
        const value = channel ? channel[i] : 0
        if (take || this.hold[c] === undefined) {
          this.hold[c] = step * Math.floor(value / step + 0.5)
        }
        output[c][i] = this.hold[c]
      }
    }
    return true
  }
}

registerProcessor('retro-crusher', RetroCrusher)
`

function crusherModuleUrl() {
  return URL.createObjectURL(new Blob([CRUSHER_SOURCE], { type: 'application/javascript' }))
}

/** Soft clipping curve. Amount of 0 is a straight line, 1 is heavily saturated. */
function driveCurve(amount) {
  const samples = 1024
  const curve = new Float32Array(samples)
  const k = amount * 40
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1
    curve[i] = k > 0.0001 ? ((1 + k) * x) / (1 + k * Math.abs(x)) : x
  }
  return curve
}

function makeNoiseBuffer(ctx) {
  const length = Math.floor(ctx.sampleRate * 2)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

export async function createAudioProcessor(videoElement) {
  const AudioCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioCtor) throw new Error('WebAudio is not supported in this browser.')

  const ctx = new AudioCtor()
  const source = ctx.createMediaElementSource(videoElement)

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'

  // Tape wow and flutter: a short delay whose length is modulated by an LFO.
  const wobbleDelay = ctx.createDelay(0.2)
  wobbleDelay.delayTime.value = 0.02
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 2.7
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0
  lfo.connect(lfoGain).connect(wobbleDelay.delayTime)
  lfo.start()

  let crusher = null
  try {
    const url = crusherModuleUrl()
    await ctx.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    crusher = new AudioWorkletNode(ctx, 'retro-crusher')
  } catch {
    // AudioWorklet is unavailable or blocked. The rest of the chain still works.
    crusher = null
  }

  const shaper = ctx.createWaveShaper()
  shaper.curve = driveCurve(0)

  const hissSource = ctx.createBufferSource()
  hissSource.buffer = makeNoiseBuffer(ctx)
  hissSource.loop = true
  const hissFilter = ctx.createBiquadFilter()
  hissFilter.type = 'bandpass'
  hissFilter.frequency.value = 3200
  hissFilter.Q.value = 0.6
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0
  hissSource.connect(hissFilter).connect(hissGain)
  hissSource.start()

  const bus = ctx.createGain()
  const monitor = ctx.createGain()
  monitor.gain.value = 1
  const destination = ctx.createMediaStreamDestination()

  source.connect(highpass)
  highpass.connect(lowpass)
  lowpass.connect(wobbleDelay)
  if (crusher) {
    wobbleDelay.connect(crusher)
    crusher.connect(shaper)
  } else {
    wobbleDelay.connect(shaper)
  }
  shaper.connect(bus)
  hissGain.connect(bus)
  bus.connect(monitor)
  monitor.connect(ctx.destination)
  bus.connect(destination)

  let currentDrive = 0

  function apply(settings) {
    const now = ctx.currentTime
    highpass.frequency.setTargetAtTime(Math.max(10, settings.highpass), now, 0.01)
    lowpass.frequency.setTargetAtTime(Math.min(22000, Math.max(200, settings.lowpass)), now, 0.01)
    lfoGain.gain.setTargetAtTime(settings.wobble * 0.0016, now, 0.05)
    hissGain.gain.setTargetAtTime(settings.hiss * 0.045, now, 0.05)
    bus.gain.setTargetAtTime(settings.enabled ? 1 : 0, now, 0.01)

    if (Math.abs(settings.drive - currentDrive) > 0.001) {
      currentDrive = settings.drive
      shaper.curve = driveCurve(settings.drive)
    }
    if (crusher) {
      crusher.port.postMessage({
        reduction: Math.max(1, settings.sampleCrush),
        bits: Math.max(1, settings.bitDepth),
      })
    }

    // Explicit channel count forces a downmix to mono at this node.
    const channels = settings.mono ? 1 : 2
    if (bus.channelCount !== channels) {
      bus.channelCount = channels
      bus.channelCountMode = 'explicit'
      bus.channelInterpretation = 'speakers'
    }
  }

  function setMonitoring(on) {
    monitor.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02)
  }

  async function resume() {
    if (ctx.state === 'suspended') await ctx.resume()
  }

  function dispose() {
    try {
      lfo.stop()
      hissSource.stop()
    } catch {
      // Already stopped.
    }
    try {
      source.disconnect()
    } catch {
      // Nothing connected.
    }
    ctx.close()
  }

  return {
    context: ctx,
    stream: destination.stream,
    apply,
    setMonitoring,
    resume,
    dispose,
  }
}
