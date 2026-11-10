/**
 * Kasra's animals standing side by side on black glass that mirrors them, like his NFT pictures. Each animal is his
 * own picture made solid (see picture-sculpture): a rounded 3D body that looks exactly like the artwork from the
 * front and shows its depth as it turns. On `enter()` they rise out of the glass one after another, turning to face
 * the viewer, then sway gently so their roundness catches the light; an animal marked as flying hovers above the
 * others. The pointer swings the camera a little. On narrow screens only the middle three stand, so they stay a
 * good size.
 */
import type * as Three from 'three';
import type { Reflector as ReflectorClass } from 'three/examples/jsm/objects/Reflector.js';
import { sculpt } from './picture-sculpture';

export interface SceneAnimal {
  /** A cut-out picture of the animal (transparent background). */
  image: string;
  /** Height relative to the others (1 = a bear). */
  size: number;
  /** Face the other way. */
  flip: boolean;
  /** Hover above the others instead of standing. */
  flies: boolean;
}

export interface AnimalsSceneOptions {
  animals: SceneAnimal[];
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

  // The pictures carry their own light and shade, so the scene's lights stay soft: enough to round the bodies off.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303038, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8d0ff, 1.2);
  rim.position.set(2, 3, -4);
  scene.add(rim);

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
    animal: SceneAnimal;
    holder: Three.Group;
    mesh: Three.Mesh;
    width: number;
    height: number;
    spot: Three.Vector3;
    /** Seconds after `enter()` when it rises. */
    delay: number;
    phase: number;
  }
  let everyone: Placed[] = [];
  let narrow = false;
  const pictures = new Map<string, HTMLImageElement>();
  const loader = new THREE.ImageLoader();
  loader.setCrossOrigin('anonymous');

  /** Loads every picture once; resolves when all have loaded or failed. */
  const loaded = Promise.all(
    options.animals.map((a) =>
      loader
        .loadAsync(a.image)
        .then((img) => void pictures.set(a.image, img))
        .catch(() => undefined),
    ),
  );

  const UNIT = 1.6;
  function layout() {
    for (const p of everyone) {
      scene.remove(p.holder);
      (p.mesh.userData.dispose as () => void)();
    }
    const usable = options.animals.filter((a) => pictures.has(a.image));
    const standing = usable.filter((a) => !a.flies);
    const middle = Math.floor((standing.length - 3) / 2);
    const shown = narrow && standing.length > 3 ? standing.slice(middle, middle + 3) : standing;
    const placed: Placed[] = shown.map((animal, i) => {
      const { mesh, width, height } = sculpt(THREE, pictures.get(animal.image)!, { height: UNIT * (animal.size || 1), flip: animal.flip });
      const holder = new THREE.Group();
      holder.add(mesh);
      scene.add(holder);
      return { animal, holder, mesh, width, height, spot: new THREE.Vector3(), delay: 0, phase: i * 1.9 };
    });
    // Side by side, overlapping a little like in the pictures; every other one a step further back.
    const gap = 0.86;
    const total = placed.reduce((sum, p) => sum + p.width * gap, 0);
    let x = -total / 2;
    const centre = (placed.length - 1) / 2;
    placed.forEach((p, i) => {
      p.spot.set(x + (p.width * gap) / 2, 0, i % 2 ? -0.35 : 0.1);
      x += p.width * gap;
      // They rise from the middle outward.
      p.delay = Math.abs(i - centre) * 0.28;
    });
    const tallest = Math.max(UNIT, ...placed.map((p) => p.height));
    for (const animal of usable.filter((a) => a.flies)) {
      const { mesh, width, height } = sculpt(THREE, pictures.get(animal.image)!, {
        height: UNIT * (animal.size || 0.6),
        flip: animal.flip,
      });
      const holder = new THREE.Group();
      holder.add(mesh);
      scene.add(holder);
      placed.push({
        animal,
        holder,
        mesh,
        width,
        height,
        spot: new THREE.Vector3(-total * 0.22, tallest * 1.02, -0.6),
        delay: (placed.length / 2) * 0.28 + 0.4,
        phase: 0,
      });
    }
    everyone = placed;
    fit();
  }

  const view = { azimuth: 0, toAzimuth: 0, lift: 0, toLift: 0, distance: 10, height: 1 };
  const row = new THREE.Box3();
  function bounds() {
    row.makeEmpty();
    for (const p of everyone) {
      row.expandByPoint(new THREE.Vector3(p.spot.x - p.width / 2, p.spot.y, p.spot.z));
      row.expandByPoint(new THREE.Vector3(p.spot.x + p.width / 2, p.spot.y + p.height, p.spot.z));
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
  /** Back off until every animal fits the frame. */
  function fit() {
    bounds();
    view.height = row.max.y;
    const probe = new THREE.Vector3();
    const corners = [row.min.x, row.max.x].flatMap((x) => [0, row.max.y * 1.05].map((y) => new THREE.Vector3(x, y, 0)));
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
    if (pictures.size && (wasNarrow !== narrow || !everyone.length)) layout();
    else fit();
    const size = Math.min(1600, Math.max(768, Math.round(w * renderer.getPixelRatio() * 0.75)));
    floor.getRenderTarget().setSize(size, Math.round((size * h) / w));
    pose();
    render();
  }

  // The clock: `entered` counts from `enter()`; before that the animals wait under the glass.
  let time = 0;
  let entered = -1;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  function pose(dt = 0) {
    time += dt;
    if (entered >= 0) entered += dt;
    for (const p of everyone) {
      const t = options.still ? 1 : entered < 0 ? 0 : Math.min(1, Math.max(0, (entered - p.delay) / 1.5));
      const e = ease(t);
      const sway = options.still ? 0 : Math.sin(time * 0.45 + p.phase) * 0.2 * e;
      p.holder.visible = t > 0;
      if (p.animal.flies) {
        // Hovering: drifting in a slow figure of eight, bobbing, gliding in from above.
        const drift = time * 0.3 + p.phase;
        p.holder.position.set(
          p.spot.x + Math.sin(drift) * 0.5,
          p.spot.y + Math.sin(drift * 2) * 0.12 + (1 - e) * 1.2,
          p.spot.z + Math.cos(drift) * 0.25,
        );
        p.holder.rotation.set(0, sway * 0.8, Math.sin(drift * 2) * 0.06);
      } else {
        // Rising out of the glass while turning round to face the viewer.
        p.holder.position.set(p.spot.x, p.spot.y - (1 - e) * p.height * 0.6, p.spot.z);
        p.holder.rotation.set(0, (1 - e) * (p.animal.flip ? -1.3 : 1.3) + sway, 0);
      }
      p.holder.scale.setScalar(0.7 + 0.3 * e);
    }
    view.azimuth += (view.toAzimuth - view.azimuth) * Math.min(1, dt * 3);
    view.lift += (view.toLift - view.lift) * Math.min(1, dt * 3);
    aim();
  }
  function render() {
    if (width) renderer.render(scene, camera);
  }

  return {
    /** Settles once the pictures are in and the animals are built. */
    ready: loaded.then(() => {
      if (width) {
        layout();
        pose();
        render();
      }
    }),
    resize,
    /** Advance by `dt` seconds and draw. */
    frame(dt: number) {
      pose(dt);
      render();
    },
    enter() {
      if (entered < 0) entered = 0;
    },
    /** Pointer over the page, −1…1 across and up; null when it leaves. */
    point(x: number | null, y = 0) {
      view.toAzimuth = x === null ? 0 : x * 0.32;
      view.toLift = x === null ? 0 : y * 0.06;
    },
    still(on: boolean) {
      options.still = on;
      pose();
      render();
    },
    dispose() {
      for (const p of everyone) (p.mesh.userData.dispose as () => void)();
      floor.dispose();
      floorGeometry.dispose();
      renderer.dispose();
    },
  };
}
