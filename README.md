# retrocam

Run a video through an old camera, in the browser. Upload a clip, pick something
like an iPhone 4, a Sony Cyber-shot W550 or a VHS-C camcorder, and retrocam
matches that camera's resolution, frame rate, colour, grain, compression and
audio character. Preview it, then download the result.

Nothing is uploaded. The video never leaves the device.

Live at https://quangshuynh.github.io/retrocam/

## Presets

| Preset | Year | Resolution | Notes |
| --- | --- | --- | --- |
| Untouched | | native | Passthrough, a base for custom looks |
| iPhone 3GS | 2009 | 640x480 | Soft optics, warm cast |
| iPhone 4 | 2010 | 1280x720 | Cleaner, still soft |
| iPhone 5 | 2012 | 1920x1080 | Sharp, cool, near neutral |
| RAZR V3 | 2004 | 176x144 at 15fps | Blocky and smeared |
| Nokia N95 | 2007 | 640x480 | Oversharpened, noisy |
| Cyber-shot W550 | 2005 | 640x480 | CCD grain, orange date stamp |
| PowerShot A70 | 2003 | 320x240 at 15fps | Heavy grain, crushed shadows |
| Flip Mino HD | 2009 | 1280x720 | Contrasty pocket camcorder |
| Hi8 Handycam | 1995 | 640x480 | Chroma smear, scanlines, clock |
| VHS-C | 1989 | 640x480 | Tracking wobble, dropouts, hiss |
| MiniDV | 1998 | 720x480 | Flat consumer DV colour |
| HD HERO | 2010 | 1280x720 | Barrel distortion, saturated |
| Desk Webcam | 2004 | 320x240 at 15fps | Washed out and noisy |
| Game Boy Camera | 1998 | 128x112 at 12fps | Four shades of green, silent |

Every preset is a starting point. The sliders under Picture, Noise, Output,
Audio and Date stamp override anything, and Reset preset puts it back.

## How it works

There is no ffmpeg and no WebAssembly. GitHub Pages cannot send the cross origin
isolation headers that multithreaded ffmpeg.wasm needs, and the single threaded
build is a large download that struggles on phones. So the whole pipeline is
native browser APIs:

1. The uploaded file becomes an object URL on a hidden `<video>` element.
2. Each frame is uploaded to a WebGL texture and run through one fragment
   shader that does the downscale, colour grading, grain, chroma bleed,
   scanlines, banding, vignette and lens distortion in a single pass.
   See [src/lib/renderer.js](src/lib/renderer.js).
3. The result is composited onto a 2D canvas, where any date stamp or
   viewfinder overlay is burned in on top.
   See [src/lib/overlay.js](src/lib/overlay.js).
4. Audio runs through a WebAudio chain: filters, a sample rate and bit depth
   crusher in an AudioWorklet, saturation, tape hiss and a wow and flutter
   delay. See [src/lib/audio.js](src/lib/audio.js).
5. `canvas.captureStream()` and the processed audio feed a `MediaRecorder`,
   which encodes to MP4 where supported and WebM otherwise.

Because `MediaRecorder` encodes a live stream, rendering happens in realtime: a
30 second clip takes 30 seconds. That is what the trim control is for. Keep the
tab visible while it records, since browsers stop painting background tabs.

## Running it

```bash
npm install
```

```bash
npm run dev
```

The dev server serves the app under the `/retrocam/` base path, so open the URL
that Vite prints rather than the bare host.

Other scripts:

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run lint
```

## Deploying

Pushing to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml),
which builds and publishes to GitHub Pages. Enable it once under Settings,
Pages, Source, GitHub Actions.

To publish by hand instead:

```bash
npm run deploy
```

That builds and pushes `dist` to the `gh-pages` branch. If you fork this, change
`base` in [vite.config.js](vite.config.js) to match your repository name or the
assets will 404.

## Browser support

Needs WebGL, `canvas.captureStream` and `MediaRecorder`. Chrome, Edge, Firefox
and Safari 15 and newer all work. MP4 output depends on the browser being able
to mux it, and retrocam falls back to WebM automatically. The bit crusher needs
AudioWorklet and is skipped if unavailable, leaving the rest of the audio chain
intact.
