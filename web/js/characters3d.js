import * as THREE from "three";

const QUADS = new Set(["kedi", "kopek", "tavsan", "ayi", "tilki", "dinozor", "kurbaga", "karinca"]);
const FLYERS = new Set(["kus", "kelebek", "ari", "melek", "peri", "ejderha", "yarasa", "penguen", "baykus"]);
const ROUNDS = new Set(["top", "kabak", "yildiz", "balik"]);

export function characterKind(catalogId) {
  if (QUADS.has(catalogId)) return "quadruped";
  if (FLYERS.has(catalogId)) return "flyer";
  if (ROUNDS.has(catalogId)) return "round";
  return "humanoid";
}

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.08,
    ...extra,
  });
}

function box(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function sphere(r, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export function makeCharacter3D(object) {
  const group = new THREE.Group();
  const color = new THREE.Color(object.color?.hex || object.color || "#dd8844");
  const dark = color.clone().multiplyScalar(0.72);
  const light = color.clone().lerp(new THREE.Color("#ffffff"), 0.25);
  const kind = characterKind(object.catalogId);
  group.userData.kind = kind;
  group.userData.limbs = {};

  if (kind === "quadruped") {
    const body = box(0.62, 0.28, 0.34, color, 0, 0.22, 0);
    const head = sphere(0.16, color, 0.32, 0.34, 0);
    const earL = box(0.06, 0.12, 0.05, dark, 0.28, 0.50, 0.08);
    const earR = box(0.06, 0.12, 0.05, dark, 0.28, 0.50, -0.08);
    const tail = box(0.18, 0.07, 0.07, dark, -0.36, 0.26, 0);
    const fl = box(0.09, 0.26, 0.09, dark, 0.18, 0.0, 0.12);
    const fr = box(0.09, 0.26, 0.09, dark, 0.18, 0.0, -0.12);
    const bl = box(0.09, 0.26, 0.09, dark, -0.18, 0.0, 0.12);
    const br = box(0.09, 0.26, 0.09, dark, -0.18, 0.0, -0.12);
    group.add(body, head, earL, earR, tail, fl, fr, bl, br);
    group.userData.limbs = { fl, fr, bl, br, tail, head };
  } else if (kind === "flyer") {
    const body = sphere(0.18, color, 0, 0.28, 0);
    const head = sphere(0.12, color, 0, 0.42, 0.08);
    const beak = box(0.06, 0.05, 0.10, 0xffcc66, 0, 0.40, 0.18);
    const wingL = box(0.46, 0.05, 0.22, light, -0.28, 0.30, 0);
    const wingR = box(0.46, 0.05, 0.22, light, 0.28, 0.30, 0);
    const tail = box(0.08, 0.06, 0.18, dark, 0, 0.22, -0.20);
    group.add(body, head, beak, wingL, wingR, tail);
    group.userData.limbs = { wingL, wingR, tail };
  } else if (kind === "round") {
    group.add(sphere(0.38, color, 0, 0.38, 0));
    const eyeL = sphere(0.05, 0x222222, -0.12, 0.46, 0.28);
    const eyeR = sphere(0.05, 0x222222, 0.12, 0.46, 0.28);
    group.add(eyeL, eyeR);
  } else {
    const body = box(0.34, 0.40, 0.20, color, 0, 0.42, 0);
    const head = sphere(0.15, light, 0, 0.74, 0);
    const armL = box(0.10, 0.28, 0.10, dark, -0.24, 0.42, 0);
    const armR = box(0.10, 0.28, 0.10, dark, 0.24, 0.42, 0);
    const legL = box(0.11, 0.30, 0.11, dark, -0.10, 0.10, 0);
    const legR = box(0.11, 0.30, 0.11, dark, 0.10, 0.10, 0);
    group.add(body, head, armL, armR, legL, legR);
    group.userData.limbs = { armL, armR, legL, legR, head };
  }
  group.traverse((child) => {
    if (child.isMesh) child.receiveShadow = true;
  });
  return group;
}

export function poseCharacter(group, object) {
  const limbs = group.userData.limbs || {};
  const swing = ((object.costumeIndex || 0) % 2 === 0 ? 1 : -1) * (object.animating ? 0.55 : 0.12);
  if (limbs.armL) limbs.armL.rotation.x = swing;
  if (limbs.armR) limbs.armR.rotation.x = -swing;
  if (limbs.legL) limbs.legL.rotation.x = -swing;
  if (limbs.legR) limbs.legR.rotation.x = swing;
  if (limbs.fl) limbs.fl.rotation.x = swing;
  if (limbs.fr) limbs.fr.rotation.x = -swing;
  if (limbs.bl) limbs.bl.rotation.x = -swing;
  if (limbs.br) limbs.br.rotation.x = swing;
  if (limbs.wingL) limbs.wingL.rotation.z = 0.35 + swing;
  if (limbs.wingR) limbs.wingR.rotation.z = -0.35 - swing;
  if (limbs.tail) limbs.tail.rotation.y = swing * 0.6;
}

export function isometricThumb(hue, kind) {
  const c = `hsl(${hue} 72% 56%)`;
  const d = `hsl(${hue} 72% 38%)`;
  if (kind === "quadruped") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <polygon points="18,40 40,30 62,40 40,50" fill="${d}"/>
      <polygon points="18,40 18,28 40,18 40,30" fill="${c}"/>
      <polygon points="62,40 62,28 40,18 40,30" fill="${d}"/>
      <circle cx="54" cy="24" r="8" fill="${c}"/>
      <rect x="22" y="44" width="5" height="10" fill="${d}"/>
      <rect x="32" y="46" width="5" height="10" fill="${d}"/>
      <rect x="42" y="46" width="5" height="10" fill="${d}"/>
      <rect x="50" y="44" width="5" height="10" fill="${d}"/>
    </svg>`;
  }
  if (kind === "flyer") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="34" rx="10" ry="8" fill="${c}"/>
      <ellipse cx="22" cy="32" rx="14" ry="5" fill="${d}"/>
      <ellipse cx="58" cy="32" rx="14" ry="5" fill="${d}"/>
      <circle cx="40" cy="24" r="7" fill="${c}"/>
    </svg>`;
  }
  if (kind === "round") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="36" rx="16" ry="15" fill="${c}"/>
      <ellipse cx="34" cy="32" rx="3" ry="3" fill="#222"/>
      <ellipse cx="46" cy="32" rx="3" ry="3" fill="#222"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
    <rect x="30" y="22" width="20" height="22" fill="${c}"/>
    <circle cx="40" cy="16" r="8" fill="${c}"/>
    <rect x="24" y="24" width="6" height="16" fill="${d}"/>
    <rect x="50" y="24" width="6" height="16" fill="${d}"/>
    <rect x="32" y="42" width="6" height="14" fill="${d}"/>
    <rect x="42" y="42" width="6" height="14" fill="${d}"/>
  </svg>`;
}
