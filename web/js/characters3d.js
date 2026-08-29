import * as THREE from "three";

export function characterKind(catalogId) {
  const kinds = {
    kedi: "quadruped",
    kopek: "quadruped",
    tavsan: "quadruped",
    ayi: "quadruped",
    tilki: "quadruped",
    dinozor: "quadruped",
    kurbaga: "quadruped",
    karinca: "quadruped",
    unicorn: "quadruped",
    kus: "flyer",
    kelebek: "flyer",
    ari: "flyer",
    melek: "flyer",
    peri: "flyer",
    ejderha: "flyer",
    yarasa: "flyer",
    penguen: "flyer",
    baykus: "flyer",
    top: "round",
    balik: "fish",
    robot: "robot",
    golem: "robot",
    hayalet: "ghost",
    ninja: "ninja",
    sovalye: "knight",
    samuray: "knight",
    sihirbaz: "wizard",
    cadi: "wizard",
    uzayli: "alien",
    prenses: "royal",
    kral: "royal",
    kardanadam: "snow",
    kabak: "pumpkin",
    yildiz: "star",
  };
  return kinds[catalogId] || "humanoid";
}

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.38,
    metalness: 0.12,
    envMapIntensity: 0.6,
    ...extra,
  });
}

function remember(mesh) {
  mesh.userData.rest = {
    x: mesh.position.x,
    y: mesh.position.y,
    z: mesh.position.z,
    rx: mesh.rotation.x,
    ry: mesh.rotation.y,
    rz: mesh.rotation.z,
  };
  return mesh;
}

function box(w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return remember(mesh);
}

function sphere(r, color, x, y, z, seg = 22) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(12, seg - 4)), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return remember(mesh);
}

function capsule(r, len, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 10), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return remember(mesh);
}

function cone(r, h, color, x, y, z, rx = 0) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), mat(color));
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  mesh.castShadow = true;
  return remember(mesh);
}

function addEyes(group, x, y, z, spread = 0.1, r = 0.035) {
  group.add(sphere(r, 0xffffff, x - spread, y, z, 10));
  group.add(sphere(r, 0xffffff, x + spread, y, z, 10));
  group.add(sphere(r * 0.45, 0x111111, x - spread, y, z + r * 0.7, 8));
  group.add(sphere(r * 0.45, 0x111111, x + spread, y, z + r * 0.7, 8));
}

function humanoid(group, color, dark, light, tall = 1) {
  const body = box(0.34, 0.40 * tall, 0.22, color, 0, 0.42 * tall, 0);
  const head = sphere(0.155, light, 0, 0.74 * tall, 0, 24);
  const armL = capsule(0.055, 0.22 * tall, dark, -0.24, 0.42 * tall, 0);
  const armR = capsule(0.055, 0.22 * tall, dark, 0.24, 0.42 * tall, 0);
  const legL = capsule(0.06, 0.24 * tall, dark, -0.10, 0.12 * tall, 0);
  const legR = capsule(0.06, 0.24 * tall, dark, 0.10, 0.12 * tall, 0);
  group.add(body, head, armL, armR, legL, legR);
  addEyes(group, 0, 0.76 * tall, 0.12);
  group.userData.limbs = { armL, armR, legL, legR, head, body };
  return { body, head };
}

export function makeCharacter3D(object) {
  const group = new THREE.Group();
  const color = new THREE.Color(object.color?.hex || object.color || "#dd8844");
  const dark = color.clone().multiplyScalar(0.68);
  const light = color.clone().lerp(new THREE.Color("#ffffff"), 0.28);
  const id = object.catalogId || "";
  const kind = characterKind(id);
  group.userData.kind = kind;
  group.userData.catalogId = id;
  group.userData.limbs = {};

  if (kind === "quadruped") {
    const body = box(0.66, 0.30, 0.36, color, 0, 0.24, 0);
    const head = sphere(id === "ayi" ? 0.20 : 0.16, color, 0.34, 0.36, 0);
    const snout = box(0.12, 0.08, 0.10, light, 0.46, 0.30, 0);
    const earH = id === "tavsan" ? 0.28 : id === "ayi" ? 0.08 : 0.14;
    const earL = box(0.07, earH, 0.05, dark, 0.28, 0.48 + earH * 0.15, 0.09);
    const earR = box(0.07, earH, 0.05, dark, 0.28, 0.48 + earH * 0.15, -0.09);
    const tail = box(id === "dinozor" ? 0.36 : 0.20, 0.08, 0.08, dark, -0.40, 0.28, 0);
    const fl = box(0.09, 0.26, 0.09, dark, 0.18, 0.0, 0.12);
    const fr = box(0.09, 0.26, 0.09, dark, 0.18, 0.0, -0.12);
    const bl = box(0.09, 0.26, 0.09, dark, -0.18, 0.0, 0.12);
    const br = box(0.09, 0.26, 0.09, dark, -0.18, 0.0, -0.12);
    group.add(body, head, snout, earL, earR, tail, fl, fr, bl, br);
    addEyes(group, 0.38, 0.40, 0.10, 0.06, 0.03);
    if (id === "unicorn") group.add(cone(0.04, 0.18, 0xffe08a, 0.36, 0.56, 0));
    if (id === "dinozor") group.add(box(0.08, 0.16, 0.08, dark, 0.08, 0.44, 0));
    group.userData.limbs = { fl, fr, bl, br, tail, head };
  } else if (kind === "flyer") {
    const body = sphere(id === "ejderha" ? 0.22 : 0.17, color, 0, 0.30, 0);
    const head = sphere(0.13, color, 0, 0.46, 0.10);
    const beak = box(0.06, 0.05, 0.12, 0xffcc66, 0, 0.44, 0.20);
    const wingL = box(id === "kelebek" ? 0.50 : 0.44, 0.04, 0.24, light, -0.30, 0.32, 0);
    const wingR = box(id === "kelebek" ? 0.50 : 0.44, 0.04, 0.24, light, 0.30, 0.32, 0);
    const tail = box(0.08, 0.06, 0.20, dark, 0, 0.24, -0.22);
    group.add(body, head, beak, wingL, wingR, tail);
    addEyes(group, 0, 0.48, 0.18, 0.05, 0.025);
    if (id === "melek" || id === "peri") group.add(sphere(0.05, 0xffe08a, 0, 0.62, 0.08, 10));
    if (id === "ejderha") group.add(cone(0.05, 0.14, dark, 0, 0.58, 0.04));
    if (id === "penguen") {
      group.add(box(0.22, 0.28, 0.08, 0xf4f4f4, 0, 0.26, 0.12));
      group.add(box(0.10, 0.04, 0.12, 0xffaa33, 0, 0.06, 0.10));
    }
    group.userData.limbs = { wingL, wingR, tail, head };
  } else if (kind === "fish") {
    const body = sphere(0.28, color, 0, 0.32, 0);
    body.scale.set(1.35, 0.75, 0.7);
    const tail = box(0.06, 0.18, 0.16, dark, -0.36, 0.32, 0);
    const fin = box(0.10, 0.16, 0.04, light, 0, 0.48, 0);
    group.add(body, tail, fin);
    addEyes(group, 0.16, 0.36, 0.16, 0.08, 0.03);
    group.userData.limbs = { tail, body };
  } else if (kind === "round") {
    group.add(sphere(0.38, color, 0, 0.38, 0, 22));
    addEyes(group, 0, 0.46, 0.28, 0.12, 0.045);
  } else if (kind === "pumpkin") {
    group.add(sphere(0.40, color, 0, 0.38, 0, 20));
    group.add(box(0.08, 0.16, 0.08, 0x3d6b2a, 0, 0.72, 0));
    addEyes(group, 0, 0.44, 0.30, 0.12, 0.05);
    group.add(box(0.16, 0.04, 0.04, 0x1a1a1a, 0, 0.30, 0.34));
  } else if (kind === "star") {
    group.add(box(0.55, 0.16, 0.16, color, 0, 0.42, 0));
    group.add(box(0.16, 0.55, 0.16, color, 0, 0.42, 0));
    group.add(box(0.40, 0.16, 0.16, color, 0, 0.42, 0, 0, 0, Math.PI / 4));
    group.add(box(0.40, 0.16, 0.16, color, 0, 0.42, 0, 0, 0, -Math.PI / 4));
    addEyes(group, 0, 0.46, 0.12, 0.08, 0.03);
  } else if (kind === "robot") {
    const body = box(0.40, 0.42, 0.26, color, 0, 0.44, 0);
    const head = box(0.30, 0.24, 0.26, light, 0, 0.78, 0);
    const armL = box(0.10, 0.30, 0.10, dark, -0.28, 0.42, 0);
    const armR = box(0.10, 0.30, 0.10, dark, 0.28, 0.42, 0);
    const legL = box(0.12, 0.28, 0.14, dark, -0.12, 0.10, 0);
    const legR = box(0.12, 0.28, 0.14, dark, 0.12, 0.10, 0);
    group.add(body, head, armL, armR, legL, legR);
    group.add(box(0.22, 0.06, 0.04, 0x3ec6ff, 0, 0.80, 0.14));
    group.add(box(0.04, 0.14, 0.04, 0xdddddd, 0, 0.96, 0));
    group.add(sphere(0.03, 0xff5533, 0, 1.04, 0, 8));
    group.userData.limbs = { armL, armR, legL, legR, head };
  } else if (kind === "ghost") {
    const body = sphere(0.28, color, 0, 0.46, 0);
    body.material.transparent = true;
    body.material.opacity = 0.86;
    const skirt = box(0.46, 0.28, 0.30, color, 0, 0.22, 0);
    skirt.material.transparent = true;
    skirt.material.opacity = 0.8;
    group.add(body, skirt);
    addEyes(group, 0, 0.50, 0.20, 0.08, 0.04);
    group.userData.limbs = { body, head: body };
  } else if (kind === "ninja") {
    humanoid(group, color, dark, 0x222222);
    group.add(box(0.28, 0.06, 0.22, 0x111111, 0, 0.76, 0.02));
    group.add(box(0.04, 0.04, 0.42, 0xcccccc, 0.30, 0.42, 0.16, 0.2, 0, 0.4));
  } else if (kind === "knight") {
    humanoid(group, color, dark, 0xc0c6d0);
    group.add(box(0.22, 0.16, 0.22, 0xb8bec8, 0, 0.86, 0));
    group.add(box(0.18, 0.22, 0.04, 0x8a93a3, -0.34, 0.42, 0.06));
    group.add(box(0.05, 0.05, 0.40, 0xd8dde8, 0.32, 0.40, 0.16));
  } else if (kind === "wizard") {
    humanoid(group, color, dark, light);
    group.add(cone(0.16, 0.32, 0x3b2266, 0, 0.98, 0));
    group.add(box(0.04, 0.04, 0.46, 0xc9a227, 0.28, 0.36, 0.18, 0.4));
  } else if (kind === "alien") {
    const body = box(0.28, 0.30, 0.18, color, 0, 0.36, 0);
    const head = sphere(0.22, light, 0, 0.68, 0);
    const armL = box(0.08, 0.26, 0.08, dark, -0.22, 0.36, 0);
    const armR = box(0.08, 0.26, 0.08, dark, 0.22, 0.36, 0);
    const legL = box(0.09, 0.22, 0.09, dark, -0.08, 0.10, 0);
    const legR = box(0.09, 0.22, 0.09, dark, 0.08, 0.10, 0);
    group.add(body, head, armL, armR, legL, legR);
    group.add(box(0.03, 0.16, 0.03, 0x88ff88, -0.08, 0.92, 0));
    group.add(box(0.03, 0.16, 0.03, 0x88ff88, 0.08, 0.92, 0));
    addEyes(group, 0, 0.70, 0.16, 0.09, 0.055);
    group.userData.limbs = { armL, armR, legL, legR, head };
  } else if (kind === "royal") {
    humanoid(group, color, dark, light);
    group.add(box(0.28, 0.08, 0.28, 0xffd24a, 0, 0.90, 0));
    group.add(sphere(0.04, 0xff3355, 0, 0.98, 0, 8));
    if (id === "prenses") group.add(box(0.46, 0.28, 0.28, light, 0, 0.22, 0));
  } else if (kind === "snow") {
    group.add(sphere(0.28, 0xf4f8ff, 0, 0.24, 0));
    group.add(sphere(0.22, 0xf4f8ff, 0, 0.58, 0));
    group.add(sphere(0.16, 0xf4f8ff, 0, 0.84, 0));
    group.add(cone(0.04, 0.12, 0xff7a1a, 0, 0.82, 0.16, Math.PI / 2));
    addEyes(group, 0, 0.88, 0.12, 0.05, 0.025);
  } else {
    const tall = id === "dev" ? 1.35 : id === "cuce" ? 0.72 : 1;
    humanoid(group, color, dark, light, tall);
    if (id === "korsan") group.add(box(0.32, 0.08, 0.28, 0x1a1a1a, 0, 0.90, 0));
    if (id === "asci") group.add(box(0.22, 0.18, 0.22, 0xf5f5f5, 0, 0.96, 0));
    if (id === "doktor") group.add(box(0.10, 0.10, 0.02, 0xff3355, 0.16, 0.50, 0.12));
    if (id === "astronot") group.add(sphere(0.18, 0xcfd8e6, 0, 0.76, 0.02, 14));
    if (id === "kahraman") group.add(box(0.08, 0.36, 0.22, 0xff3344, 0, 0.36, -0.16));
    if (id === "palyaco") {
      group.add(sphere(0.05, 0xff3355, 0, 0.70, 0.14, 8));
      group.add(box(0.36, 0.08, 0.08, 0xff3355, 0, 0.90, 0));
    }
    if (id === "futbolcu") group.add(sphere(0.08, 0xffffff, 0.28, 0.18, 0.16, 10));
    if (id === "muzisyen") group.add(box(0.08, 0.22, 0.18, 0x6b3a1f, 0.28, 0.36, 0.08));
    if (id === "denizci") group.add(box(0.28, 0.06, 0.28, 0x2244aa, 0, 0.90, 0));
    if (id === "zombi") {
      group.userData.limbs.armL.rotation.z = 0.8;
      group.userData.limbs.armR.rotation.z = -0.15;
    }
  }
  return group;
}

function restOf(mesh) {
  return mesh?.userData?.rest || { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
}

function place(mesh, dx, dy, dz, rx, ry, rz) {
  if (!mesh) return;
  const r = restOf(mesh);
  mesh.position.set(r.x + dx, r.y + dy, r.z + dz);
  mesh.rotation.set(r.rx + rx, r.ry + ry, r.rz + rz);
}

export function poseCharacter(group, object, time = 0) {
  const limbs = group.userData.limbs || {};
  const vx = object.velocity?.x || 0;
  const vy = object.velocity?.y || 0;
  const vz = object.velocity?.z || 0;
  const speed = Math.hypot(vx, vz);
  const clip = object.animClip || (vy > 1.2 ? "jump" : speed > 0.08 || object.animating ? "walk" : "idle");
  const walkT = time * (clip === "walk" ? 9 : clip === "jump" ? 6 : 2.2);
  const swing = clip === "idle" ? Math.sin(walkT) * 0.1 : Math.sin(walkT) * 0.72;
  const breath = Math.sin(time * 2.4) * 0.018;
  const hop = clip === "jump" ? Math.max(0, vy) * 0.02 : 0;
  place(limbs.body, 0, breath + hop, 0, 0, 0, 0);
  place(limbs.head, 0, breath * 0.6 + hop, 0, Math.sin(walkT * 0.5) * 0.06, Math.sin(time) * 0.08, 0);
  place(limbs.armL, 0, 0, 0, swing, 0, clip === "wave" ? 1.2 : 0);
  place(limbs.armR, 0, 0, 0, -swing, 0, 0);
  place(limbs.legL, 0, 0, 0, -swing, 0, 0);
  place(limbs.legR, 0, 0, 0, swing, 0, 0);
  place(limbs.fl, 0, 0, 0, swing, 0, 0);
  place(limbs.fr, 0, 0, 0, -swing, 0, 0);
  place(limbs.bl, 0, 0, 0, -swing, 0, 0);
  place(limbs.br, 0, 0, 0, swing, 0, 0);
  place(limbs.wingL, 0, 0, 0, 0, 0, 0.4 + Math.sin(walkT * 1.4) * 0.55);
  place(limbs.wingR, 0, 0, 0, 0, 0, -0.4 - Math.sin(walkT * 1.4) * 0.55);
  place(limbs.tail, 0, 0, 0, 0, Math.sin(walkT) * 0.5, 0);
  if (group.userData.kind === "ghost") {
    place(limbs.body, 0, Math.sin(time * 2) * 0.06, 0, 0, 0, 0);
  }
  if (group.userData.kind === "fish") {
    place(limbs.body, 0, Math.sin(time * 3) * 0.04, 0, 0, Math.sin(time * 4) * 0.2, 0);
    place(limbs.tail, 0, 0, 0, 0, Math.sin(time * 8) * 0.6, 0);
  }
}

export function isometricThumb(hue, kind) {
  const c = `hsl(${hue} 72% 56%)`;
  const d = `hsl(${hue} 72% 38%)`;
  const l = `hsl(${hue} 70% 74%)`;
  if (kind === "quadruped") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,42 40,30 64,42 40,54" fill="${d}"/>
      <polygon points="16,42 16,28 40,16 40,30" fill="${c}"/>
      <polygon points="64,42 64,28 40,16 40,30" fill="${d}"/>
      <circle cx="56" cy="22" r="8" fill="${c}"/>
      <rect x="20" y="46" width="5" height="10" fill="${d}"/>
      <rect x="30" y="48" width="5" height="10" fill="${d}"/>
      <rect x="42" y="48" width="5" height="10" fill="${d}"/>
      <rect x="52" y="46" width="5" height="10" fill="${d}"/>
    </svg>`;
  }
  if (kind === "flyer") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="34" rx="10" ry="8" fill="${c}"/>
      <ellipse cx="20" cy="32" rx="16" ry="5" fill="${d}"/>
      <ellipse cx="60" cy="32" rx="16" ry="5" fill="${d}"/>
      <circle cx="40" cy="24" r="7" fill="${c}"/>
    </svg>`;
  }
  if (kind === "robot") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="26" width="24" height="20" fill="${c}"/>
      <rect x="32" y="12" width="16" height="12" fill="${l}"/>
      <rect x="36" y="16" width="8" height="4" fill="#3ec6ff"/>
      <rect x="22" y="28" width="6" height="14" fill="${d}"/>
      <rect x="52" y="28" width="6" height="14" fill="${d}"/>
      <rect x="32" y="46" width="6" height="12" fill="${d}"/>
      <rect x="42" y="46" width="6" height="12" fill="${d}"/>
    </svg>`;
  }
  if (kind === "ghost") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="30" rx="16" ry="18" fill="${c}"/>
      <rect x="24" y="30" width="32" height="20" fill="${c}"/>
      <circle cx="34" cy="28" r="3" fill="#111"/><circle cx="46" cy="28" r="3" fill="#111"/>
    </svg>`;
  }
  if (kind === "fish") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="42" cy="34" rx="16" ry="10" fill="${c}"/>
      <polygon points="20,34 10,24 10,44" fill="${d}"/>
      <circle cx="50" cy="32" r="2" fill="#111"/>
    </svg>`;
  }
  if (kind === "star" || kind === "pumpkin" || kind === "round" || kind === "snow") {
    return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="36" rx="16" ry="15" fill="${c}"/>
      <ellipse cx="34" cy="32" rx="3" ry="3" fill="#222"/>
      <ellipse cx="46" cy="32" rx="3" ry="3" fill="#222"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 80 64" xmlns="http://www.w3.org/2000/svg">
    <rect x="30" y="22" width="20" height="22" fill="${c}"/>
    <circle cx="40" cy="16" r="8" fill="${l}"/>
    <rect x="24" y="24" width="6" height="16" fill="${d}"/>
    <rect x="50" y="24" width="6" height="16" fill="${d}"/>
    <rect x="32" y="42" width="6" height="14" fill="${d}"/>
    <rect x="42" y="42" width="6" height="14" fill="${d}"/>
  </svg>`;
}
