import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Dropzone from './components/Dropzone'
import PresetPicker from './components/PresetPicker'
import PreviewStage from './components/PreviewStage'
import ControlPanel from './components/ControlPanel'
import ExportPanel from './components/ExportPanel'
import { useRetroProcessor } from './hooks/useRetroProcessor'
import { getPreset, PRESETS } from './presets'
import { isRecordingSupported } from './lib/recorder'
import './App.css'

const DEFAULT_OUTPUT_OPTS = {
  scale: 1,
  fps: 30,
  bitrate: 8000000,
  fit: 'cover',
  container: 'auto',
  autoOrient: true,
  pixelated: false,
}

/** Encoders are much happier with even dimensions. */
const evenSize = (value) => Math.max(2, Math.round(value / 2) * 2)

function shallowEqual(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

/** Presets carry a year, so the date stamp defaults to that year rather than today. */
function defaultStampDate(preset) {
  const now = new Date()
  if (!preset.year) return now
  return new Date(preset.year, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
}

export default function App() {
  const initial = PRESETS[1]

  const [file, setFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [presetId, setPresetId] = useState(initial.id)
  const [look, setLook] = useState(initial.look)
  const [audio, setAudio] = useState(initial.audio)
  const [overlay, setOverlay] = useState({ ...initial.overlay, date: defaultStampDate(initial) })
  const [outputOpts, setOutputOpts] = useState({
    ...DEFAULT_OUTPUT_OPTS,
    fps: initial.video.fps,
    bitrate: initial.video.bitrate,
  })
  const [trim, setTrim] = useState({ start: 0, end: 0 })
  const [sourceMeta, setSourceMeta] = useState(null)

  const urlRef = useRef(null)
  const recordingSupported = useMemo(() => isRecordingSupported(), [])
  const preset = getPreset(presetId)

  const output = useMemo(() => {
    let baseWidth = preset.video.width || sourceMeta?.width || 1280
    let baseHeight = preset.video.height || sourceMeta?.height || 720
    const portraitSource = sourceMeta && sourceMeta.height > sourceMeta.width
    if (outputOpts.autoOrient && portraitSource && baseWidth > baseHeight) {
      const swap = baseWidth
      baseWidth = baseHeight
      baseHeight = swap
    }
    return {
      ...outputOpts,
      width: evenSize(baseWidth * outputOpts.scale),
      height: evenSize(baseHeight * outputOpts.scale),
    }
  }, [preset, sourceMeta, outputOpts])

  const config = useMemo(
    () => ({ look, audio, overlay, output, trim, videoUrl, container: outputOpts.container }),
    [look, audio, overlay, output, trim, videoUrl, outputOpts.container],
  )

  const processor = useRetroProcessor(config)
  const { meta, exportState, resetSource } = processor
  const busy = exportState.status === 'running'

  useEffect(() => {
    if (!meta) return
    setSourceMeta(meta)
    setTrim({ start: 0, end: meta.duration || 0 })
  }, [meta])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const handleFile = useCallback(
    (nextFile) => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(nextFile)
      urlRef.current = url
      resetSource()
      setSourceMeta(null)
      setTrim({ start: 0, end: 0 })
      setFile(nextFile)
      setVideoUrl(url)
    },
    [resetSource],
  )

  const applyPreset = useCallback((id) => {
    const next = getPreset(id)
    setPresetId(id)
    setLook(next.look)
    setAudio(next.audio)
    setOverlay({ ...next.overlay, date: defaultStampDate(next) })
    setOutputOpts((prev) => ({ ...prev, fps: next.video.fps, bitrate: next.video.bitrate }))
  }, [])

  const modified = useMemo(
    () =>
      !shallowEqual(look, preset.look) ||
      !shallowEqual(audio, preset.audio) ||
      overlay.type !== preset.overlay.type ||
      overlay.color !== preset.overlay.color ||
      outputOpts.fps !== preset.video.fps ||
      outputOpts.bitrate !== preset.video.bitrate,
    [look, audio, overlay, outputOpts, preset],
  )

  const updateLook = useCallback((patch) => setLook((prev) => ({ ...prev, ...patch })), [])
  const updateAudio = useCallback((patch) => setAudio((prev) => ({ ...prev, ...patch })), [])
  const updateOverlay = useCallback((patch) => setOverlay((prev) => ({ ...prev, ...patch })), [])
  const updateOutput = useCallback((patch) => setOutputOpts((prev) => ({ ...prev, ...patch })), [])
  const updateTrim = useCallback((patch) => setTrim((prev) => ({ ...prev, ...patch })), [])

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>retrocam</h1>
            <p>Put your video through an old camera.</p>
          </div>
        </div>
      </header>

      <main>
        {!recordingSupported && (
          <p className="notice error">
            This browser cannot record canvas video. Chrome, Edge, Firefox or Safari 15 and newer will work.
          </p>
        )}
        {processor.error && <p className="notice error">{processor.error}</p>}

        {!videoUrl ? (
          <Dropzone onFile={handleFile} />
        ) : (
          <div className="workspace">
            <PreviewStage
              canvasRef={processor.canvasRef}
              videoRef={processor.videoRef}
              videoUrl={videoUrl}
              playing={processor.playing}
              currentTime={processor.currentTime}
              duration={meta?.duration || 0}
              trim={trim}
              onTrim={updateTrim}
              onPlay={processor.play}
              onPause={processor.pause}
              onSeek={processor.seek}
              output={output}
              meta={meta}
              fileName={file?.name || 'clip'}
              onReplace={() => {
                resetSource()
                setVideoUrl(null)
                setFile(null)
                setSourceMeta(null)
              }}
              busy={busy}
            />
            <PresetPicker
              value={presetId}
              onChange={applyPreset}
              modified={modified}
              onReset={() => applyPreset(presetId)}
            />
            <ExportPanel
              exportState={exportState}
              onStart={processor.startExport}
              onCancel={processor.cancelExport}
              onClear={processor.clearExport}
              presetId={presetId}
              fileName={file?.name}
              trimLength={Math.max(0, trim.end - trim.start)}
              disabled={!recordingSupported || !meta}
            />
            <ControlPanel
              look={look}
              output={output}
              audio={audio}
              overlay={overlay}
              onLook={updateLook}
              onOutput={updateOutput}
              onAudio={updateAudio}
              onOverlay={updateOverlay}
            />
          </div>
        )}
      </main>

      <footer className="colophon">
        <p>Everything runs locally in your browser. Your video is never uploaded anywhere.</p>
      </footer>
    </div>
  )
}
