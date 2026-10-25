import { useEffect, useRef } from 'react';
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MirroredRepeatWrapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';
import { assetPath } from '../../assetPath';
import {
  FIELD_OF_VIEW,
  REFERENCE_DISTANCE,
  SEPARATION,
  STILL_DEPTH,
  TERRACE_RELIEF,
  TERRACE_SOFTNESS,
  TERRACES,
  getCameraPose,
  getFlatFraming,
  getLayerDistance,
  getPaintingPoint,
  getTerraceDepth,
} from '../../diorama';
import { approach } from '../../livingPainting';

const DEPTH_SRC = assetPath('/scene-depth.jpg');
// The sheet runs past the painting (mirrored) so turning never shows its edge.
const MARGIN = 0.15;
const SEGMENTS = [480, 270];
// Card edges are smoothed over about this many mesh cells, so diagonal cuts don't turn into stairs.
const EDGE_CELLS = 1.6;
const PAPER = [0.93, 0.87, 0.76];

const TERRACE_GLSL = `
uniform sampler2D uDepth;
uniform vec4 uStarts;
uniform vec4 uLevels;
float terrace(vec2 uv) {
  float d = texture2D(uDepth, uv).r;
  float level = uLevels.x;
  level += (uLevels.y - uLevels.x) * smoothstep(uStarts.y - ${TERRACE_SOFTNESS}, uStarts.y + ${TERRACE_SOFTNESS}, d);
  level += (uLevels.z - uLevels.y) * smoothstep(uStarts.z - ${TERRACE_SOFTNESS}, uStarts.z + ${TERRACE_SOFTNESS}, d);
  level += (uLevels.w - uLevels.z) * smoothstep(uStarts.w - ${TERRACE_SOFTNESS}, uStarts.w + ${TERRACE_SOFTNESS}, d);
  return level + ${TERRACE_RELIEF} * (d - level);
}`;

const REF = REFERENCE_DISTANCE.toFixed(1);

const VERTEX_SHADER = `
${TERRACE_GLSL}
uniform sampler2D uMap;
uniform vec4 uFrame;
uniform float uSpread;
varying vec2 vUv;
varying float vTerrace;
varying float vSide;
varying vec3 vNormal;
varying vec3 vSoft;
const vec2 CELL = vec2(${((1 + 2 * MARGIN) / SEGMENTS[0]).toFixed(6)}, ${((1 + 2 * MARGIN) / SEGMENTS[1]).toFixed(6)}) * ${EDGE_CELLS.toFixed(2)};
float smoothTerrace(vec2 uv) {
  float sum = terrace(uv) * 4.0;
  sum += (terrace(uv + vec2(CELL.x, 0.0)) + terrace(uv - vec2(CELL.x, 0.0)) + terrace(uv + vec2(0.0, CELL.y)) + terrace(uv - vec2(0.0, CELL.y))) * 2.0;
  sum += terrace(uv + CELL) + terrace(uv - CELL) + terrace(uv + vec2(CELL.x, -CELL.y)) + terrace(uv - vec2(CELL.x, -CELL.y));
  return sum / 16.0;
}
void main() {
  // Painting UV (0..1, v up as three loads it), extended past the edges by the margin.
  vec2 paintUv = mix(vec2(-${MARGIN}), vec2(1.0 + ${MARGIN}), uv);
  float level = smoothTerrace(paintUv);
  float dist = ${REF} * (1.0 + ${SEPARATION} * uSpread * (${STILL_DEPTH} - level));
  vec3 flatPoint = vec3(uFrame.x + (paintUv.x - 0.5) * uFrame.z, uFrame.y + (paintUv.y - 0.5) * uFrame.w, -${REF});
  vec3 world = flatPoint * (dist / ${REF});

  // Slope of the card surface, per vertex so edge shading stays smooth across triangles.
  vec2 gradient = vec2(
    smoothTerrace(paintUv + vec2(CELL.x, 0.0)) - smoothTerrace(paintUv - vec2(CELL.x, 0.0)),
    smoothTerrace(paintUv + vec2(0.0, CELL.y)) - smoothTerrace(paintUv - vec2(0.0, CELL.y))
  ) / (2.0 * CELL);
  vec2 worldSlope = gradient * ${REF} * ${SEPARATION} * max(uSpread, 0.001) / uFrame.zw;
  vNormal = normalize(vec3(-worldSlope, 1.0));
  vSide = smoothstep(0.6, 2.4, length(gradient) * 0.01 * uFrame.z);
  vSoft = textureLod(uMap, paintUv, 5.0).rgb;
  vUv = paintUv;
  vTerrace = level;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAGMENT_SHADER = `
${TERRACE_GLSL}
uniform sampler2D uMap;
uniform float uSpread;
uniform vec2 uTowardLight;
uniform vec3 uLight;
uniform vec3 uPaper;
varying vec2 vUv;
varying float vTerrace;
varying float vSide;
varying vec3 vNormal;
varying vec3 vSoft;
void main() {
  vec3 rgb = texture2D(uMap, vUv).rgb;

  // Soft shadow from nearer cards, cast away from the lamp.
  float here = terrace(vUv);
  float shade = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 jitter = vec2(cos(fi * 2.4), sin(fi * 2.4)) * 0.004 * fi;
    float nearer = terrace(vUv + uTowardLight * (0.6 + fi * 0.18) + jitter);
    shade += smoothstep(0.03, 0.14, nearer - here);
  }
  rgb *= 1.0 - 0.38 * (shade / 5.0) * uSpread;

  // Card edges: the paint softened into a warm shadow, lifted where they face the lamp.
  float lit = max(dot(normalize(vNormal), normalize(uLight)), 0.0);
  vec3 edge = vSoft * mix(0.5, 1.0, lit) * vec3(1.0, 0.94, 0.86);
  rgb = mix(rgb, edge, vSide * uSpread);

  // Far cards sit in a little warm air.
  rgb = mix(rgb, uPaper, (1.0 - smoothstep(0.05, 0.4, vTerrace)) * 0.1 * uSpread);
  gl_FragColor = vec4(rgb, 1.0);
  #include <colorspace_fragment>
}`;

function loadTexture(src) {
  return new Promise((resolve, reject) => {
    new TextureLoader().load(src, resolve, undefined, reject);
  });
}

// Paper-theatre diorama of the garden painting. Starts identical to the flat painting, then
// pushes its cards apart; the camera turns from drags and keys (orbitRef) and, on desktop,
// leans a little with the cursor. Hotspots are re-projected onto their card every frame.
function DioramaView({ open, paused, imageRef, getLayout, orbitRef, wakeRef, hotspots, onProjectHotspots, onReady, onClosed, onError }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({});

  // Live props for the render loop, which is set up once per visit.
  useEffect(() => {
    Object.assign(stateRef.current, { open, paused, getLayout, hotspots, onProjectHotspots, onReady, onClosed });
    stateRef.current.wake?.();
  }, [getLayout, hotspots, onClosed, onProjectHotspots, onReady, open, paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let renderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch {
      onError?.();
      return undefined;
    }
    renderer.setClearColor(0x2a241d, 1);
    const scene = new Scene();
    const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 100);
    camera.rotation.order = 'YXZ';
    const geometry = new PlaneGeometry(1, 1, SEGMENTS[0], SEGMENTS[1]);
    const pointer = { x: 0.5, y: 0.35, has: false };
    const current = { yaw: 0, pitch: 0, spread: 0, lightX: -0.3, lightY: 0.55 };
    const projected = new Vector3();
    let material = null;
    let textures = [];
    let disposed = false;
    let frameId = 0;
    let lastFrame = performance.now();
    let lastSize = '';
    let reported = false;

    const handlePointerMove = (event) => {
      pointer.x = event.clientX / window.innerWidth;
      pointer.y = event.clientY / window.innerHeight;
      pointer.has = true;
      stateRef.current.wake?.();
    };

    const projectHotspots = (viewport, framing) => {
      const rects = {};
      stateRef.current.hotspots.forEach(({ id, bounds, depth }) => {
        const distance = getLayerDistance(getTerraceDepth(depth), current.spread);
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        [[bounds.x1, bounds.y1], [bounds.x2, bounds.y1], [bounds.x1, bounds.y2], [bounds.x2, bounds.y2]].forEach(([bx, by]) => {
          const point = getPaintingPoint(framing, bx / 100, by / 100, distance);
          projected.set(point.x, point.y, point.z).project(camera);
          const sx = ((projected.x + 1) / 2) * viewport.width;
          const sy = ((1 - projected.y) / 2) * viewport.height;
          minX = Math.min(minX, sx);
          minY = Math.min(minY, sy);
          maxX = Math.max(maxX, sx);
          maxY = Math.max(maxY, sy);
        });
        rects[id] = { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
      });
      stateRef.current.onProjectHotspots(rects);
    };

    const tick = (now) => {
      frameId = 0;
      if (disposed || stateRef.current.paused || !material) return;
      const layout = stateRef.current.getLayout();
      if (!layout) return;
      const delta = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const isOpen = stateRef.current.open;
      const target = isOpen ? orbitRef.current : { yaw: 0, pitch: 0 };
      const lean = isOpen && finePointer && pointer.has && !reducedMotion
        ? { yaw: (0.5 - pointer.x) * 5, pitch: (pointer.y - 0.5) * 2.5 }
        : { yaw: 0, pitch: 0 };
      const rate = reducedMotion ? 40 : 4.5;
      const before = { ...current };
      current.yaw = approach(current.yaw, target.yaw + lean.yaw, rate, delta);
      current.pitch = approach(current.pitch, target.pitch + lean.pitch, rate, delta);
      current.spread = approach(current.spread, isOpen ? 1 : 0, reducedMotion ? 40 : 3.2, delta);
      current.lightX = approach(current.lightX, finePointer && pointer.has ? (pointer.x - 0.5) * 1.6 : -0.3, 5, delta);
      current.lightY = approach(current.lightY, finePointer && pointer.has ? (0.5 - pointer.y) * 1.6 : 0.55, 5, delta);
      const settled = !isOpen && current.spread < 0.01 && Math.abs(current.yaw) < 0.05 && Math.abs(current.pitch) < 0.05;
      if (settled) Object.assign(current, { yaw: 0, pitch: 0, spread: 0 });

      const viewport = { width: layout.width, height: layout.height };
      const size = `${viewport.width}x${viewport.height}`;
      if (size !== lastSize) {
        lastSize = size;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setSize(viewport.width, viewport.height, false);
        camera.aspect = viewport.width / viewport.height;
        camera.updateProjectionMatrix();
      }

      const framing = getFlatFraming(viewport, layout.cover);
      const { uniforms } = material;
      uniforms.uFrame.value.set(framing.x, framing.y, framing.width, framing.height);
      uniforms.uSpread.value = current.spread;
      uniforms.uTowardLight.value.set(current.lightX * 0.035, current.lightY * 0.035);
      uniforms.uLight.value.set(current.lightX, current.lightY, 0.8);
      const pose = getCameraPose(framing, current);
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      camera.rotation.set(pose.rotation.pitch, pose.rotation.yaw, 0);
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      projectHotspots(viewport, framing);

      if (!reported) {
        reported = true;
        canvas.classList.add('is-ready');
        stateRef.current.onReady?.();
      }
      if (settled) {
        stateRef.current.onClosed?.();
        return;
      }

      const moving = ['yaw', 'pitch', 'spread', 'lightX', 'lightY'].some((key) => Math.abs(current[key] - before[key]) > 0.0004);
      if (moving || !isOpen) frameId = window.requestAnimationFrame(tick);
    };

    // Render on demand: only while something is still easing toward its target.
    stateRef.current.wake = () => {
      if (!frameId && !disposed) {
        lastFrame = performance.now();
        frameId = window.requestAnimationFrame(tick);
      }
    };
    if (wakeRef) wakeRef.current = () => stateRef.current.wake?.();

    loadTexture(DEPTH_SRC).then((depth) => {
      const image = imageRef.current;
      if (disposed || !image?.naturalWidth) return;
      depth.wrapS = MirroredRepeatWrapping;
      depth.wrapT = MirroredRepeatWrapping;
      depth.minFilter = LinearFilter;
      depth.generateMipmaps = false;
      const map = new Texture(image);
      map.colorSpace = SRGBColorSpace;
      map.wrapS = MirroredRepeatWrapping;
      map.wrapT = MirroredRepeatWrapping;
      map.minFilter = LinearMipmapLinearFilter;
      map.anisotropy = 8;
      map.needsUpdate = true;
      textures = [depth, map];
      material = new ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uMap: { value: map },
          uDepth: { value: depth },
          uStarts: { value: new Vector4(...TERRACES.map(({ start }) => start)) },
          uLevels: { value: new Vector4(...TERRACES.map(({ depth: level }) => level)) },
          uFrame: { value: new Vector4() },
          uSpread: { value: 0 },
          uTowardLight: { value: new Vector2() },
          uLight: { value: new Vector3(-0.3, 0.55, 0.8) },
          uPaper: { value: new Vector3(...PAPER) },
        },
      });
      const mesh = new Mesh(geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);
      stateRef.current.wake();
    }).catch(() => onError?.());

    const handleResize = () => stateRef.current.wake?.();
    window.addEventListener('resize', handleResize);
    if (finePointer) window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      material?.dispose();
      textures.forEach((texture) => texture.dispose());
      geometry.dispose();
      renderer.dispose();
      stateRef.current.wake = null;
      if (wakeRef) wakeRef.current = null;
    };
  // Set up once per visit to the diorama; live values flow through refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="diorama-view absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export default DioramaView;
