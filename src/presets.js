/**
 * Camera presets.
 *
 * Each preset describes four independent things:
 *   video   the encode target (resolution, frame rate, bitrate)
 *   look    uniforms handed straight to the fragment shader
 *   audio   the WebAudio chain used while recording
 *   overlay any burned in date stamp or viewfinder furniture
 *
 * Resolutions and frame rates follow what the real hardware actually recorded.
 * The look values are a judgement call tuned by eye.
 */

export const DEFAULT_LOOK = {
  softness: 0,
  sharpen: 0,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  gamma: 1,
  temperature: 0,
  tint: 0,
  grain: 0,
  grainSize: 1,
  chroma: 0,
  bleed: 0,
  jitter: 0,
  vignette: 0,
  scanline: 0,
  posterize: 0,
  bloom: 0,
  distort: 0,
  mono: 0,
  palette: 0,
  dropout: 0,
}

export const DEFAULT_AUDIO = {
  enabled: true,
  sampleCrush: 1, // 1 keeps the full rate, 6 lands around 8kHz
  bitDepth: 16,
  lowpass: 20000,
  highpass: 20,
  mono: false,
  drive: 0,
  hiss: 0,
  wobble: 0,
  bitrate: 128000,
}

export const DEFAULT_OVERLAY = {
  type: 'none',
  color: '#ff8a1f',
}

const PRESET_DATA = [
  {
    id: 'source',
    name: 'Untouched',
    brand: 'Source',
    year: null,
    category: 'Base',
    blurb: 'Keeps the original resolution and picture. A clean starting point for building your own look.',
    video: { width: null, height: null, fps: 30, bitrate: 8000000 },
    look: {},
    audio: {},
    overlay: { type: 'none' },
  },
  {
    id: 'iphone-3gs',
    name: 'iPhone 3GS',
    brand: 'Apple',
    year: 2009,
    category: 'Phones',
    blurb: 'VGA at 30fps, soft plastic optics and a warm cast. The first iPhone that could record video at all.',
    video: { width: 640, height: 480, fps: 30, bitrate: 3500000 },
    look: {
      softness: 0.9, contrast: 1.1, saturation: 0.95, gamma: 1.05,
      temperature: 0.35, grain: 0.18, grainSize: 1.5, vignette: 0.35, bloom: 0.15,
    },
    audio: { lowpass: 8000, highpass: 180, mono: true, sampleCrush: 3, bitDepth: 12, drive: 0.15, bitrate: 64000 },
    overlay: { type: 'none' },
  },
  {
    id: 'iphone-4',
    name: 'iPhone 4',
    brand: 'Apple',
    year: 2010,
    category: 'Phones',
    blurb: '720p at 30fps. Much cleaner than the 3GS but still soft, with the familiar warm tilt.',
    video: { width: 1280, height: 720, fps: 30, bitrate: 10000000 },
    look: {
      softness: 0.35, sharpen: 0.2, contrast: 1.06, saturation: 1.05,
      temperature: 0.2, grain: 0.1, grainSize: 1.5, vignette: 0.22, bloom: 0.1,
    },
    audio: { lowpass: 12000, highpass: 120, mono: true, sampleCrush: 2, bitDepth: 14, bitrate: 96000 },
    overlay: { type: 'none' },
  },
  {
    id: 'iphone-5',
    name: 'iPhone 5',
    brand: 'Apple',
    year: 2012,
    category: 'Phones',
    blurb: '1080p, sharper glass and a cooler, far more neutral picture. Barely retro, just dated.',
    video: { width: 1920, height: 1080, fps: 30, bitrate: 17000000 },
    look: {
      sharpen: 0.35, contrast: 1.04, saturation: 1.06,
      temperature: -0.08, grain: 0.05, vignette: 0.12,
    },
    audio: { lowpass: 15000, highpass: 90, bitrate: 128000 },
    overlay: { type: 'none' },
  },
  {
    id: 'razr-v3',
    name: 'RAZR V3',
    brand: 'Motorola',
    year: 2004,
    category: 'Phones',
    blurb: 'QCIF at 15fps. Blocky, smeared and gloriously unwatchable. Peak flip phone.',
    video: { width: 176, height: 144, fps: 15, bitrate: 120000 },
    look: {
      softness: 0.6, contrast: 1.25, saturation: 0.8, posterize: 12,
      grain: 0.25, grainSize: 2, vignette: 0.4, bloom: 0.1,
    },
    audio: { lowpass: 3400, highpass: 300, mono: true, sampleCrush: 6, bitDepth: 8, drive: 0.4, bitrate: 24000 },
    overlay: { type: 'none' },
  },
  {
    id: 'nokia-n95',
    name: 'Nokia N95',
    brand: 'Nokia',
    year: 2007,
    category: 'Phones',
    blurb: 'VGA at 30fps with aggressive in camera sharpening and plenty of visible sensor noise.',
    video: { width: 640, height: 480, fps: 30, bitrate: 2600000 },
    look: {
      sharpen: 0.8, contrast: 1.18, saturation: 1.15, temperature: 0.1,
      grain: 0.3, chroma: 0.6, vignette: 0.3,
    },
    audio: { lowpass: 7000, highpass: 200, mono: true, sampleCrush: 3, bitDepth: 10, drive: 0.25, bitrate: 48000 },
    overlay: { type: 'none' },
  },
  {
    id: 'cybershot-w550',
    name: 'Cyber-shot W550',
    brand: 'Sony',
    year: 2005,
    category: 'Compacts',
    blurb: 'VGA motion JPEG off a CCD sensor. Punchy colour, heavy grain and the orange date burn in.',
    video: { width: 640, height: 480, fps: 30, bitrate: 2200000 },
    look: {
      softness: 0.45, sharpen: 0.5, contrast: 1.2, saturation: 1.25, gamma: 0.95,
      temperature: 0.15, grain: 0.28, grainSize: 1.2, vignette: 0.38, bloom: 0.22,
    },
    audio: { lowpass: 6500, highpass: 250, mono: true, sampleCrush: 4, bitDepth: 8, drive: 0.3, hiss: 0.1, bitrate: 32000 },
    overlay: { type: 'datestamp', color: '#ff8a1f' },
  },
  {
    id: 'powershot-a70',
    name: 'PowerShot A70',
    brand: 'Canon',
    year: 2003,
    category: 'Compacts',
    blurb: 'QVGA clips at 15fps with a three minute limit. Thick CCD grain and crushed shadows.',
    video: { width: 320, height: 240, fps: 15, bitrate: 900000 },
    look: {
      softness: 0.5, contrast: 1.3, saturation: 1.1, gamma: 0.92, temperature: 0.12,
      grain: 0.35, grainSize: 1.5, vignette: 0.42, posterize: 24,
    },
    audio: { lowpass: 5200, highpass: 300, mono: true, sampleCrush: 5, bitDepth: 8, drive: 0.35, hiss: 0.12, bitrate: 24000 },
    overlay: { type: 'none' },
  },
  {
    id: 'flip-mino-hd',
    name: 'Flip Mino HD',
    brand: 'Pure Digital',
    year: 2009,
    category: 'Compacts',
    blurb: '720p pocket camcorder. Contrasty, slightly crushed and never quite in focus.',
    video: { width: 1280, height: 720, fps: 30, bitrate: 6000000 },
    look: {
      softness: 0.5, contrast: 1.22, saturation: 1.12, gamma: 0.95,
      grain: 0.14, grainSize: 1.2, vignette: 0.3, bloom: 0.18,
    },
    audio: { lowpass: 9000, highpass: 150, mono: true, sampleCrush: 2, bitDepth: 12, drive: 0.2, bitrate: 64000 },
    overlay: { type: 'none' },
  },
  {
    id: 'hi8-handycam',
    name: 'Hi8 Handycam',
    brand: 'Sony',
    year: 1995,
    category: 'Camcorders',
    blurb: 'Analogue tape. Soft luma, smeared chroma, scanlines and a white clock in the corner.',
    video: { width: 640, height: 480, fps: 30, bitrate: 2000000 },
    look: {
      softness: 1.1, contrast: 1.12, saturation: 0.92, temperature: 0.1,
      bleed: 0.55, chroma: 1.2, jitter: 0.12, scanline: 0.4, dropout: 0.25,
      grain: 0.3, grainSize: 1.4, vignette: 0.35, bloom: 0.25,
    },
    audio: { lowpass: 6000, highpass: 150, mono: true, sampleCrush: 3, bitDepth: 10, drive: 0.2, hiss: 0.22, wobble: 0.35, bitrate: 48000 },
    overlay: { type: 'camcorder', color: '#f4f4f4' },
  },
  {
    id: 'vhs-c',
    name: 'VHS-C',
    brand: 'JVC',
    year: 1989,
    category: 'Camcorders',
    blurb: 'The full tape treatment. Tracking wobble, dropouts, bleeding colour and a wall of hiss.',
    video: { width: 640, height: 480, fps: 30, bitrate: 1400000 },
    look: {
      softness: 1.6, contrast: 1.05, saturation: 0.85, temperature: 0.05,
      bleed: 0.85, chroma: 2.2, jitter: 0.35, scanline: 0.55, dropout: 0.6, posterize: 32,
      grain: 0.4, grainSize: 1.6, vignette: 0.42, bloom: 0.3,
    },
    audio: { lowpass: 4500, highpass: 120, mono: true, sampleCrush: 4, bitDepth: 9, drive: 0.3, hiss: 0.35, wobble: 0.6, bitrate: 32000 },
    overlay: { type: 'vhs', color: '#ffffff' },
  },
  {
    id: 'minidv',
    name: 'MiniDV',
    brand: 'Panasonic',
    year: 1998,
    category: 'Camcorders',
    blurb: 'Digital tape at 720x480. Clean but interlaced, with that flat consumer DV colour.',
    video: { width: 720, height: 480, fps: 30, bitrate: 4000000 },
    look: {
      softness: 0.3, sharpen: 0.3, contrast: 1.08, saturation: 0.95, temperature: -0.05,
      scanline: 0.28, grain: 0.12, vignette: 0.18,
    },
    audio: { lowpass: 13000, highpass: 80, bitDepth: 12, hiss: 0.06, bitrate: 96000 },
    overlay: { type: 'camcorder', color: '#f4f4f4' },
  },
  {
    id: 'gopro-hd-hero',
    name: 'HD HERO',
    brand: 'GoPro',
    year: 2010,
    category: 'Action',
    blurb: '720p ultra wide. Barrel distortion, oversaturated skies and crunchy micro contrast.',
    video: { width: 1280, height: 720, fps: 30, bitrate: 9000000 },
    look: {
      sharpen: 0.6, contrast: 1.15, saturation: 1.3, temperature: -0.06,
      distort: 0.28, vignette: 0.3, grain: 0.08, bloom: 0.12,
    },
    audio: { lowpass: 11000, highpass: 200, mono: true, drive: 0.3, bitrate: 96000 },
    overlay: { type: 'none' },
  },
  {
    id: 'desk-webcam',
    name: 'Desk Webcam',
    brand: 'Generic',
    year: 2004,
    category: 'Fun',
    blurb: 'QVGA at 15fps over USB 1.1. Washed out, noisy and permanently underexposed.',
    video: { width: 320, height: 240, fps: 15, bitrate: 400000 },
    look: {
      softness: 0.8, contrast: 0.92, saturation: 0.75, brightness: 0.04, temperature: -0.15,
      grain: 0.45, grainSize: 1.8, posterize: 20, vignette: 0.35, chroma: 0.8,
    },
    audio: { lowpass: 4000, highpass: 300, mono: true, sampleCrush: 6, bitDepth: 8, drive: 0.4, hiss: 0.15, bitrate: 24000 },
    overlay: { type: 'none' },
  },
  {
    id: 'game-boy-camera',
    name: 'Game Boy Camera',
    brand: 'Nintendo',
    year: 1998,
    category: 'Fun',
    blurb: '128x112 in four shades of green at 12fps. Silent, because it never recorded audio.',
    video: { width: 128, height: 112, fps: 12, bitrate: 300000 },
    look: { softness: 0.3, contrast: 1.25, palette: 1, grain: 0.12, vignette: 0.2 },
    audio: { enabled: false },
    overlay: { type: 'none' },
  },
]

/** Presets with every default filled in, so callers never see an undefined uniform. */
export const PRESETS = PRESET_DATA.map((preset) => ({
  ...preset,
  look: { ...DEFAULT_LOOK, ...preset.look },
  audio: { ...DEFAULT_AUDIO, ...preset.audio },
  overlay: { ...DEFAULT_OVERLAY, ...preset.overlay },
}))

export const CATEGORIES = [...new Set(PRESETS.map((p) => p.category))]

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0]
}
