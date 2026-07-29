import { useCallback, useEffect, useRef, useState } from 'react'
import { createRenderer } from '../lib/renderer'
import { createAudioProcessor } from '../lib/audio'
import { drawOverlay } from '../lib/overlay'
import { extensionForMime, pickMimeType } from '../lib/recorder'

const IDLE_EXPORT = { status: 'idle', progress: 0, url: null, size: 0, mime: null, error: null }

function seekTo(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.05) {
      resolve()
      return
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      video.removeEventListener('seeked', finish)
      resolve()
    }
    video.addEventListener('seeked', finish)
    // Some containers never fire seeked on an exact boundary, so do not hang on it.
    setTimeout(finish, 1500)
    video.currentTime = time
  })
}

/**
 * Owns the whole processing pipeline: the hidden video element, the offscreen
 * WebGL canvas, the visible composite canvas, the audio graph and the recorder.
 *
 * `config` is read through a ref inside the render loop so that dragging a
 * slider updates the picture without tearing down anything.
 */
export function useRetroProcessor(config) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const glCanvasRef = useRef(null)
  const rendererRef = useRef(null)
  const audioRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const rafRef = useRef(0)
  const watchRef = useRef(0)
  const lastDrawRef = useRef(0)
  const exportingRef = useRef(false)
  const cancelledRef = useRef(false)
  const streamRef = useRef(null)
  const configRef = useRef(config)

  const [meta, setMeta] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [exportState, setExportState] = useState(IDLE_EXPORT)
  const [error, setError] = useState(null)

  configRef.current = config

  /* Draws one processed frame into the visible canvas. */
  const drawFrame = useCallback(() => {
    const video = videoRef.current
    const out = canvasRef.current
    const glCanvas = glCanvasRef.current
    const renderer = rendererRef.current
    const cfg = configRef.current
    if (!video || !out || !glCanvas || !renderer) return
    if (video.readyState < 2 || !video.videoWidth) return

    const ok = renderer.render(video, cfg.look, {
      srcWidth: video.videoWidth,
      srcHeight: video.videoHeight,
      fit: cfg.output.fit,
      time: video.currentTime,
    })
    if (!ok) return

    const ctx = out.getContext('2d')
    ctx.drawImage(glCanvas, 0, 0, out.width, out.height)
    drawOverlay(ctx, out.width, out.height, cfg.overlay, video.currentTime)
  }, [])

  const finishExport = useCallback((cancelled) => {
    if (!exportingRef.current) return
    exportingRef.current = false
    cancelledRef.current = Boolean(cancelled)
    if (watchRef.current) {
      clearInterval(watchRef.current)
      watchRef.current = 0
    }
    const video = videoRef.current
    if (video) video.pause()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      // Give the encoder a beat to flush the trailing frames before stopping.
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop()
      }, 180)
    }
  }, [])

  /* Frame pump for both live preview and recording. Drawing only, so that a
     throttled rAF can never stall the export itself. */
  const tick = useCallback((now) => {
    rafRef.current = requestAnimationFrame(tick)
    const interval = 1000 / Math.max(1, configRef.current.output.fps)
    if (now - lastDrawRef.current < interval - 1) return
    lastDrawRef.current = now
    drawFrame()
  }, [drawFrame])

  /* Timer driven progress and stop check.
     Browsers suspend requestAnimationFrame in a hidden tab, so the export must
     not depend on it. Timers are merely throttled, never stopped, which means a
     backgrounded recording still terminates instead of hanging. */
  const exportWatch = useCallback(() => {
    if (!exportingRef.current) return
    const video = videoRef.current
    if (!video) return
    const { start, end } = configRef.current.trim
    const span = Math.max(0.01, end - start)
    const ratio = Math.min(1, Math.max(0, (video.currentTime - start) / span))

    // Backstop draw so a throttled rAF does not record a frozen frame.
    const now = performance.now()
    if (now - lastDrawRef.current > 1000 / Math.max(1, configRef.current.output.fps)) {
      lastDrawRef.current = now
      drawFrame()
    }

    setExportState((prev) => (prev.status === 'running' ? { ...prev, progress: ratio } : prev))
    if (video.ended || video.currentTime >= end - 0.02) finishExport(false)
  }, [drawFrame, finishExport])

  const startLoop = useCallback(() => {
    if (rafRef.current) return
    lastDrawRef.current = 0
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stopLoop = useCallback(() => {
    if (!rafRef.current) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  /* Build the offscreen WebGL canvas once. */
  useEffect(() => {
    const glCanvas = document.createElement('canvas')
    glCanvas.width = 640
    glCanvas.height = 480
    glCanvasRef.current = glCanvas
    try {
      rendererRef.current = createRenderer(glCanvas)
    } catch (err) {
      setError(err.message)
    }
    return () => {
      stopLoop()
      if (watchRef.current) clearInterval(watchRef.current)
      if (rendererRef.current) rendererRef.current.dispose()
      rendererRef.current = null
      if (audioRef.current) audioRef.current.dispose()
      audioRef.current = null
    }
  }, [stopLoop])

  /* Runs after every render so it also catches the first paint of the preview,
     when the canvas ref has only just been populated. Resizing a canvas clears
     it, hence the equality guard. */
  const { width, height } = config.output
  useEffect(() => {
    const out = canvasRef.current
    const glCanvas = glCanvasRef.current
    if (!out || !glCanvas || !width || !height) return
    if (out.width !== width || out.height !== height) {
      out.width = width
      out.height = height
      glCanvas.width = width
      glCanvas.height = height
    }
    if (!playing && !exportingRef.current) drawFrame()
  })

  const attachVideoEvents = useCallback(() => {
    const video = videoRef.current
    if (!video) return undefined

    const onLoaded = () => {
      setMeta({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      })
      drawFrame()
    }
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onPlay = () => {
      setPlaying(true)
      startLoop()
    }
    const onPause = () => {
      setPlaying(false)
      if (!exportingRef.current) stopLoop()
    }
    const onSeeked = () => {
      setCurrentTime(video.currentTime)
      drawFrame()
    }
    const onError = () => setError('That file could not be decoded. Try an MP4, MOV or WebM.')

    // The element can already be past loadedmetadata by the time this runs.
    if (video.readyState >= 1 && video.videoWidth) onLoaded()

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onPause)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onPause)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
  }, [drawFrame, startLoop, stopLoop])

  // Keyed on the source so listeners get attached when the preview mounts, not
  // just on the very first render when the video element does not exist yet.
  useEffect(() => attachVideoEvents(), [attachVideoEvents, config.videoUrl])

  /* Audio nodes follow the preset live so preview sounds like the export. */
  useEffect(() => {
    if (audioRef.current) audioRef.current.apply(config.audio)
  }, [config.audio])

  const ensureAudio = useCallback(async () => {
    const video = videoRef.current
    if (!video) return null
    if (audioRef.current) return audioRef.current
    try {
      const processor = await createAudioProcessor(video)
      processor.apply(configRef.current.audio)
      audioRef.current = processor
      return processor
    } catch {
      // Fall back to untouched audio rather than failing the whole export.
      return null
    }
  }, [])

  const play = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    const audio = await ensureAudio()
    if (audio) {
      await audio.resume()
      audio.setMonitoring(true)
    }
    const cfg = configRef.current
    if (video.currentTime < cfg.trim.start || video.currentTime >= cfg.trim.end - 0.05) {
      await seekTo(video, cfg.trim.start)
    }
    try {
      await video.play()
    } catch {
      setError('Playback was blocked. Tap the preview to start it.')
    }
  }, [ensureAudio])

  const pause = useCallback(() => {
    const video = videoRef.current
    if (video) video.pause()
  }, [])

  const seek = useCallback((time) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
    setCurrentTime(time)
  }, [])

  const startExport = useCallback(async () => {
    const video = videoRef.current
    const out = canvasRef.current
    const cfg = configRef.current
    if (!video || !out) return

    const mime = pickMimeType(cfg.container)
    if (!mime) {
      setExportState({ ...IDLE_EXPORT, status: 'error', error: 'This browser cannot record video. Try Chrome, Edge or Safari.' })
      return
    }

    setExportState({ ...IDLE_EXPORT, status: 'running' })
    cancelledRef.current = false
    chunksRef.current = []

    const audio = cfg.audio.enabled ? await ensureAudio() : null
    if (audio) {
      await audio.resume()
      audio.apply(cfg.audio)
      // Mute the speakers during the pass so the room does not fill with tape hiss.
      audio.setMonitoring(false)
    }

    video.pause()
    await seekTo(video, cfg.trim.start)
    drawFrame()

    let stream
    try {
      const canvasStream = out.captureStream(cfg.output.fps)
      const tracks = [...canvasStream.getVideoTracks()]
      if (audio) tracks.push(...audio.stream.getAudioTracks())
      stream = new MediaStream(tracks)
      streamRef.current = canvasStream
    } catch {
      setExportState({ ...IDLE_EXPORT, status: 'error', error: 'This browser cannot capture the canvas.' })
      return
    }

    let recorder
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: cfg.output.bitrate,
        audioBitsPerSecond: cfg.audio.bitrate,
      })
    } catch {
      setExportState({ ...IDLE_EXPORT, status: 'error', error: 'The recorder rejected these settings. Try a lower bitrate.' })
      return
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const tracks = streamRef.current ? streamRef.current.getTracks() : []
      tracks.forEach((track) => track.stop())
      streamRef.current = null
      if (audioRef.current) audioRef.current.setMonitoring(true)

      if (cancelledRef.current) {
        chunksRef.current = []
        setExportState(IDLE_EXPORT)
        return
      }
      const blob = new Blob(chunksRef.current, { type: mime })
      chunksRef.current = []
      if (!blob.size) {
        setExportState({ ...IDLE_EXPORT, status: 'error', error: 'Nothing was recorded. Try a different container in Output.' })
        return
      }
      setExportState({
        status: 'done',
        progress: 1,
        url: URL.createObjectURL(blob),
        size: blob.size,
        mime,
        extension: extensionForMime(mime),
        error: null,
      })
    }

    recorderRef.current = recorder
    exportingRef.current = true
    recorder.start(200)
    startLoop()

    try {
      await video.play()
    } catch {
      finishExport(true)
      setExportState({ ...IDLE_EXPORT, status: 'error', error: 'Playback was blocked, so nothing could be recorded.' })
      return
    }
    // Started only once playback is underway, so the stop check cannot fire early.
    watchRef.current = setInterval(exportWatch, 150)
  }, [drawFrame, ensureAudio, exportWatch, finishExport, startLoop])

  const cancelExport = useCallback(() => finishExport(true), [finishExport])

  const clearExport = useCallback(() => {
    setExportState((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url)
      return IDLE_EXPORT
    })
  }, [])

  const resetSource = useCallback(() => {
    stopLoop()
    exportingRef.current = false
    setMeta(null)
    setPlaying(false)
    setCurrentTime(0)
    setError(null)
    clearExport()
    if (audioRef.current) {
      audioRef.current.dispose()
      audioRef.current = null
    }
  }, [clearExport, stopLoop])

  return {
    videoRef,
    canvasRef,
    meta,
    playing,
    currentTime,
    exportState,
    error,
    play,
    pause,
    seek,
    startExport,
    cancelExport,
    clearExport,
    resetSource,
    drawFrame,
  }
}
