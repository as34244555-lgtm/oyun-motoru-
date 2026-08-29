import { api } from "./api.js";
import { createViewport } from "./viewport.js";
import { createBlockEditor } from "./blocks.js";
import { BACKDROPS, CHARACTERS, characterCostumes, characterKindOf } from "./library.js";
import { isometricThumb } from "./characters3d.js";
import { openPaintEditor } from "./paint.js";
import { exportAndroidProject, exportWebGame, siteUrl } from "./export.js";

const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25 };
let audioCtx = null;
function playTone(name, volume = 80) {
  try {
    audioCtx = audioCtx || new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = name === "meow" ? "triangle" : name === "boom" ? "sawtooth" : "square";
    osc.frequency.value = NOTES[name] || (name === "jump" ? 520 : name === "coin" ? 880 : name === "hit" ? 180 : 330);
    gain.gain.value = Math.max(0.02, volume / 200);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
  } catch (_) {
    /* ignore */
  }
}

const hierarchyEl = document.getElementById("hierarchy");
const inspectorEl = document.getElementById("inspector");
const statusMode = document.getElementById("status-mode");
const statusCount = document.getElementById("status-count");
const statusFps = document.getElementById("status-fps");
const scriptTarget = document.getElementById("script-target");
const playDot = document.getElementById("play-dot");
const btnPlay = document.getElementById("btn-play");
const btnStop = document.getElementById("btn-stop");
const cpuFrame = document.getElementById("cpu-frame");

const viewport = createViewport(document.getElementById("view"));
if (viewport.software) {
  const preview = document.querySelector(".engine-preview");
  if (preview) preview.style.display = "none";
}
const keys = new Set();
let state = { objects: [], playing: false };
let selectedId = "";
let savingScripts = false;
let cameraBusy = false;

const blocks = createBlockEditor({
  paletteEl: document.getElementById("palette"),
  scriptsEl: document.getElementById("scripts"),
  onChange: async (payload) => {
    if (savingScripts) return;
    savingScripts = true;
    try {
      await api.setScripts(payload);
    } finally {
      savingScripts = false;
    }
  },
});

function selected() {
  return (state.objects || []).find((o) => o.id === selectedId) || state.objects?.[0];
}

function renderHierarchy() {
  hierarchyEl.innerHTML = "";
  for (const object of state.objects || []) {
    const item = document.createElement("div");
    item.className = `tree-item${object.id === selectedId ? " active" : ""}`;
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = object.color?.hex || "#888";
    const name = document.createElement("span");
    name.textContent = object.name;
    if (object.catalogId) {
      const thumb = document.createElement("span");
      thumb.className = "swatch";
      thumb.style.background = "transparent";
      thumb.style.width = "22px";
      thumb.style.height = "18px";
      const ch = CHARACTERS.find((c) => c.id === object.catalogId);
      thumb.innerHTML = isometricThumb(ch?.hue ?? 28, characterKindOf(object.catalogId));
      const svg = thumb.querySelector("svg");
      if (svg) {
        svg.style.width = "22px";
        svg.style.height = "18px";
      }
      swatch.replaceWith(thumb);
    }
    const kind = document.createElement("span");
    kind.className = "kind";
    kind.textContent = object.catalogId || object.mesh;
    item.append(swatch, name, kind);
    item.addEventListener("click", () => selectObject(object.id));
    hierarchyEl.appendChild(item);
  }
  statusCount.textContent = String(state.objects?.length || 0);
}

function numField(label, value, onCommit, always = false) {
  const wrap = document.createElement("label");
  wrap.className = "field";
  wrap.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.1";
  input.value = Number(value ?? 0).toFixed(2);
  input.disabled = !always && !!state.playing;
  input.addEventListener("change", () => onCommit(Number(input.value)));
  wrap.appendChild(input);
  return wrap;
}

function renderCameraPanel(parent) {
  const cam = state.camera || {};
  const box = document.createElement("div");
  const h = document.createElement("label");
  h.className = "field";
  h.textContent = "Oyun kamerası";
  box.appendChild(h);
  const row = document.createElement("div");
  row.className = "row";
  for (const [key, label] of [["yaw", "Yaw"], ["pitch", "Pitch"], ["distance", "Mesafe"], ["fov", "FOV"]]) {
    row.appendChild(numField(label, cam[key], async (v) => {
      await api.updateCamera({ [key]: v });
      await refresh();
    }, true));
  }
  box.appendChild(row);
  const presets = document.createElement("div");
  presets.className = "row";
  for (const [id, label] of [["izometrik", "İzo"], ["on", "Ön"], ["yan", "Yan"], ["ust", "Üst"], ["fps", "FPS"]]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = label;
    b.addEventListener("click", async () => {
      await api.updateCamera({ preset: id });
      await refresh();
    });
    presets.appendChild(b);
  }
  box.appendChild(presets);
  parent.appendChild(box);
}

function renderInspector() {
  const object = selected();
  inspectorEl.innerHTML = "";
  renderCameraPanel(inspectorEl);
  if (!object) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Bir nesne seç.";
    inspectorEl.appendChild(empty);
    return;
  }
  const name = document.createElement("label");
  name.className = "field";
  name.textContent = "Ad";
  const nameIn = document.createElement("input");
  nameIn.type = "text";
  nameIn.value = object.name;
  nameIn.disabled = !!state.playing;
  nameIn.addEventListener("change", async () => {
    await api.updateObject(object.id, { name: nameIn.value });
    await refresh();
  });
  name.appendChild(nameIn);
  inspectorEl.appendChild(name);

  const color = document.createElement("label");
  color.className = "field";
  color.textContent = "Renk";
  const colorIn = document.createElement("input");
  colorIn.type = "color";
  colorIn.value = object.color?.hex || "#ffffff";
  colorIn.disabled = !!state.playing;
  colorIn.addEventListener("change", async () => {
    await api.updateObject(object.id, { color: colorIn.value });
    await refresh();
  });
  color.appendChild(colorIn);
  inspectorEl.appendChild(color);

  const vecRow = (title, vec, key) => {
    const box = document.createElement("div");
    const h = document.createElement("label");
    h.className = "field";
    h.textContent = title;
    box.appendChild(h);
    const row = document.createElement("div");
    row.className = "row";
    for (const axis of ["x", "y", "z"]) {
      row.appendChild(numField(axis.toUpperCase(), vec[axis], async (v) => {
        const next = { ...vec, [axis]: v };
        await api.updateObject(object.id, { [key]: next });
        await refresh();
      }));
    }
    box.appendChild(row);
    inspectorEl.appendChild(box);
  };
  if (object.sayText) {
    const say = document.createElement("div");
    say.className = "empty";
    say.textContent = `Konuşuyor: ${object.sayText}`;
    inspectorEl.appendChild(say);
  }
  if ((object.costumes || []).length) {
    const row = document.createElement("label");
    row.className = "field";
    row.textContent = `Kostüm (${(object.costumeIndex || 0) + 1}/${object.costumes.length})`;
    inspectorEl.appendChild(row);
  }
  vecRow("Konum", object.position, "position");
  vecRow("Döndürme", object.rotation, "rotation");
  vecRow("Ölçek", object.scale, "scale");

  const del = document.createElement("button");
  del.className = "btn danger";
  del.type = "button";
  del.textContent = "Nesneyi sil";
  del.disabled = !!state.playing || object.id === "ground";
  del.addEventListener("click", async () => {
    await api.removeObject(object.id);
    selectedId = "";
    await refresh();
  });
  inspectorEl.appendChild(del);
}

function setPlaying(playing) {
  state.playing = playing;
  btnPlay.disabled = playing;
  btnStop.disabled = !playing;
  playDot.classList.toggle("on", playing);
  statusMode.textContent = playing ? "Oynatılıyor" : "Düzenleme";
}

function selectObject(id) {
  selectedId = id;
  const object = selected();
  if (object) {
    scriptTarget.textContent = object.name;
    blocks.setTarget(object.id);
  }
  renderHierarchy();
  renderInspector();
}

async function refresh() {
  state = await api.state();
  const objects = state.objects || [];
  if (!selectedId && objects.length) {
    selectedId = (objects.find((o) => o.id === "cube") || objects[0]).id;
  }
  if (selectedId && !objects.some((o) => o.id === selectedId) && objects.length) {
    selectedId = objects[0].id;
  }
  const object = selected();
  if (object) {
    scriptTarget.textContent = object.name;
    blocks.setTarget(object.id);
  }
  viewport.sync(state);
  renderHierarchy();
  renderInspector();
  renderSpeech(state.objects);
  syncCameraDock(state.camera);
  setPlaying(!!state.playing);
}

async function addMesh(mesh) {
  const created = await api.addObject(mesh);
  selectedId = created.id;
  await refresh();
}

btnPlay.addEventListener("click", async () => {
  await api.setScripts(blocks.serialize());
  await api.play(blocks.serialize());
  setPlaying(true);
});
btnStop.addEventListener("click", async () => {
  await api.stop();
  await refresh();
});
function renderSpeech(objects) {
  const log = document.getElementById("speech-log");
  if (!log) return;
  log.innerHTML = "";
  for (const object of objects || []) {
    if (!object.sayText) continue;
    const b = document.createElement("div");
    b.className = "bubble";
    b.textContent = `${object.name}: ${object.sayText}`;
    log.appendChild(b);
  }
}

function openLibrary() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-card">
      <header>
        <h3>Kütüphane — karakterler ve dekorlar</h3>
        <button type="button" class="btn ghost" data-close>Kapat</button>
      </header>
      <div class="lib-tabs">
        <button type="button" class="btn primary" data-tab="chars">Karakterler (${CHARACTERS.length})</button>
        <button type="button" class="btn" data-tab="backs">Dekorlar (${BACKDROPS.length})</button>
      </div>
      <div class="lib-grid" id="lib-grid"></div>
    </div>`;
  document.body.appendChild(modal);
  const grid = modal.querySelector("#lib-grid");
  const showChars = () => {
    grid.innerHTML = "";
    for (const ch of CHARACTERS) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "lib-card";
      card.innerHTML = `<div class="thumb">${isometricThumb(ch.hue, characterKindOf(ch.id))}</div><span>${ch.name} · 3D</span>`;
      card.addEventListener("click", async () => {
        const created = await api.addObject({
          mesh: "character",
          name: ch.name,
          catalogId: ch.id,
          costumes: characterCostumes(ch.id),
        });
        selectedId = created.id;
        modal.remove();
        await refresh();
      });
      grid.appendChild(card);
    }
  };
  const showBacks = () => {
    grid.innerHTML = "";
    for (const bg of BACKDROPS) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "lib-card";
      card.innerHTML = `<div class="thumb" style="background:radial-gradient(circle at 70% 18%, rgba(255,255,255,.35), transparent 30%), linear-gradient(180deg, ${bg.sky} 0%, ${bg.sky} 46%, ${bg.ground} 46%, ${bg.ground} 100%)"></div><span>${bg.name}</span>`;
      card.addEventListener("click", async () => {
        await api.setBackdrop(bg.id);
        modal.remove();
        await refresh();
      });
      grid.appendChild(card);
    }
  };
  modal.querySelector('[data-tab="chars"]').addEventListener("click", (e) => {
    modal.querySelectorAll(".lib-tabs .btn").forEach((b) => b.classList.remove("primary"));
    e.currentTarget.classList.add("primary");
    showChars();
  });
  modal.querySelector('[data-tab="backs"]').addEventListener("click", (e) => {
    modal.querySelectorAll(".lib-tabs .btn").forEach((b) => b.classList.remove("primary"));
    e.currentTarget.classList.add("primary");
    showBacks();
  });
  modal.querySelector("[data-close]").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  showChars();
}

function publishDialog() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-card">
      <header>
        <h3>Yayınla — site, APK ve AAB</h3>
        <button type="button" class="btn ghost" data-close>Kapat</button>
      </header>
      <div style="padding:16px;display:grid;gap:10px;max-width:640px">
        <p>Kalıcı site (GitHub Pages): <a href="${siteUrl()}" target="_blank" rel="noreferrer">${siteUrl()}</a></p>
        <p>Oyunu telefona almak için <b>APK / AAB</b> ile Android projesini indir. Android Studio’da <code>assembleRelease</code> APK, <code>bundleRelease</code> Play Store AAB üretir.</p>
        <div class="row">
          <button type="button" class="btn primary" id="dl-web">Web oyunu (.html)</button>
          <button type="button" class="btn" id="dl-apk">Android proje (.zip)</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector("[data-close]").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector("#dl-web").addEventListener("click", async () => {
    const project = await api.project();
    project.scripts = blocks.serialize().scripts;
    await exportWebGame(project);
  });
  modal.querySelector("#dl-apk").addEventListener("click", async () => {
    const project = await api.project();
    project.scripts = blocks.serialize().scripts;
    await exportAndroidProject(project);
  });
}

document.getElementById("btn-library").addEventListener("click", openLibrary);
document.getElementById("btn-export-web")?.addEventListener("click", async () => {
  const project = await api.project();
  project.scripts = blocks.serialize().scripts;
  await exportWebGame(project);
});
document.getElementById("btn-export-apk")?.addEventListener("click", async () => {
  const project = await api.project();
  project.scripts = blocks.serialize().scripts;
  await exportAndroidProject(project);
});
document.getElementById("btn-publish")?.addEventListener("click", publishDialog);
document.getElementById("btn-paint").addEventListener("click", () => {
  const object = selected();
  if (!object) return;
  openPaintEditor({
    object,
    onSave: async (costumes, index) => {
      await api.updateObject(object.id, { costumes, costumeIndex: index, mesh: object.mesh === "cube" ? "sprite" : object.mesh });
      await refresh();
    },
  });
});
document.getElementById("btn-save").addEventListener("click", async () => {
  const project = await api.project();
  project.scripts = blocks.serialize().scripts;
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "blokmotor-proje.json";
  a.click();
});
document.getElementById("btn-load").addEventListener("click", () => document.getElementById("file-load").click());
document.getElementById("file-load").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const project = JSON.parse(await file.text());
  await api.loadProject(project);
  blocks.load(project);
  await refresh();
});
document.getElementById("btn-cube").addEventListener("click", () => addMesh("cube"));
document.getElementById("btn-sphere").addEventListener("click", () => addMesh("sphere"));
document.getElementById("btn-pyramid").addEventListener("click", () => addMesh("pyramid"));
document.getElementById("btn-plane").addEventListener("click", () => addMesh("plane"));
document.getElementById("btn-reset").addEventListener("click", async () => {
  await api.reset();
  const scripts = await api.scripts();
  blocks.load(scripts);
  await refresh();
});

window.addEventListener("keydown", (e) => {
  if (e.target.matches("input, select, textarea")) return;
  keys.add(e.code === "Space" ? "Space" : e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code === "Space" ? "Space" : e.code);
});

setInterval(async () => {
  if (state.playing) {
    try {
      if (keys.has("KeyQ") || keys.has("KeyE")) {
        const yaw = Number(state.camera?.yaw || 45) + (keys.has("KeyE") ? 4 : -4);
        await api.updateCamera({ yaw });
      }
      await api.input([...keys]);
      state = await api.state();
      viewport.sync(state);
      statusCount.textContent = String(state.objects?.length || 0);
      renderSpeech(state.objects);
      if (state.lastSound && state.lastSound !== playTone.last) {
        playTone.last = state.lastSound;
        playTone(state.lastSound, state.volume);
      }
      syncCameraDock(state.camera);
    } catch (_) {
      /* keep editor alive */
    }
  }
  statusFps.textContent = String(viewport.fps());
}, 50);

if (cpuFrame && !viewport.software) {
  setInterval(() => {
    cpuFrame.src = `api/frame.bmp?t=${Date.now()}`;
  }, 700);
}

function camInput(id) {
  return document.getElementById(id);
}

function syncCameraDock(cam) {
  if (!cam || cameraBusy) return;
  const pairs = [
    ["cam-yaw", "cam-yaw-val", cam.yaw, 0],
    ["cam-pitch", "cam-pitch-val", cam.pitch, 0],
    ["cam-dist", "cam-dist-val", cam.distance, 1],
    ["cam-fov", "cam-fov-val", cam.fov, 0],
  ];
  for (const [id, vid, value, digits] of pairs) {
    const input = camInput(id);
    const label = document.getElementById(vid);
    if (!input || document.activeElement === input) continue;
    input.value = Number(value ?? 0);
    if (label) label.textContent = Number(value ?? 0).toFixed(digits);
  }
}

function bindCameraDock() {
  const dock = document.getElementById("camera-dock");
  if (!dock) return;
  const send = async (patch) => {
    cameraBusy = true;
    try {
      await api.updateCamera(patch);
      const next = await api.state();
      state.camera = next.camera;
      viewport.sync({ ...state, ...next });
      syncCameraDock(next.camera);
    } finally {
      cameraBusy = false;
    }
  };
  for (const [id, key] of [["cam-yaw", "yaw"], ["cam-pitch", "pitch"], ["cam-dist", "distance"], ["cam-fov", "fov"]]) {
    const input = camInput(id);
    if (!input) continue;
    input.addEventListener("pointerdown", () => {
      cameraBusy = true;
    });
    input.addEventListener("input", () => {
      const label = document.getElementById(`${id}-val`);
      if (label) label.textContent = Number(input.value).toFixed(key === "distance" ? 1 : 0);
    });
    input.addEventListener("change", () => send({ [key]: Number(input.value) }));
    input.addEventListener("pointerup", () => send({ [key]: Number(input.value) }));
  }
  dock.querySelectorAll("[data-cam]").forEach((btn) => {
    btn.addEventListener("click", () => send({ preset: btn.getAttribute("data-cam") }));
  });
}

async function boot() {
  bindCameraDock();
  if (api.ready) await api.ready();
  if (api.mode?.() === "js") {
    const preview = document.querySelector(".engine-preview");
    if (preview) preview.style.display = "none";
    statusMode.textContent = "Web motoru";
  }
  const scripts = await api.scripts();
  blocks.load(scripts);
  await refresh();
  syncCameraDock(state.camera);
}

boot().catch((err) => {
  statusMode.textContent = `Hata: ${err.message}`;
});
