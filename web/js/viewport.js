import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { backdropStyle } from "./library.js";
import { makeCharacter3D, poseCharacter } from "./characters3d.js";

function hexColor(color) {
  if (!color) return 0xcccccc;
  if (typeof color === "string") return new THREE.Color(color).getHex();
  return new THREE.Color(color.r ?? 1, color.g ?? 1, color.b ?? 1).getHex();
}

function makeMesh(object) {
  if (object.mesh === "character" || object.mesh === "sprite" || object.catalogId) {
    const group = makeCharacter3D(object);
    group.userData.id = object.id;
    group.userData.isCharacter = true;
    return group;
  }
  const mat = new THREE.MeshStandardMaterial({
    color: hexColor(object.color),
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity: object.opacity ?? 1,
  });
  let mesh;
  if (object.mesh === "sphere") mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), mat);
  else if (object.mesh === "plane") {
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.rotation.x = -Math.PI / 2;
    mat.side = THREE.DoubleSide;
  } else if (object.mesh === "pyramid") mesh = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1, 4), mat);
  else if (object.mesh === "capsule") mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 6, 10), mat);
  else mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);

  mesh.castShadow = object.mesh !== "plane";
  mesh.receiveShadow = true;
  mesh.userData.id = object.id;
  return mesh;
}

function createSoftwareViewport(canvas) {
  const img = document.createElement("img");
  img.alt = "C++ yazılım renderer";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.display = "block";
  img.id = canvas.id || "view";
  canvas.replaceWith(img);
  let frames = 0;
  let last = performance.now();
  let fps = 0;
  const tick = () => {
    img.src = `/api/frame.bmp?t=${Date.now()}`;
    frames += 1;
    const now = performance.now();
    if (now - last > 500) {
      fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
    }
  };
  tick();
  setInterval(tick, 140);
  return {
    sync() {},
    fps: () => fps,
    software: true,
  };
}

export function createViewport(canvas) {
  try {
    return createWebGLViewport(canvas);
  } catch (err) {
    console.warn("WebGL yok, C++ yazılım renderer kullanılıyor", err);
    return createSoftwareViewport(canvas);
  }
}

function createWebGLViewport(canvas) {
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
  let controlsDragging = false;
  controls.addEventListener("start", () => {
    controlsDragging = true;
  });
  controls.addEventListener("end", () => {
    controlsDragging = false;
  });

  function resize() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth || 640;
    const h = parent.clientHeight || 360;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function sync(state) {
    const bg = backdropStyle(state.backdrop || "cayir");
    scene.background = new THREE.Color(bg.sky);
    scene.fog = new THREE.Fog(new THREE.Color(bg.sky), 16, 46);
    const seen = new Set();
    for (const object of state.objects || []) {
      seen.add(object.id);
      let mesh = meshes.get(object.id);
      const costumeKey = `${object.mesh}|${object.catalogId}|${object.color?.hex || ""}`;
      if (!mesh || mesh.userData.mesh !== object.mesh || mesh.userData.costumeKey !== costumeKey) {
        if (mesh) scene.remove(mesh);
        mesh = makeMesh(object);
        mesh.userData.mesh = object.mesh;
        mesh.userData.costumeKey = costumeKey;
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
      const s = Math.max(0.15, (object.size || 100) / 100);
      mesh.scale.set(object.scale.x * s, object.scale.y * s, object.scale.z * s);
      if (mesh.userData.isCharacter) poseCharacter(mesh, object);
      if (mesh.material) {
        mesh.material.opacity = object.opacity ?? 1;
        mesh.material.color.setHex(hexColor(object.color?.hex || object.color));
      }
    }
    for (const [id, mesh] of meshes) {
      if (!seen.has(id)) {
        scene.remove(mesh);
        meshes.delete(id);
      }
    }
    applyGameCamera(state);
  }

  function applyGameCamera(state) {
    const cam = state.camera;
    if (!cam) return;
    if (state.playing) controls.enabled = false;
    else controls.enabled = true;
    if (state.playing || !controlsDragging) {
      camera.fov = cam.fov || 50;
      camera.updateProjectionMatrix();
      if (cam.position) camera.position.set(cam.position.x, cam.position.y, cam.position.z);
      if (cam.target) {
        camera.lookAt(cam.target.x, cam.target.y, cam.target.z);
        controls.target.set(cam.target.x, cam.target.y, cam.target.z);
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
