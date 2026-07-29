import { Section, Select, Slider, Toggle } from './Field'
import { OVERLAY_TYPES } from '../lib/overlay'
import { availableContainers } from '../lib/recorder'

const asPercent = (value) => `${Math.round(value * 100)}%`
const asMultiplier = (value) => `${Number(value).toFixed(2)}x`
const asHz = (value) => (value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`)
const asKbps = (value) => `${Math.round(value / 1000)} kbps`
const asMbps = (value) => `${(value / 1000000).toFixed(1)} Mbps`
const asPixels = (value) => `${Number(value).toFixed(1)} px`

function toDatetimeLocal(date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function ControlPanel({ look, output, audio, overlay, onLook, onOutput, onAudio, onOverlay }) {
  const containers = availableContainers()

  return (
    <div className="controls">
      <Section title="Picture" open>
        <Slider label="Softness" value={look.softness} min={0} max={3} onChange={(v) => onLook({ softness: v })} format={asPixels} />
        <Slider label="Sharpening" value={look.sharpen} min={0} max={1.5} onChange={(v) => onLook({ sharpen: v })} format={asMultiplier} />
        <Slider label="Contrast" value={look.contrast} min={0.5} max={2} onChange={(v) => onLook({ contrast: v })} format={asMultiplier} />
        <Slider label="Saturation" value={look.saturation} min={0} max={2} onChange={(v) => onLook({ saturation: v })} format={asMultiplier} />
        <Slider label="Brightness" value={look.brightness} min={-0.3} max={0.3} onChange={(v) => onLook({ brightness: v })} />
        <Slider label="Gamma" value={look.gamma} min={0.6} max={1.6} onChange={(v) => onLook({ gamma: v })} format={asMultiplier} />
        <Slider label="Warmth" value={look.temperature} min={-1} max={1} onChange={(v) => onLook({ temperature: v })} />
        <Slider label="Green tint" value={look.tint} min={-1} max={1} onChange={(v) => onLook({ tint: v })} />
        <Slider label="Bloom" value={look.bloom} min={0} max={1} onChange={(v) => onLook({ bloom: v })} format={asPercent} />
        <Slider label="Vignette" value={look.vignette} min={0} max={1} onChange={(v) => onLook({ vignette: v })} format={asPercent} />
        <Slider label="Lens distortion" value={look.distort} min={-0.5} max={0.5} onChange={(v) => onLook({ distort: v })} />
      </Section>

      <Section title="Noise and artefacts">
        <Slider label="Grain" value={look.grain} min={0} max={1} onChange={(v) => onLook({ grain: v })} format={asPercent} />
        <Slider label="Grain size" value={look.grainSize} min={1} max={5} step={0.1} onChange={(v) => onLook({ grainSize: v })} format={asPixels} />
        <Slider label="Colour fringing" value={look.chroma} min={0} max={5} step={0.1} onChange={(v) => onLook({ chroma: v })} format={asPixels} />
        <Slider label="Chroma bleed" value={look.bleed} min={0} max={1} onChange={(v) => onLook({ bleed: v })} format={asPercent} />
        <Slider label="Tracking jitter" value={look.jitter} min={0} max={1} onChange={(v) => onLook({ jitter: v })} format={asPercent} />
        <Slider label="Tape dropout" value={look.dropout} min={0} max={1} onChange={(v) => onLook({ dropout: v })} format={asPercent} />
        <Slider label="Scanlines" value={look.scanline} min={0} max={1} onChange={(v) => onLook({ scanline: v })} format={asPercent} />
        <Slider
          label="Colour banding"
          value={look.posterize}
          min={0}
          max={64}
          step={1}
          onChange={(v) => onLook({ posterize: v })}
          format={(v) => (v < 2 ? 'Off' : `${Math.round(v)} steps`)}
        />
        <Slider label="Desaturate" value={look.mono} min={0} max={1} onChange={(v) => onLook({ mono: v })} format={asPercent} />
        <Slider label="Green LCD palette" value={look.palette} min={0} max={1} onChange={(v) => onLook({ palette: v })} format={asPercent} />
      </Section>

      <Section title="Output">
        <Slider
          label="Resolution scale"
          value={output.scale}
          min={0.25}
          max={2}
          step={0.05}
          onChange={(v) => onOutput({ scale: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <p className="field-note">
          Encoding at {output.width}x{output.height}, {output.fps} fps.
        </p>
        <Slider label="Frame rate" value={output.fps} min={8} max={60} step={1} onChange={(v) => onOutput({ fps: v })} format={(v) => `${v} fps`} />
        <Slider
          label="Video bitrate"
          value={output.bitrate}
          min={100000}
          max={20000000}
          step={100000}
          onChange={(v) => onOutput({ bitrate: v })}
          format={asMbps}
        />
        <Select
          label="Aspect handling"
          value={output.fit}
          onChange={(v) => onOutput({ fit: v })}
          options={[
            { value: 'cover', label: 'Crop to fill' },
            { value: 'contain', label: 'Letterbox' },
            { value: 'stretch', label: 'Stretch' },
          ]}
        />
        <Select
          label="Container"
          value={output.container}
          onChange={(v) => onOutput({ container: v })}
          options={[
            { value: 'auto', label: 'Automatic' },
            { value: 'mp4', label: 'MP4', disabled: !containers.mp4 },
            { value: 'webm', label: 'WebM', disabled: !containers.webm },
          ]}
        />
        <Toggle
          label="Match source orientation"
          checked={output.autoOrient}
          onChange={(v) => onOutput({ autoOrient: v })}
          hint="Rotates the preset resolution for portrait clips"
        />
        <Toggle
          label="Hard pixel edges"
          checked={output.pixelated}
          onChange={(v) => onOutput({ pixelated: v })}
          hint="Preview only, does not change the export"
        />
      </Section>

      <Section title="Audio">
        <Toggle label="Include audio" checked={audio.enabled} onChange={(v) => onAudio({ enabled: v })} />
        <Slider
          label="Sample rate crush"
          value={audio.sampleCrush}
          min={1}
          max={8}
          step={0.5}
          onChange={(v) => onAudio({ sampleCrush: v })}
          format={(v) => (v <= 1 ? 'Off' : `1 / ${v.toFixed(1)}`)}
        />
        <Slider
          label="Bit depth"
          value={audio.bitDepth}
          min={4}
          max={16}
          step={1}
          onChange={(v) => onAudio({ bitDepth: v })}
          format={(v) => `${v} bit`}
        />
        <Slider label="Low pass" value={audio.lowpass} min={1000} max={20000} step={100} onChange={(v) => onAudio({ lowpass: v })} format={asHz} />
        <Slider label="High pass" value={audio.highpass} min={20} max={800} step={10} onChange={(v) => onAudio({ highpass: v })} format={asHz} />
        <Slider label="Saturation" value={audio.drive} min={0} max={1} onChange={(v) => onAudio({ drive: v })} format={asPercent} />
        <Slider label="Tape hiss" value={audio.hiss} min={0} max={1} onChange={(v) => onAudio({ hiss: v })} format={asPercent} />
        <Slider label="Wow and flutter" value={audio.wobble} min={0} max={1} onChange={(v) => onAudio({ wobble: v })} format={asPercent} />
        <Slider
          label="Audio bitrate"
          value={audio.bitrate}
          min={16000}
          max={256000}
          step={8000}
          onChange={(v) => onAudio({ bitrate: v })}
          format={asKbps}
        />
        <Toggle label="Mono" checked={audio.mono} onChange={(v) => onAudio({ mono: v })} />
      </Section>

      <Section title="Date stamp">
        <Select label="Style" value={overlay.type} onChange={(v) => onOverlay({ type: v })} options={OVERLAY_TYPES} />
        {overlay.type !== 'none' && (
          <>
            <div className="field">
              <label className="field-label" htmlFor="stamp-date">
                <span>Date and time</span>
              </label>
              <input
                id="stamp-date"
                type="datetime-local"
                value={toDatetimeLocal(overlay.date)}
                onChange={(event) => {
                  const next = new Date(event.target.value)
                  if (!Number.isNaN(next.getTime())) onOverlay({ date: next })
                }}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="stamp-color">
                <span>Colour</span>
              </label>
              <input
                id="stamp-color"
                type="color"
                value={overlay.color}
                onChange={(event) => onOverlay({ color: event.target.value })}
              />
            </div>
          </>
        )}
      </Section>
    </div>
  )
}
