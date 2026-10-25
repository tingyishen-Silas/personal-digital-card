// A single full-screen WebGL pass that turns the garden painting into a lit, slightly
// three-dimensional canvas: depth parallax (Depth Anything V2 map), impasto relief and
// linen weave (Poly Haven "Rough Linen", CC0) under a warm studio lamp, a gallery
// spotlight for the hovered object and a few motes of dust in the sunlit air.

export const FOCUS_DEPTH = 0.4;

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vScreen;
void main() {
  vScreen = vec2(aPosition.x + 1.0, 1.0 - aPosition.y) * 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uPainting;
uniform sampler2D uDepth;
uniform sampler2D uLinen;
uniform vec2 uResolution;
uniform vec4 uCover;
uniform vec2 uTexel;
uniform vec2 uShift;
uniform float uFocusDepth;
uniform vec3 uLight;
uniform vec4 uSpot;
uniform float uSpotAmount;
uniform float uTime;
uniform float uDust;
varying vec2 vScreen;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 px = vScreen * uResolution;
  vec2 uv = (px - uCover.xy) / uCover.zw;

  // The frame itself stays put, so parallax never smears the screen edges.
  vec2 edge = min(px, uResolution - px);
  vec2 shift = uShift * smoothstep(0.0, 40.0, min(edge.x, edge.y));

  vec2 p = uv;
  for (int i = 0; i < 4; i++) {
    p = uv - shift * (texture2D(uDepth, p).r - uFocusDepth);
  }
  p = clamp(p, uTexel, 1.0 - uTexel);
  vec3 base = texture2D(uPainting, p).rgb;

  // Relief from the brushwork (sampled wide enough to follow strokes, not JPEG grain),
  // with the linen weave showing faintly through thinner paint.
  vec2 t = uTexel * 2.5;
  float hl = luma(texture2D(uPainting, p - vec2(t.x, 0.0)).rgb);
  float hr = luma(texture2D(uPainting, p + vec2(t.x, 0.0)).rgb);
  float hu = luma(texture2D(uPainting, p - vec2(0.0, t.y)).rgb);
  float hd = luma(texture2D(uPainting, p + vec2(0.0, t.y)).rgb);
  vec2 slope = vec2(hl - hr, hu - hd);
  vec3 weave = texture2D(uLinen, p * uCover.zw / 150.0).rgb * 2.0 - 1.0;
  weave.y = -weave.y;
  float thinPaint = 1.0 - clamp(length(slope) * 5.0, 0.0, 1.0);
  vec3 n = normalize(vec3(slope * 0.9 + weave.xy * (0.03 + 0.07 * thinPaint), 1.0));

  // Studio lamp: relief shading is relative to flat canvas so overall brightness holds.
  float size = max(uResolution.x, uResolution.y);
  vec3 toLight = vec3(uLight.xy - px, 0.5 * size);
  vec3 l = normalize(toLight);
  float reach = 1.0 / (1.0 + pow(length(toLight.xy) / (0.42 * size), 2.0));
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float glint = max(pow(max(dot(n, h), 0.0), 90.0) - pow(h.z, 90.0), 0.0);
  vec3 lamp = vec3(1.0, 0.86, 0.62);
  vec3 lit = base * (1.0 + (dot(n, l) - l.z) * (0.12 + 0.5 * reach * reach) * uLight.z);
  lit += lamp * (0.06 * reach + glint * 0.3 * reach * reach) * uLight.z;

  // Gallery spotlight on the hovered object.
  vec2 centre = uSpot.xy + uSpot.zw * 0.5;
  vec2 q = abs(px - centre) - uSpot.zw * 0.5 + 40.0;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 40.0;
  float inside = 1.0 - smoothstep(-30.0, 110.0, sd);
  lit *= mix(1.0, mix(0.84, 1.05, inside), uSpotAmount);

  // Dust drifting in the sunlit air; nearer layers move more with the parallax.
  float dust = 0.0;
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float cellSize = 70.0 + fl * 45.0;
    vec2 drift = vec2(sin(uTime * 0.07 + fl * 2.0) * 24.0, -uTime * (5.0 + fl * 3.5));
    vec2 gp = (px + drift - shift * uCover.zw * (0.5 + fl * 0.6)) / cellSize;
    vec2 cell = floor(gp);
    float rnd = hash(cell + fl * 19.0);
    vec2 pos = 0.25 + 0.5 * vec2(hash(cell + 3.1), hash(cell + 7.7));
    pos += 0.1 * vec2(sin(uTime * 0.45 + rnd * 6.28), cos(uTime * 0.35 + rnd * 6.28));
    float radius = (0.8 + fl * 0.75) / cellSize;
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.7 + rnd) + rnd * 6.28);
    dust += step(0.62, rnd) * smoothstep(radius * 2.4, 0.0, length(fract(gp) - pos)) * twinkle * (0.3 + 0.25 * fl);
  }
  float sunlit = smoothstep(0.42, 0.82, luma(base)) * (0.35 + 0.65 * reach);
  lit += vec3(1.0, 0.93, 0.78) * dust * sunlit * uDust * 0.55;

  gl_FragColor = vec4(lit, 1.0);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Living painting shader failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function uploadTexture(gl, unit, image, repeat) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (repeat) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  return texture;
}

// Returns null when WebGL is unavailable; the plain painting then simply stays.
export function createPaintingRenderer(canvas, { painting, depth, linen }) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return null;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const textures = [
    uploadTexture(gl, 0, painting, false),
    uploadTexture(gl, 1, depth, false),
    uploadTexture(gl, 2, linen, true),
  ];

  const uniform = (name) => gl.getUniformLocation(program, name);
  const u = Object.fromEntries([
    'uPainting', 'uDepth', 'uLinen', 'uResolution', 'uCover', 'uTexel', 'uShift', 'uFocusDepth',
    'uLight', 'uSpot', 'uSpotAmount', 'uTime', 'uDust',
  ].map((name) => [name, uniform(name)]));
  gl.uniform1i(u.uPainting, 0);
  gl.uniform1i(u.uDepth, 1);
  gl.uniform1i(u.uLinen, 2);
  gl.uniform2f(u.uTexel, 1 / painting.naturalWidth, 1 / painting.naturalHeight);
  gl.uniform1f(u.uFocusDepth, FOCUS_DEPTH);

  return {
    isLost: () => gl.isContextLost(),
    render({ width, height, dpr, cover, shift, light, spot, spotAmount, time, dust }) {
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.uniform2f(u.uResolution, width, height);
      gl.uniform4f(u.uCover, cover.offsetX, cover.offsetY, cover.renderWidth, cover.renderHeight);
      gl.uniform2f(u.uShift, shift.x, shift.y);
      gl.uniform3f(u.uLight, light.x, light.y, light.strength);
      gl.uniform4f(u.uSpot, spot.left, spot.top, spot.width, spot.height);
      gl.uniform1f(u.uSpotAmount, spotAmount);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uDust, dust);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      textures.forEach((texture) => gl.deleteTexture(texture));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}

// Reads the depth map on the CPU so DOM hotspots can ride along with the parallax.
export function createDepthSampler(depthImage, width = 96, height = 54) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(depthImage, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  return (u, v) => {
    const x = Math.max(0, Math.min(width - 1, Math.round(u * (width - 1))));
    const y = Math.max(0, Math.min(height - 1, Math.round(v * (height - 1))));
    return data[(y * width + x) * 4] / 255;
  };
}

// Eases a value toward its target independent of frame rate.
export function approach(current, target, rate, deltaSeconds) {
  return target + (current - target) * Math.exp(-rate * deltaSeconds);
}

// Pointer position (0..1 across the screen) to a parallax shift in painting UV units.
// Looking from the right brings the far garden right and the near tables left.
export function getParallaxShift(pointerX, pointerY, strength) {
  return { x: -(pointerX - 0.5) * 2 * strength, y: -(pointerY - 0.5) * 2 * strength * 0.6 };
}
