const DEFS = [
  { op: "when_start", kind: "hat", cat: "events", cls: "hat", title: "Oyun başlayınca" },
  { op: "every_frame", kind: "hat", cat: "events", cls: "hat", title: "Her kare" },
  { op: "when_key", kind: "hat", cat: "events", cls: "hat", title: "Tuşa basılınca", fields: [{ key: "key", type: "select", options: ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"] }] },
  { op: "set_position", kind: "stack", cat: "motion", cls: "motion", title: "konumu ayarla", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "1" }, { key: "z", type: "number", value: "0" }] },
  { op: "change_position", kind: "stack", cat: "motion", cls: "motion", title: "konumu değiştir", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "0" }, { key: "z", type: "number", value: "0" }] },
  { op: "rotate", kind: "stack", cat: "motion", cls: "motion", title: "döndür", fields: [{ key: "axis", type: "select", options: ["x", "y", "z"], value: "y" }, { key: "degrees", type: "number", value: "90" }] },
  { op: "set_velocity", kind: "stack", cat: "motion", cls: "motion", title: "hızı ayarla", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "0" }, { key: "z", type: "number", value: "0" }] },
  { op: "jump", kind: "stack", cat: "motion", cls: "motion", title: "zıpla güç", fields: [{ key: "force", type: "number", value: "8" }] },
  { op: "move_forward", kind: "stack", cat: "motion", cls: "motion", title: "ileri git", fields: [{ key: "amount", type: "number", value: "3" }] },
  { op: "set_color", kind: "stack", cat: "looks", cls: "looks", title: "renk", fields: [{ key: "color", type: "color", value: "#ff5533" }] },
  { op: "set_scale", kind: "stack", cat: "looks", cls: "looks", title: "ölçek", fields: [{ key: "value", type: "number", value: "1" }] },
  { op: "set_visible", kind: "stack", cat: "looks", cls: "looks", title: "görünür", fields: [{ key: "value", type: "select", options: ["true", "false"] }] },
  { op: "if", kind: "c", cat: "control", cls: "control", title: "eğer", fields: [{ key: "condOp", type: "select", options: ["key_down", "grounded"] }, { key: "key", type: "select", options: ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"] }] },
  { op: "repeat", kind: "c", cat: "control", cls: "control", title: "tekrarla", fields: [{ key: "times", type: "number", value: "4" }] },
  { op: "wait", kind: "stack", cat: "control", cls: "control", title: "bekle saniye", fields: [{ key: "seconds", type: "number", value: "1" }] },
];

const CATS = [
  { id: "events", label: "Olaylar" },
  { id: "motion", label: "Hareket" },
  { id: "looks", label: "Görünüm" },
  { id: "control", label: "Kontrol" },
];

function defOf(op) {
  return DEFS.find((d) => d.op === op) || { op, kind: "stack", cls: "motion", title: op, fields: [] };
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function defaultBlock(op) {
  const def = defOf(op);
  const args = {};
  for (const field of def.fields || []) args[field.key] = field.value ?? field.options?.[0] ?? "";
  const block = { op, args };
  if (def.op === "if") {
    block.cond = { op: args.condOp || "key_down", args: { key: args.key || "Space" } };
    block.then = [];
  }
  if (def.op === "repeat") block.stack = [];
  return block;
}

function fieldControl(block, field, onChange) {
  const wrap = document.createElement("span");
  const value = block.args?.[field.key] ?? field.value ?? "";
  let el;
  if (field.type === "select") {
    el = document.createElement("select");
    for (const option of field.options) {
      const o = document.createElement("option");
      o.value = option;
      o.textContent = option;
      if (option === value) o.selected = true;
      el.appendChild(o);
    }
  } else {
    el = document.createElement("input");
    el.type = field.type === "color" ? "color" : field.type === "number" ? "number" : "text";
    el.value = value;
    if (field.type === "number") el.step = "0.1";
  }
  el.addEventListener("pointerdown", (e) => e.stopPropagation());
  el.addEventListener("change", () => {
    block.args = block.args || {};
    block.args[field.key] = el.value;
    if (block.op === "if") {
      block.cond = { op: block.args.condOp || "key_down", args: { key: block.args.key || "Space" } };
    }
    onChange();
  });
  wrap.appendChild(el);
  return wrap;
}

function renderBlock(block, onChange, onRemove) {
  const def = defOf(block.op);
  const el = document.createElement("div");
  el.className = `block ${def.cls}`;
  el.dataset.op = block.op;
  const line = document.createElement("div");
  line.className = "line";
  const title = document.createElement("span");
  title.textContent = def.title;
  line.appendChild(title);
  for (const field of def.fields || []) line.appendChild(fieldControl(block, field, onChange));
  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "×";
  del.title = "Sil";
  del.style.marginLeft = "auto";
  del.style.background = "transparent";
  del.style.border = "0";
  del.style.color = "inherit";
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    onRemove();
  });
  line.appendChild(del);
  el.appendChild(line);

  if (def.op === "if" || def.op === "repeat") {
    const mouth = document.createElement("div");
    mouth.className = "mouth";
    const inner = def.op === "if" ? (block.then ||= []) : (block.stack ||= []);
    if (!inner.length) {
      const hint = document.createElement("div");
      hint.className = "drop-hint";
      hint.textContent = "blok eklemek için palete tıkla, sonra buraya bırak";
      mouth.appendChild(hint);
    }
    inner.forEach((child, index) => {
      mouth.appendChild(renderBlock(child, onChange, () => {
        inner.splice(index, 1);
        onChange();
      }));
    });
    mouth.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    mouth.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const op = e.dataTransfer.getData("text/blok-op");
      if (!op || defOf(op).kind === "hat") return;
      inner.push(defaultBlock(op));
      onChange();
    });
    el.appendChild(mouth);
  }
  return el;
}

export function createBlockEditor({ paletteEl, scriptsEl, onChange }) {
  let scripts = [];
  let target = "";

  function emit() {
    onChange?.({ scripts: clone(scripts) });
  }

  function visibleScripts() {
    return scripts.filter((s) => !target || s.target === target);
  }

  function addBlock(op) {
    const def = defOf(op);
    if (def.kind === "hat") {
      scripts.push({ target, hat: { op, args: defaultBlock(op).args || {} }, stack: [] });
      emit();
      render();
      return;
    }
    const mine = visibleScripts();
    if (!mine.length) {
      scripts.push({ target, hat: { op: "every_frame", args: {} }, stack: [defaultBlock(op)] });
    } else {
      mine[mine.length - 1].stack = mine[mine.length - 1].stack || [];
      mine[mine.length - 1].stack.push(defaultBlock(op));
    }
    emit();
    render();
  }

  function renderPalette() {
    paletteEl.innerHTML = "";
    for (const cat of CATS) {
      const h = document.createElement("div");
      h.className = "cat";
      h.textContent = cat.label;
      paletteEl.appendChild(h);
      for (const def of DEFS.filter((d) => d.cat === cat.id)) {
        const item = document.createElement("div");
        item.className = `palette-item ${def.cls}`;
        item.textContent = def.title;
        item.draggable = true;
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/blok-op", def.op);
        });
        item.addEventListener("click", () => addBlock(def.op));
        paletteEl.appendChild(item);
      }
    }
  }

  function render() {
    scriptsEl.innerHTML = "";
    const mine = visibleScripts();
    if (!mine.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Soldaki bir olay bloğuna tıkla (Her kare, Oyun başlayınca). Sonra hareket bloklarını ekle.";
      scriptsEl.appendChild(empty);
      return;
    }
    mine.forEach((script) => {
      const card = document.createElement("div");
      card.className = "script-card";
      const hat = { op: typeof script.hat === "string" ? script.hat : script.hat.op, args: script.hat.args || script.hatArgs || {} };
      script.hat = hat;
      card.appendChild(renderBlock(hat, emit, () => {
        scripts = scripts.filter((s) => s !== script);
        emit();
        render();
      }));
      (script.stack || []).forEach((block, index) => {
        card.appendChild(renderBlock(block, () => {
          emit();
          render();
        }, () => {
          script.stack.splice(index, 1);
          emit();
          render();
        }));
      });
      card.addEventListener("dragover", (e) => e.preventDefault());
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        const op = e.dataTransfer.getData("text/blok-op");
        if (!op || defOf(op).kind === "hat") return;
        script.stack = script.stack || [];
        script.stack.push(defaultBlock(op));
        emit();
        render();
      });
      const tools = document.createElement("div");
      tools.className = "script-tools";
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "Scripti sil";
      rm.addEventListener("click", () => {
        scripts = scripts.filter((s) => s !== script);
        emit();
        render();
      });
      tools.appendChild(rm);
      card.appendChild(tools);
      scriptsEl.appendChild(card);
    });
  }

  scriptsEl.addEventListener("dragover", (e) => e.preventDefault());
  scriptsEl.addEventListener("drop", (e) => {
    const op = e.dataTransfer.getData("text/blok-op");
    if (op) addBlock(op);
  });

  renderPalette();

  return {
    load(data) {
      scripts = clone(data?.scripts || []);
      for (const script of scripts) {
        if (typeof script.hat === "string") script.hat = { op: script.hat, args: script.hatArgs || {} };
      }
      render();
    },
    serialize() {
      return { scripts: clone(scripts) };
    },
    setTarget(id) {
      target = id;
      render();
    },
    render,
  };
}
