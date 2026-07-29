import { useId } from 'react'

export function Slider({ label, value, min, max, step = 0.01, onChange, format, disabled }) {
  const id = useId()
  const display = format ? format(value) : Number(value).toFixed(2)
  return (
    <div className={`field${disabled ? ' is-disabled' : ''}`}>
      <label className="field-label" htmlFor={id}>
        <span>{label}</span>
        <output className="field-value">{display}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

export function Toggle({ label, checked, onChange, hint }) {
  const id = useId()
  return (
    <div className="field field-toggle">
      <label className="toggle" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="toggle-track" aria-hidden="true">
          <span className="toggle-thumb" />
        </span>
        <span className="toggle-label">
          {label}
          {hint && <small>{hint}</small>}
        </span>
      </label>
    </div>
  )
}

export function Select({ label, value, options, onChange }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        <span>{label}</span>
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Section({ title, children, open = false }) {
  return (
    <details className="section" open={open}>
      <summary>
        <span>{title}</span>
        <span className="section-chevron" aria-hidden="true" />
      </summary>
      <div className="section-body">{children}</div>
    </details>
  )
}
