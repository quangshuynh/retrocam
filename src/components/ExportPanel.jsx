import { formatBytes, formatTime, safeFilename } from '../lib/recorder'

export default function ExportPanel({ exportState, onStart, onCancel, onClear, presetId, fileName, trimLength, disabled }) {
  const running = exportState.status === 'running'
  const done = exportState.status === 'done'
  const remaining = Math.max(0, trimLength * (1 - exportState.progress))

  return (
    <section className="export">
      {exportState.error && <p className="notice error">{exportState.error}</p>}

      {!done && (
        <div className="export-actions">
          <button type="button" className="button primary large" onClick={onStart} disabled={disabled || running}>
            {running ? 'Recording...' : 'Render video'}
          </button>
          {running && (
            <button type="button" className="button ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      )}

      {running && (
        <div className="progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${exportState.progress * 100}%` }} />
          </div>
          <span className="progress-label">
            {Math.round(exportState.progress * 100)}% / about {formatTime(remaining)} left
          </span>
          <span className="progress-hint">Keep this tab visible, background tabs stop painting frames.</span>
        </div>
      )}

      {done && (
        <div className="result">
          <h3>Ready</h3>
          <video className="result-video" src={exportState.url} controls playsInline />
          <div className="result-row">
            <span className="result-meta">
              {exportState.extension.toUpperCase()} / {formatBytes(exportState.size)}
            </span>
            <div className="result-actions">
              <button type="button" className="button ghost" onClick={onClear}>
                Render again
              </button>
              <a
                className="button primary"
                href={exportState.url}
                download={safeFilename(fileName, presetId, exportState.extension)}
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
