import { characterCostumes } from "./library.js";

function vec(x = 0, y = 0, z = 0) {
  return { x, y, z };
}
function rgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, hex };
}

function ground() {
  return {
    id: "ground", name: "Zemin", mesh: "plane", position: vec(), rotation: vec(), scale: vec(14, 1, 14),
    color: rgb("#476b57"), velocity: vec(), visible: true, dynamic: false, grounded: true, trigger: false,
    catalogId: "", costumes: [], costumeIndex: 0, opacity: 1, size: 100, layer: 0, sayText: "", sayTime: 0,
    animating: false, animFps: 6, animClip: "idle", isClone: false,
  };
}

function cat(extra = {}) {
  return {
    id: "cat", name: "Kedi", mesh: "character", position: vec(0, 0.55, 0), rotation: vec(), scale: vec(1, 1, 1),
    color: rgb("#f59e48"), velocity: vec(), visible: true, dynamic: true, grounded: false, trigger: false,
    catalogId: "kedi", costumes: characterCostumes("kedi"), costumeIndex: 0, opacity: 1, size: 100, layer: 0,
    sayText: "", sayTime: 0, animating: false, animFps: 8, animClip: "idle", isClone: false, ...extra,
  };
}

const camera = {
  position: { x: 6.2, y: 4.2, z: 6.6 }, target: { x: 0.2, y: 0.5, z: 0 },
  fov: 50, yaw: 45, pitch: 28, distance: 9.2, follow: "",
};

export const EXAMPLES = [
  {
    id: "kedi-ziplar",
    name: "Kedi zıplar",
    project: {
      backdrop: "cayir",
      gravity: -20,
      camera: { ...camera },
      objects: [
        ground(),
        cat(),
      ],
      scripts: [
        { target: "cat", hat: { op: "when_start", args: {} }, stack: [{ op: "say", args: { text: "Space ile zıpla!", seconds: "2" } }] },
        {
          target: "cat",
          hat: { op: "every_frame", args: {} },
          stack: [{ op: "if", cond: { op: "key_down", args: { key: "Space" } }, then: [{ op: "jump", args: { force: "8" } }] }],
        },
      ],
    },
  },
  {
    id: "top-yuvarlanir",
    name: "Top yuvarlanır",
    project: {
      backdrop: "cayir",
      gravity: -20,
      camera: { ...camera, yaw: 20, distance: 10 },
      objects: [
        ground(),
        {
          id: "ball", name: "Top", mesh: "sphere", position: vec(-2, 0.5, 0), rotation: vec(), scale: vec(1, 1, 1),
          color: rgb("#389ef2"), velocity: vec(), visible: true, dynamic: true, grounded: false, trigger: false,
          catalogId: "", costumes: [], costumeIndex: 0, opacity: 1, size: 100, layer: 0, sayText: "", sayTime: 0,
          animating: false, animFps: 6, animClip: "idle", isClone: false,
        },
        {
          id: "wall", name: "Platform", mesh: "cube", position: vec(2.4, 0.35, 0), rotation: vec(), scale: vec(1.6, 0.7, 1.6),
          color: rgb("#8b5a2b"), velocity: vec(), visible: true, dynamic: false, grounded: true, trigger: false,
          catalogId: "", costumes: [], costumeIndex: 0, opacity: 1, size: 100, layer: 0, sayText: "", sayTime: 0,
          animating: false, animFps: 6, animClip: "idle", isClone: false,
        },
      ],
      scripts: [
        { target: "ball", hat: { op: "when_start", args: {} }, stack: [{ op: "set_velocity", args: { x: "3", y: "0", z: "0" } }] },
        { target: "ball", hat: { op: "every_frame", args: {} }, stack: [{ op: "bounce_edge", args: {} }] },
      ],
    },
  },
  {
    id: "kamera-takip",
    name: "Kamera takip",
    project: {
      backdrop: "cayir",
      gravity: -20,
      camera: { ...camera, follow: "cat" },
      objects: [ground(), cat({ position: vec(0, 0.55, 0) })],
      scripts: [
        { target: "cat", hat: { op: "when_start", args: {} }, stack: [
          { op: "start_anim", args: { fps: "8" } },
          { op: "camera_follow", args: { name: "cat" } },
          { op: "say", args: { text: "WASD ile yürü", seconds: "3" } },
        ] },
        { target: "cat", hat: { op: "every_frame", args: {} }, stack: [
          { op: "if", cond: { op: "key_down", args: { key: "KeyA" } }, then: [{ op: "change_position", args: { x: "-0.08", y: "0", z: "0" } }] },
          { op: "if", cond: { op: "key_down", args: { key: "KeyD" } }, then: [{ op: "change_position", args: { x: "0.08", y: "0", z: "0" } }] },
          { op: "if", cond: { op: "key_down", args: { key: "KeyW" } }, then: [{ op: "change_position", args: { x: "0", y: "0", z: "-0.08" } }] },
          { op: "if", cond: { op: "key_down", args: { key: "KeyS" } }, then: [{ op: "change_position", args: { x: "0", y: "0", z: "0.08" } }] },
        ] },
      ],
    },
  },
];
