import { useEffect, useRef } from 'react';
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  TextureLoader,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { assetPath } from '../../assetPath';
import {
  ARM,
  ARM_REST_ANGLE,
  CABINET,
  DECK_HEIGHT,
  HORN,
  LABEL_RADIUS,
  PLAYING_SPEED,
  RECORD_RADIUS,
  getArmAngleForRadius,
  getGrooveRadius,
  getHornRadius,
} from '../../gramophone';
import { approach } from '../../livingPainting';

const ASSETS = assetPath('/gramophone/');
const TARGET = new Vector3(0, 1.85, 0);
const ELEVATION = 0.62;
const IDLE_SWAY = 0.32;

function hornGeometry(radial = 72, along = 56) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= along; i += 1) {
    const t = i / along;
    for (let j = 0; j <= radial; j += 1) {
      const theta = (j / radial) * Math.PI * 2;
      const radius = getHornRadius(t, theta);
      positions.push(radius * Math.cos(theta), t * HORN.length, radius * Math.sin(theta));
      uvs.push(j / radial, t);
    }
  }
  for (let i = 0; i < along; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Concentric grooves as a roughness map: alternating glossy and matte rings catch the light.
function grooveTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const centre = size / 2;
  for (let r = centre; r > 0; r -= 1) {
    const inGrooves = r > centre * 0.38 && r < centre * 0.97;
    const band = Math.sin(r * 2.1) * 0.5 + 0.5;
    const value = inGrooves ? 60 + band * 70 + (Math.sin(r * 0.21) > 0.96 ? 60 : 0) : 30;
    context.fillStyle = `rgb(${value}, ${value}, ${value})`;
    context.beginPath();
    context.arc(centre, centre, r, 0, Math.PI * 2);
    context.fill();
  }
  return new CanvasTexture(canvas);
}

function buildGramophone(materials) {
  const root = new Group();
  const shadowed = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Cabinet on a slightly larger plinth, with a brass crank on the right.
  const plinth = shadowed(new Mesh(new RoundedBoxGeometry(CABINET.width + 0.36, CABINET.plinth, CABINET.depth + 0.36, 3, 0.06), materials.wood));
  plinth.position.y = CABINET.plinth / 2;
  const cabinet = shadowed(new Mesh(new RoundedBoxGeometry(CABINET.width, CABINET.height, CABINET.depth, 4, 0.1), materials.wood));
  cabinet.position.y = CABINET.plinth + CABINET.height / 2;
  const crankAxle = shadowed(new Mesh(new CylinderGeometry(0.06, 0.06, 0.32, 16), materials.brass));
  crankAxle.rotation.z = Math.PI / 2;
  crankAxle.position.set(CABINET.width / 2 + 0.16, CABINET.plinth + CABINET.height * 0.55, 0.5);
  const crankArm = shadowed(new Mesh(new CylinderGeometry(0.035, 0.035, 0.5, 12), materials.brass));
  crankArm.position.set(CABINET.width / 2 + 0.32, CABINET.plinth + CABINET.height * 0.55 - 0.22, 0.5);
  const crankKnob = shadowed(new Mesh(new CylinderGeometry(0.07, 0.07, 0.22, 16), materials.knob));
  crankKnob.rotation.z = Math.PI / 2;
  crankKnob.position.set(CABINET.width / 2 + 0.43, CABINET.plinth + CABINET.height * 0.55 - 0.45, 0.5);
  const badge = new Mesh(new CircleGeometry(0.16, 32), materials.brass);
  badge.position.set(0, CABINET.plinth + CABINET.height * 0.5, CABINET.depth / 2 + 0.001);
  root.add(plinth, cabinet, crankAxle, crankArm, crankKnob, badge);

  // Felt platter, record and label spin together.
  const platter = new Group();
  platter.position.y = DECK_HEIGHT;
  const felt = shadowed(new Mesh(new CylinderGeometry(RECORD_RADIUS + 0.06, RECORD_RADIUS + 0.06, 0.06, 72), materials.felt));
  felt.position.y = 0.03;
  const record = shadowed(new Mesh(new CylinderGeometry(RECORD_RADIUS, RECORD_RADIUS, 0.025, 96), [materials.vinylEdge, materials.vinyl, materials.vinyl]));
  record.position.y = 0.075;
  const label = new Mesh(new CircleGeometry(LABEL_RADIUS, 64), materials.label);
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.0885;
  const spindle = shadowed(new Mesh(new CylinderGeometry(0.035, 0.035, 0.12, 16), materials.brass));
  spindle.position.y = 0.12;
  platter.add(felt, record, label, spindle);
  root.add(platter);

  // Tone arm: a brass pillar at the back right, an arm that swings over the record and a sound box.
  const pillar = shadowed(new Mesh(new CylinderGeometry(0.13, 0.17, 0.32, 24), materials.brass));
  pillar.position.set(ARM.pivot.x, DECK_HEIGHT + 0.16, ARM.pivot.z);
  root.add(pillar);
  const arm = new Group();
  arm.position.set(ARM.pivot.x, DECK_HEIGHT + 0.3, ARM.pivot.z);
  const tube = shadowed(new Mesh(new CylinderGeometry(0.055, 0.075, ARM.length - 0.12, 20), materials.brass));
  tube.rotation.z = -Math.PI / 2;
  tube.position.x = (ARM.length - 0.12) / 2;
  const soundBox = shadowed(new Mesh(new CylinderGeometry(0.22, 0.22, 0.08, 40), materials.nickel));
  soundBox.rotation.z = Math.PI / 2;
  soundBox.position.set(ARM.length - 0.04, -0.08, 0);
  const needle = new Mesh(new CylinderGeometry(0.008, 0.004, 0.14, 8), materials.nickel);
  needle.position.set(ARM.length, -0.17, 0);
  arm.add(tube, soundBox, needle);
  root.add(arm);

  // Horn: a curved neck rising from the pillar, then the flared bell facing front-left.
  const throat = new Vector3(ARM.pivot.x + 0.25, DECK_HEIGHT + 1.15, ARM.pivot.z - 0.35);
  const axis = new Vector3(-0.42, 0.5, 0.76).normalize();
  const neckCurve = new CatmullRomCurve3([
    new Vector3(ARM.pivot.x, DECK_HEIGHT + 0.3, ARM.pivot.z),
    new Vector3(ARM.pivot.x + 0.32, DECK_HEIGHT + 0.55, ARM.pivot.z - 0.32),
    new Vector3(ARM.pivot.x + 0.38, DECK_HEIGHT + 0.9, ARM.pivot.z - 0.45),
    throat,
  ]);
  const neck = shadowed(new Mesh(new TubeGeometry(neckCurve, 48, HORN.throat, 20, false), materials.brass));
  const horn = shadowed(new Mesh(hornGeometry(), materials.horn));
  horn.position.copy(throat).addScaledVector(axis, -0.04);
  horn.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis));
  root.add(neck, horn);

  return { root, platter, arm, record, label };
}

// A modelled gramophone in the record player window: the record spins with the music, the
// tone arm drops onto it and tracks inward as the song plays, the cover is the label.
// Drag to turn it; click the record to play or pause.
function GramophoneScene({ player, onReady, onError }) {
  const canvasRef = useRef(null);
  const playerRef = useRef(player);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas.parentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      onError?.();
      return undefined;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.5, 60);
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const disposables = [];
    const track = (item) => {
      disposables.push(item);
      return item;
    };

    const textureLoader = new TextureLoader();
    const woodColor = track(textureLoader.load(`${ASSETS}wood-color.jpg`));
    woodColor.colorSpace = SRGBColorSpace;
    const woodRoughness = track(textureLoader.load(`${ASSETS}wood-roughness.jpg`));
    [woodColor, woodRoughness].forEach((texture) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(1.4, 1.4);
    });
    const grooves = track(grooveTexture());
    const materials = {
      wood: track(new MeshPhysicalMaterial({ map: woodColor, roughnessMap: woodRoughness, roughness: 0.85, clearcoat: 0.7, clearcoatRoughness: 0.22, color: 0xe2bd94 })),
      brass: track(new MeshStandardMaterial({ color: 0xd2a659, metalness: 1, roughness: 0.27 })),
      horn: track(new MeshStandardMaterial({ color: 0xd8ad62, metalness: 1, roughness: 0.22, side: DoubleSide })),
      nickel: track(new MeshStandardMaterial({ color: 0xcfc8bc, metalness: 1, roughness: 0.2 })),
      knob: track(new MeshStandardMaterial({ color: 0x3b2116, roughness: 0.45 })),
      felt: track(new MeshStandardMaterial({ color: 0x4a1f1a, roughness: 1 })),
      vinyl: track(new MeshStandardMaterial({ color: 0x0c0c0c, roughness: 1, roughnessMap: grooves, metalness: 0.1 })),
      vinylEdge: track(new MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })),
      label: track(new MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 })),
    };
    const model = buildGramophone(materials);
    scene.add(model.root);

    const ground = new Mesh(track(new PlaneGeometry(30, 30)), track(new ShadowMaterial({ opacity: 0.22 })));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const lamp = new DirectionalLight(0xffe2b8, 1.6);
    lamp.position.set(-5, 9, 6);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.camera.left = -5;
    lamp.shadow.camera.right = 5;
    lamp.shadow.camera.top = 6;
    lamp.shadow.camera.bottom = -4;
    lamp.shadow.radius = 4;
    lamp.shadow.bias = -0.0008;
    scene.add(lamp);

    let disposed = false;
    let frameId = 0;
    let lastFrame = performance.now();
    let labelSrc = null;
    let isReady = false;
    const view = { yaw: 0.35, targetYaw: 0.35, spin: 0, speed: 0, armAngle: ARM_REST_ANGLE, drop: 0, distance: 14 };
    const drag = { active: false, pointerId: null, x: 0, yaw: 0, moved: false };
    let lastInteraction = -Infinity;

    const pmrem = new PMREMGenerator(renderer);
    new HDRLoader().load(`${ASSETS}studio.hdr`, (hdr) => {
      if (disposed) return;
      const environment = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = environment;
      scene.environmentIntensity = 0.9;
      track(environment);
      hdr.dispose();
      pmrem.dispose();
      isReady = true;
      canvas.classList.add('is-ready');
      onReady?.();
    }, undefined, () => onError?.());

    const syncLabel = () => {
      const current = playerRef.current;
      const src = (current.currentTrack || current.fallbackTrack)?.cover;
      if (!src || src === labelSrc) return;
      labelSrc = src;
      textureLoader.load(src, (texture) => {
        if (disposed) return;
        texture.colorSpace = SRGBColorSpace;
        materials.label.map?.dispose();
        materials.label.map = texture;
        materials.label.needsUpdate = true;
      });
    };

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Fit the whole gramophone whatever the stage's shape.
      const radius = 3.1;
      const verticalFit = radius / Math.sin((camera.fov * Math.PI) / 360);
      const horizontalFov = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
      const horizontalFit = radius / Math.sin(horizontalFov / 2);
      view.distance = Math.max(verticalFit, horizontalFit) * 0.92;
      camera.updateProjectionMatrix();
    };

    const hitsRecord = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects([model.record, model.label], false).length > 0;
    };

    const handlePointerDown = (event) => {
      if (!event.isPrimary) return;
      drag.active = true;
      drag.pointerId = event.pointerId;
      drag.x = event.clientX;
      drag.yaw = view.targetYaw;
      drag.moved = false;
      lastInteraction = performance.now();
    };
    const handlePointerMove = (event) => {
      if (drag.active && event.pointerId === drag.pointerId) {
        const deltaX = event.clientX - drag.x;
        if (!drag.moved && Math.abs(deltaX) > 6) {
          drag.moved = true;
          canvas.setPointerCapture?.(event.pointerId);
        }
        if (drag.moved) view.targetYaw = drag.yaw - (deltaX / canvas.clientWidth) * Math.PI * 1.2;
        lastInteraction = performance.now();
        return;
      }
      if (event.pointerType === 'mouse') canvas.style.cursor = hitsRecord(event) ? 'pointer' : 'grab';
    };
    const handlePointerUp = (event) => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      drag.active = false;
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!drag.moved && hitsRecord(event)) playerRef.current.togglePlayback();
    };

    const tick = (now) => {
      frameId = window.requestAnimationFrame(tick);
      if (disposed || !isReady) return;
      const delta = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const current = playerRef.current;
      syncLabel();

      // Idle: a slow sway so it reads as an object, paused while someone handles it.
      const idleFor = (now - lastInteraction) / 1000;
      if (!drag.active && idleFor > 3 && !reducedMotion) {
        view.targetYaw = approach(view.targetYaw, 0.35 + Math.sin(now / 5200) * IDLE_SWAY, 0.6, delta);
      }
      view.yaw = approach(view.yaw, view.targetYaw, reducedMotion ? 40 : 7, delta);

      const playing = current.isPlaying && current.currentTrack;
      view.speed = approach(view.speed, playing ? PLAYING_SPEED : 0, playing ? 2.2 : 1.4, delta);
      view.spin -= view.speed * delta;
      model.platter.rotation.y = view.spin;

      const progress = current.duration > 0 ? current.currentTime / current.duration : 0;
      const onRecord = Boolean(current.currentTrack) && (playing || progress > 0);
      const armTarget = onRecord ? getArmAngleForRadius(getGrooveRadius(progress)) : ARM_REST_ANGLE;
      view.armAngle = approach(view.armAngle, armTarget, 3, delta);
      view.drop = approach(view.drop, playing ? 1 : 0, 4, delta);
      // three rotates +y counter-clockwise seen from above; our angle runs from +x toward +z.
      model.arm.rotation.y = -view.armAngle;
      model.arm.rotation.z = -0.06 * view.drop + (playing ? Math.sin(now / 90) * 0.0015 : 0);

      camera.position.set(
        TARGET.x + view.distance * Math.cos(ELEVATION) * Math.sin(view.yaw),
        TARGET.y + view.distance * Math.sin(ELEVATION),
        TARGET.z + view.distance * Math.cos(ELEVATION) * Math.cos(view.yaw),
      );
      camera.lookAt(TARGET);
      renderer.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    frameId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      materials.label.map?.dispose();
      model.root.traverse((object) => object.geometry?.dispose());
      disposables.forEach((item) => item.dispose?.());
      pmrem.dispose();
      renderer.dispose();
    };
  // Set up once; the latest player state flows through playerRef.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="gramophone-scene absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export default GramophoneScene;
