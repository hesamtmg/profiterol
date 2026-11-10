/**
 * Builds the 3D planets shared by the orbit block's 3D look and the "3D planets" page loader: a lit, glossy globe
 * made from a round picture (see planet-globe), with a little relief and, on dark backgrounds, an atmosphere glowing
 * in the planet's own color. Three.js is passed in, so it stays in the chunk the caller loads on demand.
 */
import type * as Three from 'three';
import { planetSurface } from './planet-globe';

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-world.xyz);
    gl_Position = projectionMatrix * world;
  }
`;
const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 glow;
  uniform float strength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Seen from outside, the shell's inner faces run from the planet's edge (facing the viewer about halfway) to the
    // shell's own edge (side on): brightest against the planet, fading to nothing at the edge.
    float hug = clamp(abs(dot(vNormal, vView)) / 0.5, 0.0, 1.0);
    gl_FragColor = vec4(glow, hug * hug * strength);
  }
`;

export interface PlanetMesh {
  /** The globe; turn it to spin the planet. */
  body: Three.Mesh;
  /** The atmosphere shell; keep it with the globe but don't spin it. Not drawn on light backgrounds. */
  glow: Three.Mesh;
  /** Settles once the picture is on the globe (or has failed, leaving a plain colored ball). */
  loaded: Promise<void>;
}

export interface PlanetKitOptions {
  /** How much of each picture's width the round planet takes up, 0–1. */
  fill: number;
  /** Color of planets without a picture, and of their glow. */
  accent: Three.Color;
  /** Drawn over a dark background: atmospheres glow (light added) and the fill light is lower. */
  dark: boolean;
  /**
   * 'light' for screens that must appear fast (the page loader): the 480 px copy of each picture (a few KB), half-size
   * maps and fewer facets. Planets drawn small look the same.
   */
  quality?: 'full' | 'light';
}

export function planetKit(THREE: typeof Three, renderer: Three.WebGLRenderer, options: PlanetKitOptions) {
  const lite = options.quality === 'light';
  const sphere = lite ? new THREE.SphereGeometry(1, 40, 28) : new THREE.SphereGeometry(1, 96, 64);
  const halo = new THREE.SphereGeometry(1.16, lite ? 24 : 48, lite ? 16 : 32);
  const disposables: { dispose(): void }[] = [sphere, halo];
  const loader = new THREE.ImageLoader();
  loader.setCrossOrigin('anonymous');

  /**
   * Real shading, so each planet reads as a ball: a strong light from the upper left gives every planet a lit side, a
   * soft shadow side and a glossy highlight; a warm light at `sunAt` (the middle of the system) catches the sides
   * facing it; and only a little fill, so the shadow sides stay dark without going black.
   */
  function light(scene: Three.Scene, sunAt = new THREE.Vector3()) {
    scene.add(new THREE.HemisphereLight(0xdde4ff, 0x10101a, options.dark ? 0.35 : 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-2.5, 3, 2.2);
    scene.add(key);
    const sun = new THREE.PointLight(0xffd9a0, 2.2, 0, 0);
    sun.position.copy(sunAt);
    scene.add(sun);
  }

  /**
   * The planet pictures are only read at 512 px (256 px when light), so take the 960 px (480 px) WebP copy the site
   * makes of every uploaded photo, a fraction of the original's size, and the original if there is no such copy.
   */
  function loadPicture(url: string) {
    const width = lite ? 480 : 960;
    const smaller = /^\/uploads\/[\w-]+\.(jpe?g|png|webp|avif)$/i.test(url) ? url.replace(/\.\w+$/, `-${width}.webp`) : '';
    return smaller ? loader.loadAsync(smaller).catch(() => loader.loadAsync(url)) : loader.loadAsync(url);
  }

  function make(image: string, size: number): PlanetMesh {
    const material = new THREE.MeshPhysicalMaterial({
      roughness: 0.62,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      color: image ? 0xffffff : options.accent,
    });
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      uniforms: { glow: { value: options.accent.clone() }, strength: { value: 0.9 } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(material, glowMaterial);
    const loaded = image
      ? loadPicture(image)
          .then((picture) => {
            const surface = planetSurface(picture, options.fill, lite ? 'light' : 'full');
            const texture = new THREE.CanvasTexture(surface.canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = Math.min(lite ? 2 : 8, renderer.capabilities.getMaxAnisotropy());
            material.map = texture;
            // The picture's own light and dark doubles as a height map, for a little relief.
            material.bumpMap = texture;
            material.bumpScale = 2.5;
            material.needsUpdate = true;
            glowMaterial.uniforms.glow!.value.setRGB(...surface.color, THREE.SRGBColorSpace).multiplyScalar(1.6);
            disposables.push(texture);
          })
          .catch(() => {
            material.color.copy(options.accent);
          })
      : Promise.resolve();
    const body = new THREE.Mesh(sphere, material);
    const glow = new THREE.Mesh(halo, glowMaterial);
    glow.visible = options.dark;
    body.scale.setScalar(size);
    glow.scale.setScalar(size);
    return { body, glow, loaded };
  }

  return {
    light,
    make,
    /** Keep something else (geometry, material) to be freed along with the planets. */
    keep: (thing: { dispose(): void }) => disposables.push(thing),
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/** True when the nearest painted background behind `el` is dark. */
export function onDarkBackground(el: HTMLElement) {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (!m || (m[3] !== undefined && Number(m[3]) < 0.5)) continue;
    const [r, g, b] = m.map(Number) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
  }
  return false;
}

/** A steady pseudo-random number in 0…1 for any whole number, so sizes and tilts don't change on reload. */
export const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
