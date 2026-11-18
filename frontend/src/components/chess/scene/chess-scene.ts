import {
  AdditiveBlending, BackSide, BoxGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Fog, Group, HemisphereLight, Mesh,
  MeshDepthMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NeutralToneMapping, PCFShadowMap, PerspectiveCamera, PlaneGeometry,
  RGBADepthPacking, RepeatWrapping, SRGBColorSpace, Scene, ShaderMaterial, SpotLight, Vector2, Vector3, WebGLRenderer,
  type BufferGeometry, type Material, type Object3D, type Texture,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { readPlacement } from '@/components/chess/placement';
import type { PieceKind } from '@/components/chess/stage-art';
import { easeOutBack, easeOutCubic, fitDistance, lensShift, orbitPosition, progress, squareCenter, type Vec3 } from './camera-framing';
import { PIECE_KINDS, pieceModel, type PieceModel } from './piece-geometry';
import { paintBoard, paintFloorTile, paintGuest, paintPlayer, type Standee } from './set-art';

/* The 3D chess set: the board and its pieces on a paper-topped table, lit like a set piece on
   the studio floor, with a backdrop, a key spotlight and its beam, a rim light from behind.

   World units: one square is 1. The board's playing surface is y = 0, centred on the origin,
   files a to h along +x and White at +z. The table top is just under the board, the studio
   floor further down. Nothing here knows about React: chess-set.tsx owns the canvas and calls
   the controller this returns. The picture is only redrawn while something moves (the camera
   arriving, pieces being set out, the players leaning in, a reframe); otherwise it holds still
   and costs nothing. */

export type SetMode = 'computer' | 'deliberation';
/** Player 2's look in Deliberation: their initial (or "?") and their picture, if any. */
export type GuestLook = { face: string; avatar: string | null };
/** The part of the canvas the set should be framed in, in pixels from its left edge. */
export type Focus = { left: number; right: number };
export type SceneOptions = { mode: SetMode; placement: string; guest?: GuestLook; animate: boolean };
export type ChessScene = {
  setPlacement: (placement: string) => void;
  setGuest: (guest: GuestLook) => void;
  resize: (width: number, height: number, focus: Focus) => void;
  /** Jumps the entrance to its end (the visitor clicked or pressed a key). */
  finishIntro: () => void;
  dispose: () => void;
};

const deg = (degrees: number) => (degrees * Math.PI) / 180;

const BOARD_TOP = 8.94; // the board's top face with its frame; the squares fill the middle 8
const BOARD_BODY = 9.1;
const BOARD_DEPTH = 0.3;
const TABLE_TOP_Y = -BOARD_DEPTH;
const TABLE_THICKNESS = 0.42;
const TABLE_WIDTH = 11.4;
const FLOOR_Y = -7;
/** World units per unit of the figures' artwork, whose table top stands 184 above its floor. */
const ART_SCALE = (TABLE_TOP_Y - FLOOR_Y) / 184;

/** A camera set-up: what it looks at, from where (radians), with which lens (vertical field
 *  of view in degrees), and how big a sphere round the target has to stay in frame. */
type Shot = { target: Vec3; elevation: number; azimuth: number; fov: number; radius: number; tableLength: number; beam: number };
const SHOTS: Record<SetMode, Shot> = {
  // In-Game Chess: from White's side and high up, the way a player leaning over the board sees it.
  computer: { target: [0, -0.2, 0.45], elevation: deg(51), azimuth: 0, fov: 28, radius: 6.5, tableLength: 11.4, beam: 0.035 },
  // Deliberation: a photograph of the match, taken from beside the table a little towards
  // White, at a standing spectator's height, with a standard lens.
  deliberation: { target: [0, 0.9, 1.3], elevation: deg(22), azimuth: deg(62), fov: 27, radius: 10.4, tableLength: 13.2, beam: 0.07 },
};

/* The entrance, in seconds. The camera cranes down onto its shot while the view rises into
   frame (stage-layout.css), then the pieces are set out one after another and the players
   lean in. */
const CAMERA_S = 0.95;
const PIECES_AT = 0.5;
const PIECE_STAGGER = 0.014;
const PIECE_S = 0.34;
const LEAN_AT = 0.5;
const LEAN_S = 0.6;
const INTRO_S = PIECES_AT + 32 * PIECE_STAGGER + PIECE_S;
const REFRAME_S = 0.6;
const LEAN = 0.2;

const IVORY_PIECE = '#ddd6c6';
const EBONY_PIECE = '#242427';

/** The die-cut edge round a model: its shell pushed out along the normals by `width` pixels on
 *  screen, drawn from behind so only the rim shows. `resolution` is the canvas size in pixels. */
function outlineMaterial(color: string, width: number, resolution: Vector2): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { color: { value: new Color(color) }, width: { value: width }, resolution: { value: resolution } },
    vertexShader: /* glsl */ `
      uniform float width;
      uniform vec2 resolution;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 viewNormal = normalize(normalMatrix * normal);
        vec2 direction = (projectionMatrix * vec4(viewNormal, 0.0)).xy;
        direction /= max(length(direction), 1e-5);
        clip.xy += direction * width * 2.0 / resolution * clip.w;
        // A touch further from the camera than the surface, so the edge shows round the
        // outside of the shape and not as lines across it.
        clip.z += 0.0002 * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
    side: BackSide,
    toneMapped: false,
  });
}

/** A visible beam of light, a soft cone from `from` towards `to`. */
function lightBeam(from: Vector3, to: Vector3, angle: number, strength: number): Mesh {
  const length = from.distanceTo(to) * 1.08;
  const geometry = new ConeGeometry(Math.tan(angle) * length * 0.72, length, 48, 1, true);
  geometry.translate(0, -length / 2, 0);
  const material = new ShaderMaterial({
    uniforms: { color: { value: new Color('#fff7ea') }, strength: { value: strength }, length: { value: length } },
    vertexShader: /* glsl */ `
      uniform float length;
      varying float vAlong;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vAlong = clamp(-position.y / length, 0.0, 1.0);
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float strength;
      varying float vAlong;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = pow(abs(dot(normalize(vNormal), normalize(vView))), 2.0);
        float fade = smoothstep(0.0, 0.15, vAlong) * pow(1.0 - vAlong, 1.2);
        gl_FragColor = vec4(color * strength * facing * fade, 1.0);
      }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  const beam = new Mesh(geometry, material);
  beam.position.copy(from);
  beam.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), to.clone().sub(from).normalize());
  beam.renderOrder = 10;
  return beam;
}

function canvasTexture(source: HTMLCanvasElement, anisotropy: number): CanvasTexture {
  const texture = new CanvasTexture(source);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** A seated player standee, standing in the plane through the board's centre line (x = 0) at
 *  one end of the table, facing along it. Returns the pivot it leans in about. */
function standee(art: Standee, tableEdgeZ: number, anisotropy: number) {
  const texture = canvasTexture(art.canvas, anisotropy);
  const material = new MeshStandardMaterial({ map: texture, alphaTest: 0.5, alphaToCoverage: true, side: DoubleSide, roughness: 0.85 });
  const mesh = new Mesh(new PlaneGeometry(art.box.width * ART_SCALE, art.box.height * ART_SCALE), material);
  mesh.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: texture, alphaTest: 0.5 });
  mesh.castShadow = true;
  // The artwork's +x runs along the table towards Black (-z); its face looks at the camera side.
  mesh.rotation.y = Math.PI / 2;
  const worldZ = (x: number) => tableEdgeZ - (x - art.tableEdge) * ART_SCALE;
  const worldY = (y: number) => FLOOR_Y + (340 - y) * ART_SCALE;
  const pivot = new Group();
  pivot.position.set(0, worldY(art.seat.y), worldZ(art.seat.x));
  mesh.position.set(0, worldY(art.box.y + art.box.height / 2) - pivot.position.y, worldZ(art.box.x + art.box.width / 2) - pivot.position.z);
  pivot.add(mesh);
  return { pivot, texture };
}

/** Does the set's heavier preparation ahead of time (the piece models, the board's artwork),
 *  so opening a view only has to put them on the GPU. Safe to call more than once. */
export function prepareChessScene() {
  for (const kind of PIECE_KINDS) pieceModel(kind);
  paintBoard(BOARD_TOP);
}

export function createChessScene(canvas: HTMLCanvasElement, options: SceneOptions): ChessScene {
  const shot = SHOTS[options.mode];
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new Scene();
  scene.background = new Color('#0b0b0c');
  // Depth haze: it starts just behind the set, wherever the camera ends up standing.
  const fog = new Fog('#0b0b0c', 32, 96);
  scene.fog = fog;
  const camera = new PerspectiveCamera(shot.fov, 1, 0.5, 220);
  /** The canvas size, shared by every outline. */
  const resolution = new Vector2(1, 1);

  // --- Studio: floor, backdrop, lights ------------------------------------------
  const floorTexture = canvasTexture(paintFloorTile(), anisotropy);
  floorTexture.wrapS = RepeatWrapping;
  floorTexture.wrapT = RepeatWrapping;
  floorTexture.repeat.set(160 / 7, 160 / 7);
  const floor = new Mesh(new PlaneGeometry(160, 160), new MeshStandardMaterial({ map: floorTexture, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  // A curved backdrop behind the set, opposite the camera, like a studio cyclorama.
  const wallRadius = options.mode === 'computer' ? 19 : 24;
  const backdrop = new Mesh(
    new CylinderGeometry(wallRadius, wallRadius, 34, 72, 1, true, shot.azimuth + Math.PI - 1.25, 2.5),
    new MeshStandardMaterial({ color: '#57565a', roughness: 1, side: BackSide }),
  );
  backdrop.position.y = FLOOR_Y + 17;
  scene.add(backdrop);

  // The key light: high and to the camera's left, so the pieces are modelled by it and throw
  // their shadows across the board; a soft-edged pool round the set, the rest of the floor dark.
  const KEY_ANGLE = 0.52;
  const key = new SpotLight('#fff7ea', 2, 0, KEY_ANGLE, 0.75, 0);
  key.position.set(...orbitPosition([0, 0, 0], deg(50), shot.azimuth - deg(80), 22));
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 4;
  key.shadow.camera.near = 8;
  key.shadow.camera.far = 50;
  // The rim light, from behind on the other side, picks out the edges of the pieces.
  const rim = new SpotLight('#e8e4dc', 1.7, 0, 0.5, 0.8, 0);
  rim.position.set(...orbitPosition([0, 0, 0], deg(34), shot.azimuth + deg(150), 19));
  rim.target.position.set(0, 0.8, 0);
  // The fill light, soft and from beside the camera, opens up the shadow side of the pieces. A
  // spotlight as well, so it lights the set and not the floor round it.
  const fill = new SpotLight('#efece6', 0.95, 0, 0.42, 1, 0);
  fill.position.set(...orbitPosition([0, 0, 0], deg(28), shot.azimuth + deg(28), 26));
  fill.target.position.set(0, 0.6, 0);
  // A soft pool of light on the backdrop, behind the set.
  const wash = new SpotLight('#d6d1c8', 1.5, 0, 0.5, 1, 0);
  const behind = orbitPosition([0, 0, 0], 0, shot.azimuth + Math.PI, wallRadius);
  wash.position.set(-behind[0] * 0.3, 12, -behind[2] * 0.3);
  wash.target.position.set(behind[0], FLOOR_Y + 8, behind[2]);
  scene.add(key, key.target, rim, rim.target, fill, fill.target, wash, wash.target, new HemisphereLight('#e7e3da', '#0b0b0c', 0.2));
  scene.add(lightBeam(key.position, new Vector3(0, TABLE_TOP_Y, 0), KEY_ANGLE, shot.beam));

  // --- The table and the board --------------------------------------------------
  const ink = new MeshStandardMaterial({ color: '#1b1c1d', roughness: 0.55 });
  const table = new Mesh(
    new RoundedBoxGeometry(TABLE_WIDTH, TABLE_THICKNESS, shot.tableLength, 4, 0.12),
    new MeshStandardMaterial({ color: '#f7f6f3', roughness: 0.9 }),
  );
  table.position.y = TABLE_TOP_Y - TABLE_THICKNESS / 2;
  table.receiveShadow = true;
  table.castShadow = true;
  const tableEdge = outlineMaterial('#0b0b0c', 1.6, resolution);
  table.add(new Mesh(table.geometry, tableEdge));
  scene.add(table);
  const legHeight = TABLE_TOP_Y - TABLE_THICKNESS - FLOOR_Y;
  const legGeometry = new BoxGeometry(0.5, legHeight, 0.5);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const leg = new Mesh(legGeometry, ink);
    leg.position.set(x * (TABLE_WIDTH / 2 - 0.9), FLOOR_Y + legHeight / 2, z * (shot.tableLength / 2 - 0.9));
    leg.castShadow = true;
    scene.add(leg);
  }

  const boardTexture = canvasTexture(paintBoard(BOARD_TOP), anisotropy);
  const boardTop = new Mesh(new PlaneGeometry(BOARD_TOP, BOARD_TOP), new MeshStandardMaterial({ map: boardTexture, roughness: 0.5 }));
  boardTop.rotation.x = -Math.PI / 2;
  boardTop.position.y = 0.002;
  boardTop.receiveShadow = true;
  const boardBody = new Mesh(new RoundedBoxGeometry(BOARD_BODY, BOARD_DEPTH, BOARD_BODY, 4, 0.07), ink);
  boardBody.position.y = -BOARD_DEPTH / 2;
  boardBody.castShadow = true;
  boardBody.receiveShadow = true;
  scene.add(boardTop, boardBody);

  // --- Pieces ----------------------------------------------------------------------
  const models = new Map<PieceKind, PieceModel>(PIECE_KINDS.map((kind) => [kind, pieceModel(kind)]));
  // Polished ivory and satin ebony, a clear varnish over each catching the lights.
  const materials = {
    ivory: new MeshPhysicalMaterial({ color: IVORY_PIECE, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.35 }),
    ebony: new MeshPhysicalMaterial({ color: EBONY_PIECE, roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.3 }),
  };
  // As on the cut-out pieces elsewhere, each piece has a die-cut edge: ink round ivory, a warm
  // grey round ebony.
  const edges = { ivory: outlineMaterial('#0b0b0c', 1.1, resolution), ebony: outlineMaterial('#9a958b', 0.9, resolution) };
  const pieces = new Group();
  scene.add(pieces);

  function setPlacement(placement: string) {
    pieces.clear();
    let order = 0;
    for (const { square, piece } of readPlacement(placement)) {
      if (!piece) continue;
      const model = models.get(piece.kind);
      if (!model) continue;
      const mesh = new Mesh(model.body, materials[piece.tone]);
      mesh.add(new Mesh(model.outline, edges[piece.tone]));
      const { x, z } = squareCenter(square);
      mesh.position.set(x, 0.003, z);
      // Knights look across the board at the other side.
      if (piece.kind === 'knight') mesh.rotation.y = piece.tone === 'ivory' ? Math.PI / 2 : -Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.order = order++;
      pieces.add(mesh);
    }
  }
  setPlacement(options.placement);

  // --- Players (Deliberation) --------------------------------------------------------
  const figures: { pivot: Group; lean: number }[] = [];
  let guest: { texture: CanvasTexture; look: GuestLook | null; request: number } | null = null;
  if (options.mode === 'deliberation') {
    const player = standee(paintPlayer(), shot.tableLength / 2, anisotropy);
    const other = standee(paintGuest(options.guest?.face ?? '?', null), -shot.tableLength / 2, anisotropy);
    // Player 1 faces -z, so leaning back tips them towards +z; Player 2 the other way.
    figures.push({ pivot: player.pivot, lean: LEAN }, { pivot: other.pivot, lean: -LEAN });
    scene.add(player.pivot, other.pivot);
    guest = { texture: other.texture, look: null, request: 0 };
  }

  function setGuest(look: GuestLook) {
    if (!guest || (guest.look?.face === look.face && guest.look?.avatar === look.avatar)) return;
    const current = guest;
    current.look = look;
    const request = ++current.request;
    const paint = (avatar: HTMLImageElement | null) => {
      current.texture.image = paintGuest(look.face, avatar).canvas;
      current.texture.needsUpdate = true;
      requestFrame();
    };
    paint(null);
    if (!look.avatar) return;
    // Chess.com serves pictures with CORS, so they can be painted onto the standee.
    const picture = new Image();
    picture.crossOrigin = 'anonymous';
    picture.onload = () => {
      if (current.request === request) paint(picture);
    };
    picture.src = look.avatar;
  }

  // --- Camera and animation -------------------------------------------------------
  const size = { width: 0, height: 0 };
  let framing = { centerX: 0, distance: 30 };
  let reframe: { from: typeof framing; to: typeof framing; start: number } | null = null;
  let start = performance.now();
  let introDone = !options.animate;
  let looping = false;
  let pending = 0;
  // Nothing is drawn until the shaders are compiled, which happens in the background where the
  // browser can (so the camera move into the view is not held up), and the entrance starts then.
  let ready = false;
  let disposed = false;

  function frameFor(focus: Focus) {
    const band = Math.max(1, focus.right - focus.left);
    return { centerX: focus.left + band / 2, distance: fitDistance(shot.radius, shot.fov, band, size.height) };
  }

  function update(now: number) {
    const elapsed = (now - start) / 1000;
    if (!introDone && elapsed >= INTRO_S) introDone = true;
    let view = framing;
    if (reframe) {
      const t = easeOutCubic(progress(now / 1000, reframe.start, REFRAME_S));
      view = {
        centerX: reframe.from.centerX + (reframe.to.centerX - reframe.from.centerX) * t,
        distance: reframe.from.distance + (reframe.to.distance - reframe.from.distance) * t,
      };
      if (t >= 1) reframe = null;
    }
    // Arriving, the camera starts higher, further back and turned a little, and cranes down.
    const arrive = introDone ? 0 : 1 - easeOutCubic(progress(elapsed, 0, CAMERA_S));
    const [x, y, z] = orbitPosition(shot.target, shot.elevation + arrive * 0.42, shot.azimuth - arrive * 0.3, view.distance * (1 + arrive * 0.6));
    camera.position.set(x, y, z);
    camera.lookAt(shot.target[0], shot.target[1], shot.target[2]);
    fog.near = view.distance + 6;
    fog.far = view.distance * 2.2 + 30;
    const { fullWidth, offsetX } = lensShift(size.width, view.centerX);
    camera.aspect = fullWidth / Math.max(1, size.height);
    camera.setViewOffset(fullWidth, size.height, offsetX, 0, size.width, size.height);

    for (const child of pieces.children) {
      const t = introDone ? 1 : progress(elapsed, PIECES_AT + (child.userData.order as number) * PIECE_STAGGER, PIECE_S);
      child.visible = t > 0;
      child.position.y = 0.003 + (1 - easeOutCubic(t)) * 0.55;
      child.scale.setScalar(0.6 + 0.4 * easeOutBack(t));
    }
    for (const figure of figures) {
      figure.pivot.rotation.x = figure.lean * (introDone ? 0 : 1 - easeOutCubic(progress(elapsed, LEAN_AT, LEAN_S)));
    }
    return !introDone || reframe !== null;
  }

  function render(now: number) {
    if (size.width === 0 || size.height === 0) return false;
    const moving = update(now);
    renderer.render(scene, camera);
    return moving;
  }

  function loop(now: number) {
    if (!render(now)) {
      renderer.setAnimationLoop(null);
      looping = false;
    }
  }

  function play() {
    if (looping || !ready || size.width === 0) return;
    looping = true;
    renderer.setAnimationLoop(loop);
  }

  /** One frame on the next animation frame, unless the loop is already drawing. */
  function requestFrame() {
    if (looping || pending || !ready) return;
    pending = requestAnimationFrame((now) => {
      pending = 0;
      if (render(now)) play();
    });
  }

  function resize(width: number, height: number, focus: Focus) {
    const sized = width !== size.width || height !== size.height;
    if (sized) {
      size.width = width;
      size.height = height;
      // Cap the drawing buffer at about 4 megapixels: a sharp picture without overloading big screens.
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.2e6 / Math.max(1, width * height)));
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      resolution.set(width, height);
    }
    const next = frameFor(focus);
    const settled = introDone || !options.animate;
    if (sized || !settled || (next.centerX === framing.centerX && next.distance === framing.distance)) {
      framing = next;
      reframe = null;
    } else {
      // Same canvas, new free space (the VS set went, the panel came): the camera reframes.
      reframe = { from: { ...framing }, to: next, start: performance.now() / 1000 };
      framing = next;
    }
    if (!introDone || reframe) play();
    else requestFrame();
  }

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    requestFrame();
  }

  // Player 2's look, now that frames can be asked for.
  if (options.guest) setGuest(options.guest);

  renderer
    .compileAsync(scene, camera)
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      ready = true;
      // The entrance starts with the first frame that can be drawn, so it is not half over by then.
      start = performance.now();
      if (!introDone || reframe) play();
      else requestFrame();
    });

  function dispose() {
    disposed = true;
    renderer.setAnimationLoop(null);
    if (pending) cancelAnimationFrame(pending);
    const textures = new Set<Texture>();
    const geometries = new Set<BufferGeometry>();
    const materialSet = new Set<Material>();
    scene.traverse((object: Object3D) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry as BufferGeometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materialSet.add(material as Material);
      if (object.customDepthMaterial) materialSet.add(object.customDepthMaterial);
    });
    for (const model of models.values()) geometries.add(model.body).add(model.outline);
    for (const material of materialSet) {
      for (const value of Object.values(material)) if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture);
      material.dispose();
    }
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { setPlacement: (placement) => { setPlacement(placement); update(performance.now()); requestFrame(); }, setGuest, resize, finishIntro, dispose };
}
