import { formatTime } from '../lib/recorder'

export default function PreviewStage({
  canvasRef,
  videoRef,
  videoUrl,
  playing,
  currentTime,
  duration,
  trim,
  onTrim,
  onPlay,
  onPause,
  onSeek,
  output,
  meta,
  fileName,
  onReplace,
  busy,
}) {
  const trimmed = Math.max(0, trim.end - trim.start)

  return (
    <section className="stage">
      <div className={`viewport${output.pixelated ? ' is-pixelated' : ''}`}>
        <canvas ref={canvasRef} className="viewport-canvas" />
        {/* Kept on screen at 2px so mobile browsers keep decoding frames. The key
            forces a fresh element per source, because an element that has been
            through createMediaElementSource can never be rebound to a new
            AudioContext. */}
        <video
          key={videoUrl}
          ref={videoRef}
          className="source-video"
          src={videoUrl}
          playsInline
          preload="auto"
          crossOrigin="anonymous"
        />
        {busy && (
          <div className="viewport-badge">
            <span className="rec-dot" /> Recording in realtime
          </div>
        )}
      </div>

      <div className="transport">
        <button
          type="button"
          className="button icon"
          onClick={playing ? onPause : onPlay}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={busy}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z" /></svg>
          )}
        </button>

        <input
          className="scrubber"
          type="range"
          min={0}
          max={Math.max(0.1, duration)}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          disabled={busy}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Playback position"
        />

        <span className="timecode">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="trim">
        <div className="trim-head">
          <h3>Trim</h3>
          <span className="trim-length">{formatTime(trimmed)} selected</span>
        </div>
        <p className="field-note">
          Recording runs in realtime, so a shorter clip finishes sooner.
        </p>
        <label className="trim-row">
          <span>Start</span>
          <input
            type="range"
            min={0}
            max={Math.max(0.1, duration)}
            step={0.01}
            value={trim.start}
            disabled={busy}
            onChange={(event) => onTrim({ start: Math.min(Number(event.target.value), trim.end - 0.2) })}
          />
          <output>{formatTime(trim.start)}</output>
        </label>
        <label className="trim-row">
          <span>End</span>
          <input
            type="range"
            min={0}
            max={Math.max(0.1, duration)}
            step={0.01}
            value={trim.end}
            disabled={busy}
            onChange={(event) => onTrim({ end: Math.max(Number(event.target.value), trim.start + 0.2) })}
          />
          <output>{formatTime(trim.end)}</output>
        </label>
      </div>

      <div className="source-info">
        <div>
          <span className="source-name" title={fileName}>{fileName}</span>
          {meta && (
            <span className="source-meta">
              {meta.width}x{meta.height} in, {output.width}x{output.height} out
            </span>
          )}
        </div>
        <button type="button" className="button ghost tiny" onClick={onReplace} disabled={busy}>
          Change video
        </button>
      </div>
    </section>
  )
}
