import { api } from "./api.js";
import { createViewport } from "./viewport.js";
import { createBlockEditor } from "./blocks.js";
import { BACKDROPS, CHARACTERS, characterCostumes, characterKindOf } from "./library.js";
import { isometricThumb } from "./characters3d.js";
import { openPaintEditor } from "./paint.js";
import { exportAndroidProject, exportWebGame, pagesUrl, siteUrl } from "./export.js";
import { EXAMPLES } from "./examples.js";
import { addSoundFile, loadSounds, playSound, soundNames, uploadedSounds } from "./sounds.js";

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

function toast(msg) {
  const hint = document.getElementById("hint");
  if (hint) hint.textContent = msg;
}

const blocks = createBlockEditor({
  paletteEl: document.getElementById("palette"),
  scriptsEl: document.getElementById("scripts"),
  catsEl: document.getElementById("categories"),
  onBeforeChange: () => pushHistory(),
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

function isPlayable(object) {
  return object && object.mesh !== "plane" && object.id !== "ground";
}

function selected() {
  const objects = state.objects || [];
  const found = objects.find((o) => o.id === selectedId);
  if (isPlayable(found)) return found;
  return objects.find(isPlayable) || null;
}

function renderHierarchy() {
  hierarchyEl.innerHTML = "";
  for (const object of state.objects || []) {
    if (object.mesh === "plane" || object.id === "ground") continue;
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
      thumb.style.width = "36px";
      thumb.style.height = "28px";
      const ch = CHARACTERS.find((c) => c.id === object.catalogId);
      thumb.innerHTML = isometricThumb(ch?.hue ?? 28, characterKindOf(object.catalogId));
      const svg = thumb.querySelector("svg");
      if (svg) {
        svg.style.width = "36px";
        svg.style.height = "28px";
      }
      swatch.replaceWith(thumb);
    }
    item.append(swatch, name);
    item.addEventListener("click", () => selectObject(object.id));
    hierarchyEl.appendChild(item);
  }
  if (!hierarchyEl.children.length) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.className = "sprite-empty";
    empty.textContent = "Kukla ekle";
    empty.addEventListener("click", () => openLibrary());
    hierarchyEl.appendChild(empty);
  }
  statusCount.textContent = String((state.objects || []).filter((o) => o.mesh !== "plane" && o.id !== "ground").length || 0);
  const card = document.getElementById("backdrop-card");
  if (card) {
    const bg = BACKDROPS.find((b) => b.id === state.backdrop) || BACKDROPS[0];
    card.textContent = bg?.name || "Sahne";
    if (bg) {
      card.style.background = `linear-gradient(180deg, ${bg.sky} 0%, ${bg.sky} 46%, ${bg.ground} 46%)`;
    }
  }
  renderCostumeTab();
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
  if (!object) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Bir kukla seç.";
    inspectorEl.appendChild(empty);
    return;
  }
  const name = document.createElement("label");
  name.className = "field";
  name.textContent = "Kukla";
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

  const pos = object.position || { x: 0, y: 0, z: 0 };
  const row = document.createElement("div");
  row.className = "row";
  for (const axis of ["x", "y", "z"]) {
    row.appendChild(numField(axis.toUpperCase(), pos[axis], async (v) => {
      await api.updateObject(object.id, { position: { ...pos, [axis]: v } });
      await refresh();
    }));
  }
  inspectorEl.appendChild(row);

  const size = document.createElement("label");
  size.className = "field";
  size.textContent = "Boyut %";
  const sizeIn = document.createElement("input");
  sizeIn.type = "number";
  sizeIn.value = Math.round((object.scale?.x || 1) * 100);
  sizeIn.disabled = !!state.playing;
  sizeIn.addEventListener("change", async () => {
    const s = Number(sizeIn.value) / 100;
    await api.updateObject(object.id, { scale: { x: s, y: s, z: s } });
    await refresh();
  });
  size.appendChild(sizeIn);
  inspectorEl.appendChild(size);

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

  const del = document.createElement("button");
  del.className = "btn danger";
  del.type = "button";
  del.textContent = "Sil";
  del.disabled = !!state.playing || object.id === "ground";
  del.addEventListener("click", async () => {
    pushHistory();
    await api.removeObject(object.id);
    selectedId = "";
    await refresh();
  });
  inspectorEl.appendChild(del);
}

function renderCostumeTab() {
  const name = document.getElementById("costume-target");
  const list = document.getElementById("costume-list");
  if (!name || !list) return;
  const object = selected();
  name.textContent = object?.name || "—";
  list.innerHTML = "";
  const costumes = object?.costumes || [];
  if (!costumes.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Bu kuklanın henüz boyalı kostümü yok. Kostüm çiz ile ekle.";
    list.appendChild(empty);
    return;
  }
  costumes.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn${i === (object.costumeIndex || 0) ? " primary" : ""}`;
    b.textContent = c.name || `kostüm ${i + 1}`;
    list.appendChild(b);
  });
}

function renderSoundTab() {
  const list = document.getElementById("sound-list");
  if (!list) return;
  list.innerHTML = "";
  const lead = document.createElement("p");
  lead.className = "pane-lead";
  lead.textContent = "Hazır sesler veya kendi dosyan (.mp3 / .wav).";
  list.appendChild(lead);
  const upload = document.createElement("input");
  upload.type = "file";
  upload.accept = "audio/*";
  upload.addEventListener("change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    const data = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
    pushHistory();
    addSoundFile(file.name, data);
    renderSoundTab();
  });
  list.appendChild(upload);
  for (const name of soundNames()) {
    const row = document.createElement("div");
    row.className = "sound-item";
    row.innerHTML = `<span>${name}</span>`;
    const play = document.createElement("button");
    play.type = "button";
    play.className = "btn primary";
    play.textContent = "Çal";
    play.addEventListener("click", () => playSound(name, 80));
    row.appendChild(play);
    list.appendChild(row);
  }
}

function setEditorTab(tab) {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.getElementById("tab-code")?.classList.toggle("hidden", tab !== "code");
  document.getElementById("tab-costumes")?.classList.toggle("hidden", tab !== "costumes");
  document.getElementById("tab-sounds")?.classList.toggle("hidden", tab !== "sounds");
  if (tab === "costumes") renderCostumeTab();
  if (tab === "sounds") renderSoundTab();
}

function closeMenus() {
  document.querySelectorAll(".menu.open, .add-wrap.open").forEach((el) => el.classList.remove("open"));
}

const history = { past: [], future: [] };
let historyBusy = false;

function snapshot() {
  return {
    state: structuredClone(state),
    scripts: blocks.serialize(),
    sounds: uploadedSounds(),
  };
}

function pushHistory() {
  if (historyBusy) return;
  history.past.push(snapshot());
  if (history.past.length > 40) history.past.shift();
  history.future = [];
}

async function restoreSnap(snap) {
  historyBusy = true;
  try {
    loadSounds(snap.sounds);
    await api.loadProject({ ...snap.state, scripts: snap.scripts.scripts });
    blocks.load(snap.scripts);
    await refresh();
  } finally {
    historyBusy = false;
  }
}

async function undo() {
  if (!history.past.length) return;
  history.future.push(snapshot());
  await restoreSnap(history.past.pop());
}

async function redo() {
  if (!history.future.length) return;
  history.past.push(snapshot());
  await restoreSnap(history.future.pop());
}

async function loadExample(id) {
  const ex = EXAMPLES.find((e) => e.id === id);
  if (!ex) return;
  pushHistory();
  await api.loadProject(structuredClone(ex.project));
  blocks.load(ex.project);
  selectedId = (ex.project.objects.find((o) => o.id !== "ground") || {}).id || "";
  await refresh();
  toast(`${ex.name} yüklendi`);
}

function showGuide(force = false) {
  if (!force && localStorage.getItem("blokmotor-guide") === "1") return;
  const old = document.getElementById("guide-modal");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.id = "guide-modal";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-card">
      <header>
        <h3>İlk oyun — 4 adım</h3>
        <button type="button" class="btn ghost" data-close>Kapat</button>
      </header>
      <ol class="guide-steps">
        <li><b>Kukla ekle</b> — Kuklalar’daki + veya Kütüphane.</li>
        <li><b>Olay</b> — Olaylar → Oyun başlayınca veya Her kare.</li>
        <li><b>Hareket</b> — zıpla veya konumu değiştir.</li>
        <li><b>Oynat</b> — yeşil bayrak. Space ile dene.</li>
      </ol>
      <div style="padding:0 16px 16px" class="row">
        <button type="button" class="btn primary" id="guide-example">Kedi zıplar örneği</button>
        <button type="button" class="btn" data-close>Boş başla</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
    localStorage.setItem("blokmotor-guide", "1");
    modal.remove();
  }));
  modal.querySelector("#guide-example").addEventListener("click", async () => {
    localStorage.setItem("blokmotor-guide", "1");
    modal.remove();
    await loadExample("kedi-ziplar");
  });
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
  const objects = (state.objects || []).filter(isPlayable);
  if (!selectedId && objects.length) selectedId = objects[0].id;
  if (selectedId && !objects.some((o) => o.id === selectedId)) {
    selectedId = objects[0]?.id || "";
  }
  const object = selected();
  if (object) {
    scriptTarget.textContent = object.name;
    blocks.setTarget(object.id);
  } else {
    scriptTarget.textContent = "—";
    blocks.setTarget("");
  }
  viewport.sync(state);
  renderHierarchy();
  renderInspector();
  renderSpeech(state.objects);
  syncCameraDock(state.camera);
  setPlaying(!!state.playing);
}

async function addMesh(mesh) {
  pushHistory();
  const created = await api.addObject(typeof mesh === "string" ? { mesh } : mesh);
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

function openLibrary(startTab = "chars") {
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
        pushHistory();
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
  if (startTab === "backs") {
    modal.querySelector('[data-tab="backs"]').classList.add("primary");
    modal.querySelector('[data-tab="chars"]').classList.remove("primary");
    showBacks();
  } else {
    showChars();
  }
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
        <p>Çalışan kalıcı site: <a href="${siteUrl()}" target="_blank" rel="noreferrer">${siteUrl()}</a></p>
        <p>GitHub Pages (açılınca): <a href="${pagesUrl()}" target="_blank" rel="noreferrer">${pagesUrl()}</a></p>
        <p>Oyunu telefona almak için <b>APK / AAB</b> ile Android projesini indir. Android Studio’da <code>assembleRelease</code> APK, <code>bundleRelease</code> Play Store AAB üretir.</p>
        <p>Hazır debug APK: GitHub → Actions → <b>android-apk-aab</b> → artifact <code>blokmotor-android</code>.</p>
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
    project.sounds = uploadedSounds();
    await exportWebGame(project);
  });
  modal.querySelector("#dl-apk").addEventListener("click", async () => {
    const project = await api.project();
    project.scripts = blocks.serialize().scripts;
    project.sounds = uploadedSounds();
    await exportAndroidProject(project);
  });
}

document.getElementById("btn-library")?.addEventListener("click", openLibrary);
document.getElementById("btn-tutorials")?.addEventListener("click", openLibrary);
document.getElementById("btn-add-backdrop")?.addEventListener("click", () => openLibrary("backs"));
document.getElementById("backdrop-card")?.addEventListener("click", () => openLibrary("backs"));
document.getElementById("btn-paint-tab")?.addEventListener("click", () => document.getElementById("btn-paint")?.click());
document.getElementById("btn-fullscreen")?.addEventListener("click", () => {
  document.querySelector(".app")?.classList.toggle("stage-big");
});
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => setEditorTab(btn.dataset.tab));
});
document.querySelectorAll("[data-menu]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = btn.parentElement;
    const open = menu.classList.contains("open");
    closeMenus();
    if (!open) menu.classList.add("open");
  });
});
document.getElementById("btn-add-sprite")?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeMenus();
  openLibrary();
});
document.getElementById("add-sprite-menu")?.addEventListener("click", (e) => {
  e.stopPropagation();
  const add = e.target.closest("[data-add]")?.dataset.add;
  closeMenus();
  if (add === "library") openLibrary();
  else if (add === "paint") document.getElementById("btn-paint")?.click();
  else if (add) addMesh(add);
});
document.addEventListener("click", closeMenus);
document.querySelectorAll(".menu-drop button").forEach((btn) => {
  btn.addEventListener("click", closeMenus);
});
document.getElementById("btn-export-web")?.addEventListener("click", async () => {
  const project = await api.project();
  project.scripts = blocks.serialize().scripts;
  project.sounds = uploadedSounds();
  await exportWebGame(project);
});
document.getElementById("btn-export-apk")?.addEventListener("click", async () => {
  const project = await api.project();
  project.scripts = blocks.serialize().scripts;
  project.sounds = uploadedSounds();
  await exportAndroidProject(project);
});
document.getElementById("btn-undo")?.addEventListener("click", undo);
document.getElementById("btn-redo")?.addEventListener("click", redo);
document.getElementById("btn-guide")?.addEventListener("click", () => showGuide(true));
document.getElementById("btn-ex-kedi")?.addEventListener("click", () => loadExample("kedi-ziplar"));
document.getElementById("btn-ex-top")?.addEventListener("click", () => loadExample("top-yuvarlanir"));
document.getElementById("btn-ex-kamera")?.addEventListener("click", () => loadExample("kamera-takip"));
document.getElementById("add-platform")?.addEventListener("click", () => addMesh("platform"));
document.getElementById("add-trigger")?.addEventListener("click", () => addMesh("trigger"));
document.getElementById("chk-hitbox")?.addEventListener("change", (e) => viewport.setHitboxes?.(e.target.checked));
document.getElementById("btn-publish")?.addEventListener("click", publishDialog);
document.getElementById("btn-paint").addEventListener("click", () => {
  const object = selected();
  if (!object) return;
  openPaintEditor({
    object,
    onSave: async (costumes, index) => {
      pushHistory();
      await api.updateObject(object.id, { costumes, costumeIndex: index, mesh: object.mesh === "cube" ? "sprite" : object.mesh });
      await refresh();
    },
  });
});
document.getElementById("btn-save").addEventListener("click", async () => {
  const project = await api.project();
  project.scripts = blocks.serialize().scripts;
  project.sounds = uploadedSounds();
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
  pushHistory();
  if (project.sounds) loadSounds(project.sounds);
  await api.loadProject(project);
  blocks.load(project);
  await refresh();
});
document.getElementById("btn-cube").addEventListener("click", () => addMesh("cube"));
document.getElementById("btn-sphere").addEventListener("click", () => addMesh("sphere"));
document.getElementById("btn-pyramid").addEventListener("click", () => addMesh("pyramid"));
document.getElementById("btn-plane").addEventListener("click", () => addMesh("plane"));
document.getElementById("btn-reset").addEventListener("click", async () => {
  pushHistory();
  loadSounds([]);
  await api.reset();
  const scripts = await api.scripts();
  blocks.load(scripts);
  await refresh();
});

window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.code === "KeyY") {
    e.preventDefault();
    redo();
    return;
  }
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
      if (state.lastSound && state.lastSound !== playSound.last) {
        playSound.last = state.lastSound;
        playSound(state.lastSound, state.volume);
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
  showGuide();
}

boot().catch((err) => {
  statusMode.textContent = `Hata: ${err.message}`;
});
