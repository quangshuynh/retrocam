/** MediaRecorder container negotiation and small formatting helpers. */

// MP4 first because it shares and plays back far more reliably, especially on
// phones. Browsers that cannot mux MP4 fall through to WebM.
const MP4_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
]

const WEBM_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=h264,opus',
  'video/webm',
]

function firstSupported(list) {
  if (typeof MediaRecorder === 'undefined') return null
  return list.find((type) => MediaRecorder.isTypeSupported(type)) || null
}

/**
 * @param prefer 'auto' | 'mp4' | 'webm'
 * @returns a supported mime type string, or null if none work
 */
export function pickMimeType(prefer = 'auto') {
  if (prefer === 'mp4') return firstSupported(MP4_CANDIDATES) || firstSupported(WEBM_CANDIDATES)
  if (prefer === 'webm') return firstSupported(WEBM_CANDIDATES) || firstSupported(MP4_CANDIDATES)
  return firstSupported(MP4_CANDIDATES) || firstSupported(WEBM_CANDIDATES)
}

export function availableContainers() {
  return {
    mp4: Boolean(firstSupported(MP4_CANDIDATES)),
    webm: Boolean(firstSupported(WEBM_CANDIDATES)),
  }
}

export function extensionForMime(mime) {
  if (!mime) return 'webm'
  if (mime.includes('mp4')) return 'mp4'
  return 'webm'
}

export function isRecordingSupported() {
  return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function safeFilename(name, presetId, extension) {
  const stem = (name || 'video').replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40)
  return `${stem || 'video'}-${presetId}.${extension}`
}
