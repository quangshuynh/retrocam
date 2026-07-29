/**
 * WebGL renderer that applies the retro camera look to a video frame.
 *
 * Everything happens in a single fragment shader pass so that even a phone can
 * keep up at 30fps. The renderer owns its own canvas sized to the target
 * resolution of the active preset, which is what actually downscales the video.
 */

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  // Flip Y here so texture row 0 (top of the frame) lands at the top of the canvas.
  vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;

uniform sampler2D uTex;
uniform vec2 uOutSize;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
uniform float uTime;

uniform float uSoftness;
uniform float uSharpen;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uGamma;
uniform float uTemperature;
uniform float uTint;
uniform float uGrain;
uniform float uGrainSize;
uniform float uChroma;
uniform float uBleed;
uniform float uJitter;
uniform float uVignette;
uniform float uScanline;
uniform float uPosterize;
uniform float uBloom;
uniform float uDistort;
uniform float uMono;
uniform float uPalette;
uniform float uDropout;

const vec3 LUMA = vec3(0.299, 0.587, 0.114);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/* Samples the source texture, returning black outside the frame so that
   letterboxing falls out of the uv transform for free. */
vec3 fetch(vec2 uv) {
  vec2 s = uv * uUvScale + uUvOffset;
  float inside = step(abs(s.x - 0.5), 0.5) * step(abs(s.y - 0.5), 0.5);
  return texture2D(uTex, clamp(s, 0.0, 1.0)).rgb * inside;
}

/* Nine tap blur used for softness, unsharp masking and the bloom bright pass. */
vec3 blurAt(vec2 uv, float radius) {
  vec2 t = radius / uOutSize;
  vec3 sum = fetch(uv) * 0.25;
  sum += fetch(uv + vec2(t.x, 0.0)) * 0.125;
  sum += fetch(uv - vec2(t.x, 0.0)) * 0.125;
  sum += fetch(uv + vec2(0.0, t.y)) * 0.125;
  sum += fetch(uv - vec2(0.0, t.y)) * 0.125;
  sum += fetch(uv + t * 0.7071) * 0.0625;
  sum += fetch(uv - t * 0.7071) * 0.0625;
  sum += fetch(uv + vec2(t.x, -t.y) * 0.7071) * 0.0625;
  sum += fetch(uv + vec2(-t.x, t.y) * 0.7071) * 0.0625;
  return sum;
}

/* Trailing horizontal smear, the signature of analogue tape chroma. */
vec3 smearLeft(vec2 uv, float amount) {
  vec3 acc = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    float f = float(i);
    float w = 1.0 - f / 8.0;
    acc += fetch(uv - vec2(f * amount * 3.0 / uOutSize.x, 0.0)) * w;
    total += w;
  }
  return acc / total;
}

void main() {
  vec2 uv = vUv;

  if (abs(uDistort) > 0.001) {
    vec2 c = uv - 0.5;
    c *= 1.0 + uDistort * dot(c, c) * 2.0;
    uv = c + 0.5;
  }

  if (uJitter > 0.001) {
    float line = floor(uv.y * uOutSize.y);
    float n = hash(vec2(line, floor(uTime * 24.0)));
    float burst = step(0.985, hash(vec2(line * 0.31, floor(uTime * 8.0))));
    uv.x += (n - 0.5) * uJitter * 0.012 + burst * (n - 0.5) * uJitter * 0.06;
  }

  vec3 sharp = fetch(uv);
  vec3 blurred = blurAt(uv, max(uSoftness, 1.0));
  vec3 col = mix(sharp, blurred, clamp(uSoftness, 0.0, 1.0));
  col += (sharp - blurred) * uSharpen;

  if (uChroma > 0.001) {
    float o = uChroma / uOutSize.x;
    col.r = fetch(uv + vec2(o, 0.0)).r;
    col.b = fetch(uv - vec2(o, 0.0)).b;
  }

  if (uBleed > 0.001) {
    vec3 sm = smearLeft(uv, uBleed);
    float luma = dot(col, LUMA);
    vec3 chroma = sm - dot(sm, LUMA);
    col = mix(col, vec3(luma) + chroma, clamp(uBleed, 0.0, 1.0));
  }

  if (uBloom > 0.001) {
    col += max(blurred - 0.62, 0.0) * uBloom * 1.6;
  }

  col += uBrightness;
  col = (col - 0.5) * uContrast + 0.5;
  col = pow(max(col, 0.0), vec3(1.0 / uGamma));

  col.r *= 1.0 + uTemperature * 0.14;
  col.b *= 1.0 - uTemperature * 0.14;
  col.g *= 1.0 + uTint * 0.1;

  float lum = dot(col, LUMA);
  col = mix(vec3(lum), col, uSaturation);
  col = mix(col, vec3(dot(col, LUMA)), uMono);

  if (uPosterize > 1.5) {
    col += (hash(floor(gl_FragCoord.xy)) - 0.5) / uPosterize;
    col = floor(clamp(col, 0.0, 1.0) * uPosterize + 0.5) / uPosterize;
  }

  if (uPalette > 0.5) {
    float g = floor(clamp(dot(col, LUMA), 0.0, 0.999) * 4.0) / 3.0;
    vec3 pal = vec3(0.06, 0.22, 0.06);
    pal = mix(pal, vec3(0.19, 0.38, 0.19), step(0.3, g));
    pal = mix(pal, vec3(0.55, 0.67, 0.06), step(0.6, g));
    pal = mix(pal, vec3(0.61, 0.74, 0.06), step(0.9, g));
    col = mix(col, pal, uPalette);
  }

  if (uDropout > 0.001) {
    float band = floor(vUv.y * uOutSize.y * 0.5);
    float n = hash(vec2(band, floor(uTime * 6.0)));
    float active = step(1.0 - uDropout * 0.05, n);
    float x = hash(vec2(band + 3.7, floor(uTime * 6.0)));
    col += active * smoothstep(0.07, 0.0, abs(vUv.x - x)) * 0.7;
  }

  if (uScanline > 0.001) {
    float odd = mod(floor(vUv.y * uOutSize.y), 2.0);
    col *= mix(1.0, 1.0 - uScanline * 0.35, odd);
  }

  if (uGrain > 0.001) {
    vec2 gp = floor(gl_FragCoord.xy / max(uGrainSize, 1.0));
    float n = hash(gp + vec2(uTime * 60.0, uTime * 37.0));
    // Real sensor noise is far more visible in the shadows.
    float boost = mix(1.0, 1.7, 1.0 - clamp(dot(col, LUMA), 0.0, 1.0));
    col += (n - 0.5) * uGrain * 0.35 * boost;
  }

  if (uVignette > 0.001) {
    vec2 c = vUv - 0.5;
    col *= clamp(1.0 - dot(c, c) * uVignette * 1.7, 0.0, 1.0);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error('Shader failed to compile: ' + log)
  }
  return shader
}

function buildProgram(gl) {
  const program = gl.createProgram()
  const vert = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error('Shader program failed to link: ' + log)
  }
  return program
}

/**
 * Works out how to map the source frame onto an output of a different aspect
 * ratio. Returns uv scale and offset consumed by the fragment shader.
 */
export function computeFit(srcWidth, srcHeight, outWidth, outHeight, mode) {
  if (!srcWidth || !srcHeight || !outWidth || !outHeight) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 }
  }
  const ratio = (srcWidth / srcHeight) / (outWidth / outHeight)
  let scaleX = 1
  let scaleY = 1
  if (mode === 'contain') {
    if (ratio > 1) scaleY = ratio
    else scaleX = 1 / ratio
  } else if (mode !== 'stretch') {
    if (ratio > 1) scaleX = 1 / ratio
    else scaleY = ratio
  }
  return {
    scaleX,
    scaleY,
    offsetX: (1 - scaleX) / 2,
    offsetY: (1 - scaleY) / 2,
  }
}

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    // Needed so the composite canvas can drawImage this canvas after the fact.
    preserveDrawingBuffer: true,
  })
  if (!gl) throw new Error('WebGL is not available in this browser.')

  const program = buildProgram(gl)
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  // A single oversized triangle covers the viewport with less overhead than a quad.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aPosition = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(aPosition)
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  const locations = new Map()
  function loc(name) {
    if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name))
    return locations.get(name)
  }

  function render(source, look, view) {
    const width = canvas.width
    const height = canvas.height
    if (!width || !height) return false

    gl.viewport(0, 0, width, height)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    } catch {
      // Happens if the frame is not decodable yet. Skip and try again next tick.
      return false
    }

    const fit = computeFit(view.srcWidth, view.srcHeight, width, height, view.fit)
    gl.uniform2f(loc('uOutSize'), width, height)
    gl.uniform2f(loc('uUvScale'), fit.scaleX, fit.scaleY)
    gl.uniform2f(loc('uUvOffset'), fit.offsetX, fit.offsetY)
    // Wrapped so the hash noise keeps its precision on long clips.
    gl.uniform1f(loc('uTime'), view.time % 120)

    gl.uniform1f(loc('uSoftness'), look.softness)
    gl.uniform1f(loc('uSharpen'), look.sharpen)
    gl.uniform1f(loc('uBrightness'), look.brightness)
    gl.uniform1f(loc('uContrast'), look.contrast)
    gl.uniform1f(loc('uSaturation'), look.saturation)
    gl.uniform1f(loc('uGamma'), look.gamma)
    gl.uniform1f(loc('uTemperature'), look.temperature)
    gl.uniform1f(loc('uTint'), look.tint)
    gl.uniform1f(loc('uGrain'), look.grain)
    gl.uniform1f(loc('uGrainSize'), look.grainSize)
    gl.uniform1f(loc('uChroma'), look.chroma)
    gl.uniform1f(loc('uBleed'), look.bleed)
    gl.uniform1f(loc('uJitter'), look.jitter)
    gl.uniform1f(loc('uVignette'), look.vignette)
    gl.uniform1f(loc('uScanline'), look.scanline)
    gl.uniform1f(loc('uPosterize'), look.posterize)
    gl.uniform1f(loc('uBloom'), look.bloom)
    gl.uniform1f(loc('uDistort'), look.distort)
    gl.uniform1f(loc('uMono'), look.mono)
    gl.uniform1f(loc('uPalette'), look.palette)
    gl.uniform1f(loc('uDropout'), look.dropout)

    gl.drawArrays(gl.TRIANGLES, 0, 3)
    return true
  }

  function dispose() {
    gl.deleteTexture(texture)
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    const ext = gl.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
  }

  return { render, dispose }
}
