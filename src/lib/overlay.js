/**
 * Burned in viewfinder overlays, drawn on the 2D composite canvas after the
 * shader pass so they sit on top of the grain the way real burn in does.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const pad = (n) => String(n).padStart(2, '0')

/** Advances the stamp clock in step with playback so the seconds actually tick. */
function stampTime(baseDate, elapsedSeconds) {
  return new Date(baseDate.getTime() + elapsedSeconds * 1000)
}

function setFont(ctx, size, weight = 'bold') {
  ctx.font = `${weight} ${Math.round(size)}px "Courier New", "Consolas", monospace`
  ctx.textBaseline = 'alphabetic'
}

function glowText(ctx, text, x, y, color, blur) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.fillText(text, x, y)
  ctx.restore()
}

function shadowText(ctx, text, x, y, color, offset) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.fillText(text, x + offset, y + offset)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

/**
 * @param ctx     2D context of the composite canvas
 * @param width   canvas width in pixels
 * @param height  canvas height in pixels
 * @param options { type, color, date, showClock }
 * @param elapsed playback position in seconds, used to tick the clock
 */
export function drawOverlay(ctx, width, height, options, elapsed) {
  const type = options?.type
  if (!type || type === 'none') return

  // Everything scales off a 480 line reference so overlays look the same at any preset size.
  const unit = height / 480
  const base = options.date instanceof Date ? options.date : new Date()
  const now = stampTime(base, elapsed)
  const color = options.color || '#ffffff'

  ctx.save()
  ctx.textAlign = 'left'

  if (type === 'datestamp') {
    const size = Math.max(11, 26 * unit)
    setFont(ctx, size)
    const line = `${now.getFullYear()} ${pad(now.getMonth() + 1)} ${pad(now.getDate())}`
    const clock = options.showClock === false ? '' : `  ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const text = line + clock
    ctx.textAlign = 'right'
    glowText(ctx, text, width - size * 0.6, height - size * 0.7, color, size * 0.5)
  }

  if (type === 'camcorder') {
    const size = Math.max(10, 22 * unit)
    setFont(ctx, size)
    const margin = size * 0.8

    // Blinking record indicator, roughly one cycle per second.
    const on = elapsed % 1 < 0.6
    if (on) {
      ctx.beginPath()
      ctx.arc(margin + size * 0.35, margin + size * 0.3, size * 0.32, 0, Math.PI * 2)
      ctx.fillStyle = '#ff3b30'
      ctx.fill()
    }
    shadowText(ctx, 'REC', margin + size * 0.95, margin + size * 0.6, color, unit * 1.5)

    ctx.textAlign = 'right'
    shadowText(ctx, 'SP', width - margin, margin + size * 0.6, color, unit * 1.5)

    ctx.textAlign = 'left'
    const dateLine = `${MONTHS[now.getMonth()]} ${pad(now.getDate())} ${now.getFullYear()}`
    const timeLine = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    shadowText(ctx, dateLine, margin, height - margin - size * 1.25, color, unit * 1.5)
    shadowText(ctx, timeLine, margin, height - margin, color, unit * 1.5)
  }

  if (type === 'vhs') {
    const size = Math.max(12, 28 * unit)
    setFont(ctx, size)
    const margin = size * 0.7

    ctx.beginPath()
    ctx.moveTo(margin, margin)
    ctx.lineTo(margin, margin + size * 0.7)
    ctx.lineTo(margin + size * 0.6, margin + size * 0.35)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    shadowText(ctx, 'PLAY', margin + size * 0.95, margin + size * 0.62, color, unit * 2)

    const dateLine = `${MONTHS[now.getMonth()]} ${pad(now.getDate())} ${now.getFullYear()}`
    const timeLine = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    shadowText(ctx, dateLine, margin, height - margin - size * 1.2, color, unit * 2)
    shadowText(ctx, timeLine, margin, height - margin, color, unit * 2)
  }

  ctx.restore()
}

export const OVERLAY_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'datestamp', label: 'Date stamp' },
  { value: 'camcorder', label: 'Camcorder' },
  { value: 'vhs', label: 'VHS deck' },
]
