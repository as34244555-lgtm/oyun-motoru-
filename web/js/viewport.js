import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function hexColor(color) {
  if (!color) return 0xcccccc;
  if (typeof color === "string") return new THREE.Color(color).getHex();
  return new THREE.Color(color.r ?? 1, color.g ?? 1, color.b ?? 1).getHex();
}

function makeMesh(object) {
  let geo;
  if (object.mesh === "sphere") geo = new THREE.SphereGeometry(0.5, 28, 18);
  else if (object.mesh === "plane") geo = new THREE.PlaneGeometry(1, 1);
  else if (object.mesh === "pyramid") geo = new THREE.ConeGeometry(0.62, 1, 4);
  else geo = new THREE.BoxGeometry(1, 1, 1);

  const mat = new THREE.MeshStandardMaterial({
    color: hexColor(object.color),
    roughness: 0.42,
    metalness: 0.08,
  });
  const mesh = new THREE.Mesh(geo, mat);
  if (object.mesh === "plane") {
    mesh.rotation.x = -Math.PI / 2;
    mat.side = THREE.DoubleSide;
  }
  mesh.castShadow = object.mesh !== "plane";
  mesh.receiveShadow = true;
  mesh.userData.id = object.id;
  return mesh;
}

export function createViewport(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1218);
  scene.fog = new THREE.Fog(0x0d1218, 18, 42);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
  camera.position.set(5.4, 3.6, 5.8);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0.6, 0);

  scene.add(new THREE.AmbientLight(0x9aa7c2, 0.55));
  const key = new THREE.DirectionalLight(0xfff4e5, 1.15);
  key.position.set(6, 10, 4);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6ec6ff, 0.35);
  fill.position.set(-8, 4, -6);
  scene.add(fill);

  const grid = new THREE.GridHelper(20, 20, 0x3a4658, 0x223042);
  grid.position.y = 0.001;
  scene.add(grid);

  const meshes = new Map();

  function resize() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth || 640;
    const h = parent.clientHeight || 360;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function sync(state) {
    const seen = new Set();
    for (const object of state.objects || []) {
      seen.add(object.id);
      let mesh = meshes.get(object.id);
      if (!mesh || mesh.userData.mesh !== object.mesh) {
        if (mesh) scene.remove(mesh);
        mesh = makeMesh(object);
        mesh.userData.mesh = object.mesh;
        meshes.set(object.id, mesh);
        scene.add(mesh);
      }
      mesh.visible = object.visible !== false;
      mesh.position.set(object.position.x, object.position.y, object.position.z);
      if (object.mesh !== "plane") {
        mesh.rotation.set(
          THREE.MathUtils.degToRad(object.rotation.x),
          THREE.MathUtils.degToRad(object.rotation.y),
          THREE.MathUtils.degToRad(object.rotation.z)
        );
      }
      mesh.scale.set(object.scale.x, object.scale.y, object.scale.z);
      mesh.material.color.setHex(hexColor(object.color?.hex || object.color));
    }
    for (const [id, mesh] of meshes) {
      if (!seen.has(id)) {
        scene.remove(mesh);
        meshes.delete(id);
      }
    }
  }

  let frames = 0;
  let last = performance.now();
  let fps = 0;
  function tick() {
    resize();
    controls.update();
    renderer.render(scene, camera);
    frames += 1;
    const now = performance.now();
    if (now - last > 500) {
      fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.addEventListener("resize", resize);

  return { sync, fps: () => fps };
}
