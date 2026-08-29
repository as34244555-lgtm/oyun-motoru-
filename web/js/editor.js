import { api } from "./api.js";
import { createViewport } from "./viewport.js";
import { createBlockEditor } from "./blocks.js";

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
    const kind = document.createElement("span");
    kind.className = "kind";
    kind.textContent = object.mesh;
    item.append(swatch, name, kind);
    item.addEventListener("click", () => selectObject(object.id));
    hierarchyEl.appendChild(item);
  }
  statusCount.textContent = String(state.objects?.length || 0);
}

function numField(label, value, onCommit) {
  const wrap = document.createElement("label");
  wrap.className = "field";
  wrap.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.1";
  input.value = Number(value ?? 0).toFixed(2);
  input.disabled = !!state.playing;
  input.addEventListener("change", () => onCommit(Number(input.value)));
  wrap.appendChild(input);
  return wrap;
}

function renderInspector() {
  const object = selected();
  inspectorEl.innerHTML = "";
  if (!object) {
    inspectorEl.innerHTML = '<div class="empty">Bir nesne seç.</div>';
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
      await api.input([...keys]);
      state = await api.state();
      viewport.sync(state);
      statusCount.textContent = String(state.objects?.length || 0);
      if (selected()) renderInspector();
    } catch (_) {
      /* keep editor alive */
    }
  }
  statusFps.textContent = String(viewport.fps());
}, 50);

if (cpuFrame && !viewport.software) {
  setInterval(() => {
    cpuFrame.src = `/api/frame.bmp?t=${Date.now()}`;
  }, 700);
}

async function boot() {
  const scripts = await api.scripts();
  blocks.load(scripts);
  await refresh();
}

boot().catch((err) => {
  statusMode.textContent = `Hata: ${err.message}`;
});
