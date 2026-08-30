import * as THREE from "three";
import { backdropStyle } from "./library.js";

function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.04,
    ...extra,
  });
}

function addShadow(mesh, cast = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSky(skyHex, groundHex) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(46, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(skyHex) },
      bot: { value: new THREE.Color(groundHex).lerp(new THREE.Color(skyHex), 0.35) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 top;
      uniform vec3 bot;
      void main() {
        float h = clamp(vPos.y / 40.0 + 0.35, 0.0, 1.0);
        gl_FragColor = vec4(mix(bot, top, h), 1.0);
      }
    `,
  });
  group.add(new THREE.Mesh(geo, mat));
  return group;
}

function tree(x, z, height = 1.6, leaf = 0x3d8a4a, trunk = 0x6b4226) {
  const g = new THREE.Group();
  const t = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, height * 0.45, 8), std(trunk)));
  t.position.y = height * 0.22;
  const foliage = addShadow(new THREE.Mesh(new THREE.SphereGeometry(height * 0.32, 14, 10), std(leaf)));
  foliage.position.y = height * 0.62;
  g.add(t, foliage);
  g.position.set(x, 0, z);
  return g;
}

function rock(x, z, s = 0.35, color = 0x7a8178) {
  const m = addShadow(new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), std(color)));
  m.position.set(x, s * 0.45, z);
  m.rotation.y = x * 0.4;
  return m;
}

function building(x, z, w, h, d, color) {
  const m = addShadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color)));
  m.position.set(x, h * 0.5, z);
  return m;
}

function cloud(x, y, z, s = 1) {
  const g = new THREE.Group();
  const mat = std(0xffffff, { roughness: 1, transparent: true, opacity: 0.86 });
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 12, 10), mat);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.4 * s, 12, 10), mat);
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.38 * s, 12, 10), mat);
  b.position.set(0.45 * s, 0.05, 0);
  c.position.set(-0.4 * s, -0.02, 0.1);
  g.add(a, b, c);
  g.position.set(x, y, z);
  return g;
}

export function createWorld() {
  const root = new THREE.Group();
  root.name = "world";
  let current = "";
  let ground = null;

  function rebuild(id) {
    if (current === id) return;
    current = id;
    while (root.children.length) root.remove(root.children[0]);
    const theme = backdropStyle(id);
    root.add(makeSky(theme.sky, theme.ground));

    ground = addShadow(new THREE.Mesh(new THREE.CircleGeometry(18, 48), std(theme.ground)), false);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(17.2, 18.4, 48),
      std(new THREE.Color(theme.ground).multiplyScalar(0.65))
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.01;
    root.add(rim);

    if (id === "cayir" || id === "ciftlik") {
      root.add(tree(-6, -4, 2.1), tree(7, -5, 1.7), tree(-8, 3, 1.9, 0x4aa05a), tree(5.5, 6, 1.5));
      root.add(rock(-3, 4, 0.28), rock(4.2, -3.4, 0.22));
      root.add(cloud(-4, 7, -6, 1.3), cloud(6, 8, -8, 1.1));
    } else if (id === "orman" || id === "sonbahar") {
      const leaf = id === "sonbahar" ? 0xc46a22 : 0x245c2c;
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2;
        root.add(tree(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 1.5 + (i % 3) * 0.25, leaf));
      }
    } else if (id === "sehir" || id === "neon") {
      const cols = id === "neon" ? [0x5b2dff, 0xff2d7a, 0x22d3ee] : [0x4b5568, 0x6b7280, 0x374151];
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        root.add(building(Math.cos(a) * 9, Math.sin(a) * 9, 1.4, 2 + (i % 4), 1.4, cols[i % 3]));
      }
    } else if (id === "uzay" || id === "ay" || id === "gece") {
      const starMat = std(0xfff4c8, { roughness: 0.2, metalness: 0.4 });
      for (let i = 0; i < 40; i += 1) {
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), starMat);
        const a = Math.random() * Math.PI * 2;
        star.position.set(Math.cos(a) * (10 + Math.random() * 8), 4 + Math.random() * 10, Math.sin(a) * (10 + Math.random() * 8));
        root.add(star);
      }
      if (id === "ay") root.add(rock(-5, 3, 0.7, 0x8a8d93), rock(6, -2, 0.5, 0x6f737a));
    } else if (id === "deniz" || id === "sualti" || id === "gol") {
      ground.material.color.set(theme.ground);
      ground.material.transparent = true;
      ground.material.opacity = 0.92;
      root.add(rock(-4, 5, 0.4, 0x8aa0a8), rock(5, -4, 0.3, 0x6f8b92));
    } else if (id === "col") {
      root.add(rock(-6, 2, 0.8, 0xd2a15a), rock(5, -5, 0.55, 0xc48a3a));
      const dune = addShadow(new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 10), std(0xe3b361)), false);
      dune.scale.y = 0.28;
      dune.position.set(-8, 0.2, -7);
      root.add(dune);
    } else if (id === "kar") {
      root.add(tree(-6, -3, 1.8, 0xdeeeff, 0x8a6a4a), tree(6, 4, 1.6, 0xe8f4ff, 0x8a6a4a));
      root.add(cloud(-3, 6.5, -5, 1.4), cloud(5, 7.2, -7, 1.2));
    } else if (id === "volkan") {
      const cone = addShadow(new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.2, 10), std(0x4a1c12)));
      cone.position.set(-7, 1.5, -6);
      root.add(cone);
    } else if (id === "dag") {
      root.add(addShadow(new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.2, 8), std(0x6d8098))));
      root.children[root.children.length - 1].position.set(-8, 2, -8);
      root.add(addShadow(new THREE.Mesh(new THREE.ConeGeometry(2.1, 3.1, 8), std(0x8aa0b8))));
      root.children[root.children.length - 1].position.set(8, 1.5, -7);
    } else if (id === "kale") {
      root.add(building(-8, -6, 2, 3.2, 2, 0x6b7280), building(8, -6, 1.4, 4, 1.4, 0x7b8190));
    } else if (id === "stadyum") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.35, 8, 32), std(0x4b5563));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.4;
      root.add(ring);
    } else if (id === "bulutlar") {
      root.add(cloud(-5, 3, -4, 1.6), cloud(3, 4, -6, 1.8), cloud(6, 2.5, 3, 1.3));
    } else {
      root.add(tree(-7, -5, 1.7), rock(6, 4, 0.3), cloud(2, 7, -8, 1.1));
    }
  }

  return {
    root,
    rebuild,
    setGroundColor(hex) {
      if (ground) ground.material.color.set(hex);
    },
  };
}
