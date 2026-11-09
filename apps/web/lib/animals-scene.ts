/**
 * Kasra's low-poly animals (see lowpoly-animals) standing side by side on black glass that mirrors them, the owl
 * flying above, lit like the NFT pictures: a strong light from the front left, a cool rim from behind. On `enter()`
 * the animals walk in from the right one after another and stop at their places, then breathe, look about and
 * swish their tails; the owl circles. The pointer swings the camera a little. On narrow screens only the middle
 * three animals (and the owl) stand, so they stay a good size.
 */
import type * as Three from 'three';
import type { Reflector as ReflectorClass } from 'three/examples/jsm/objects/Reflector.js';
import { animalBuilder, type Animal, type AnimalKind } from './lowpoly-animals';

export interface AnimalsSceneOptions {
  kinds: AnimalKind[];
  /** Draw one frame and stand still (the editor, or less motion asked for). */
  still: boolean;
}

export function animalsScene(
  THREE: typeof Three,
  Reflector: typeof ReflectorClass,
  canvas: HTMLCanvasElement,
  options: AnimalsSceneOptions,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x202028, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb4bcff, 1.8);
  rim.position.set(2, 3, -4);
  scene.add(rim);
  const warm = new THREE.DirectionalLight(0xffd9a0, 0.6);
  warm.position.set(4, 1, 3);
  scene.add(warm);

  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.72, metalness: 0.05 });
  const thin = solid.clone();
  thin.side = THREE.DoubleSide;
  const builder = animalBuilder(THREE, { solid, thin });

  // Black glass: a mirror whose reflections are clearest right under the animals and fade toward the viewer, and
  // which itself fades out toward the horizon, so the floor melts into whatever is behind the hero.
  const floorGeometry = new THREE.PlaneGeometry(60, 60);
  const floor = new Reflector(floorGeometry, {
    color: 0x8a8a8a,
    textureWidth: 1024,
    textureHeight: 1024,
    clipBias: 0.003,
    shader: {
      name: 'GlassFloor',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix;
        varying vec4 vUv;
        varying vec2 vPlane;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main() {
          vUv = textureMatrix * vec4(position, 1.0);
          vPlane = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        varying vec4 vUv;
        varying vec2 vPlane;
        #include <logdepthbuf_pars_fragment>
        void main() {
          #include <logdepthbuf_fragment>
          // vPlane.y: 0.5 under the animals, smaller toward the viewer, 1 at the far edge.
          vec3 reflection = texture2DProj(tDiffuse, vUv).rgb * color * 1.6;
          float clear = mix(0.18, 1.0, smoothstep(0.3, 0.5, vPlane.y));
          float glass = 0.92 * (1.0 - smoothstep(0.5, 0.6, vPlane.y));
          gl_FragColor = vec4(reflection * clear, glass);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  (floor.material as Three.ShaderMaterial).transparent = true;
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  interface Placed {
    animal: Animal;
    spot: Three.Vector3;
    /** Seconds after `enter()` when it starts walking in. */
    delay: number;
    phase: number;
    walk: number;
  }
  const everyone: Placed[] = [];
  let narrow = false;

  function layout() {
    for (const p of everyone) scene.remove(p.animal.root);
    everyone.length = 0;
    const grounded = options.kinds.filter((k) => k !== 'owl');
    const shown =
      narrow && grounded.length > 3
        ? grounded.slice(Math.floor((grounded.length - 3) / 2), Math.floor((grounded.length - 3) / 2) + 3)
        : grounded;
    const animals = shown.map((k, i) => builder.build(k, i + 1));
    // Side by side, overlapping a little; the taller ones a step further back.
    const gap = 0.78;
    const total = animals.reduce((sum, a) => sum + a.length * gap, 0);
    let x = -total / 2;
    animals.forEach((animal, i) => {
      const w = animal.length * gap;
      const spot = new THREE.Vector3(x + w / 2 - 0.15, 0, -Math.max(0, animal.height - 1.6) * 0.45 + (i % 2 ? -0.25 : 0.15));
      x += w;
      animal.root.position.copy(spot);
      scene.add(animal.root);
      everyone.push({ animal, spot, delay: (animals.length - 1 - i) * 0.35, phase: i * 1.7, walk: 0 });
    });
    if (options.kinds.includes('owl')) {
      const owl = builder.build('owl', 99);
      scene.add(owl.root);
      everyone.push({ animal: owl, spot: new THREE.Vector3(), delay: 0.6, phase: 0, walk: 0 });
    }
    fit();
  }

  const view = { azimuth: 0, toAzimuth: 0, lift: 0, toLift: 0, distance: 10, height: 1 };
  const row = new THREE.Box3();
  function bounds() {
    row.makeEmpty();
    for (const p of everyone) {
      if (p.animal.flies) continue;
      row.expandByPoint(new THREE.Vector3(p.spot.x - p.animal.length / 2, 0, p.spot.z));
      row.expandByPoint(new THREE.Vector3(p.spot.x + p.animal.length / 2, p.animal.height, p.spot.z));
    }
    if (row.isEmpty()) row.set(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 1.5, 0));
  }
  function aim() {
    const target = new THREE.Vector3(0, view.height * 0.42, 0);
    const e = 0.1 + view.lift;
    camera.position.set(
      Math.sin(view.azimuth) * Math.cos(e) * view.distance,
      target.y + Math.sin(e) * view.distance,
      Math.cos(view.azimuth) * Math.cos(e) * view.distance,
    );
    camera.lookAt(target);
  }
  /** Back off until the row (and room for the owl above it) fits the frame. */
  function fit() {
    bounds();
    view.height = row.max.y;
    const probe = new THREE.Vector3();
    const corners = [row.min.x, row.max.x].flatMap((x) => [0, row.max.y * 1.35].map((y) => new THREE.Vector3(x, y, 0)));
    let lo = 1;
    let hi = 80;
    for (let n = 0; n < 26; n++) {
      view.distance = (lo + hi) / 2;
      const azimuth = view.azimuth;
      view.azimuth = 0;
      aim();
      view.azimuth = azimuth;
      camera.updateMatrixWorld();
      const fits = corners.every((c) => {
        probe.copy(c).project(camera);
        return Math.abs(probe.x) < 0.94 && probe.y < 0.92 && probe.y > -0.75;
      });
      if (fits) hi = view.distance;
      else lo = view.distance;
    }
    view.distance = hi;
    aim();
  }

  let width = 0;
  function resize(w: number, h: number) {
    if (!w || !h) return;
    width = w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wasNarrow = narrow;
    narrow = w < 640 || w / h < 0.9;
    if (wasNarrow !== narrow || !everyone.length) layout();
    else fit();
    const size = Math.min(1600, Math.max(768, Math.round(w * renderer.getPixelRatio() * 0.75)));
    floor.getRenderTarget().setSize(size, Math.round((size * h) / w));
    pose();
    render();
  }

  // The clock: `entered` counts from `enter()`; before that the animals wait off to the right.
  let time = 0;
  let entered = -1;
  const ease = (t: number) => t * t * (3 - 2 * t);
  function pose(dt = 0) {
    time += dt;
    if (entered >= 0) entered += dt;
    const ready = options.still || entered < 0 ? (options.still ? 99 : -1) : entered;
    for (const p of everyone) {
      const a = p.animal;
      if (a.flies) {
        // The owl loops lazily above the row, flying in from the upper left at first.
        const loop = time * 0.35;
        const arrive = Math.min(1, Math.max(0, (ready - p.delay) / 2.5));
        const r = (row.max.x - row.min.x) * 0.32;
        const x = Math.sin(loop) * r;
        const y = view.height * 1.12 + Math.sin(loop * 2) * 0.12;
        const z = Math.cos(loop) * 0.6 - 0.4;
        a.root.position.set(x - (1 - ease(arrive)) * r * 3, y + (1 - ease(arrive)) * 1.5, z);
        a.root.rotation.y = -Math.atan2(Math.cos(loop) * r, -Math.sin(loop) * 0.6);
        a.root.rotation.z = Math.cos(loop) * 0.15;
        a.root.visible = ready >= p.delay || options.still;
        a.pose(time, 1, p.phase);
        continue;
      }
      // Walk in over 2.6 seconds from 9 units to the right, slowing to a stop.
      const t = Math.min(1, Math.max(0, (ready - p.delay) / 2.6));
      const along = ready < 0 ? 0 : 1 - Math.pow(1 - t, 2.2);
      a.root.position.set(p.spot.x + (1 - along) * 9, 0, p.spot.z);
      p.walk = ready < 0 || t >= 1 ? Math.max(0, p.walk - dt * 2) : Math.min(1, 0.3 + (1 - t) * 1.2);
      a.root.visible = ready >= p.delay || options.still;
      a.pose(time, options.still ? 0 : p.walk, p.phase);
    }
    view.azimuth += (view.toAzimuth - view.azimuth) * Math.min(1, dt * 3);
    view.lift += (view.toLift - view.lift) * Math.min(1, dt * 3);
    aim();
  }
  function render() {
    if (width) renderer.render(scene, camera);
  }

  return {
    resize,
    /** Advance by `dt` seconds and draw. */
    frame(dt: number) {
      pose(dt);
      render();
    },
    enter() {
      if (entered < 0) entered = 0;
    },
    /** Pointer over the canvas, −1…1 across and up; null when it leaves. */
    point(x: number | null, y = 0) {
      view.toAzimuth = x === null ? 0 : x * 0.28;
      view.toLift = x === null ? 0 : y * 0.06;
    },
    still(on: boolean) {
      options.still = on;
      pose();
      render();
    },
    dispose() {
      scene.traverse((o) => {
        if ((o as Three.Mesh).isMesh && o !== floor) (o as Three.Mesh).geometry.dispose();
      });
      floor.dispose();
      floorGeometry.dispose();
      solid.dispose();
      thin.dispose();
      renderer.dispose();
    },
  };
}
