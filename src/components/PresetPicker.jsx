import { CATEGORIES, PRESETS } from '../presets'

function resolutionLabel(preset) {
  if (!preset.video.width) return 'Native'
  return `${preset.video.width}x${preset.video.height}`
}

export default function PresetPicker({ value, onChange, modified, onReset }) {
  const active = PRESETS.find((preset) => preset.id === value)

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Camera</h2>
        {modified && (
          <button type="button" className="button ghost tiny" onClick={onReset}>
            Reset preset
          </button>
        )}
      </header>

      <div className="preset-groups">
        {CATEGORIES.map((category) => (
          <div key={category} className="preset-group">
            <h3 className="preset-group-title">{category}</h3>
            <div className="preset-grid">
              {PRESETS.filter((preset) => preset.category === category).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-card${preset.id === value ? ' is-active' : ''}`}
                  onClick={() => onChange(preset.id)}
                  aria-pressed={preset.id === value}
                >
                  <span className="preset-brand">{preset.brand}</span>
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-meta">
                    {resolutionLabel(preset)}
                    {preset.year ? ` / ${preset.year}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {active && (
        <p className="preset-blurb">
          {active.blurb}
          {modified && <span className="preset-modified"> Edited.</span>}
        </p>
      )}
    </section>
  )
}
