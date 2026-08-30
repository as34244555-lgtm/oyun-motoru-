export function openPaintEditor({ object, onSave }) {
  const existing = document.getElementById("paint-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "paint-modal";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-card paint-card">
      <header>
        <h3>Kostüm çiz — ${object.name}</h3>
        <button type="button" class="btn ghost" data-close>Kapat</button>
      </header>
      <div class="paint-layout">
        <aside class="paint-tools">
          <button type="button" data-tool="brush" class="btn active">Fırça</button>
          <button type="button" data-tool="eraser" class="btn">Silgi</button>
          <button type="button" data-tool="fill" class="btn">Doldur</button>
          <button type="button" data-tool="line" class="btn">Çizgi</button>
          <button type="button" data-tool="rect" class="btn">Kutu</button>
          <button type="button" data-tool="circle" class="btn">Daire</button>
          <label class="field">Renk <input type="color" id="paint-color" value="#ff5533" /></label>
          <label class="field">Kalınlık <input type="range" id="paint-size" min="1" max="32" value="8" /></label>
          <button type="button" class="btn" id="paint-clear">Temizle</button>
          <button type="button" class="btn" id="paint-new">Yeni kostüm</button>
          <button type="button" class="btn primary" id="paint-save">Kaydet</button>
        </aside>
        <div class="paint-stage">
          <canvas id="paint-canvas" width="320" height="320"></canvas>
          <div class="costume-strip" id="paint-strip"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const canvas = modal.querySelector("#paint-canvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let tool = "brush";
  let drawing = false;
  let start = null;
  const snapshot = () => ctx.getImageData(0, 0, canvas.width, canvas.height);
  let backup = snapshot();

  const costumes = (object.costumes || []).map((c) => ({ ...c }));
  let current = object.costumeIndex || 0;

  function loadCostume(index) {
    current = index;
    const item = costumes[index];
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (item?.image) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        backup = snapshot();
      };
      img.src = item.image;
    }
    renderStrip();
  }

  function renderStrip() {
    const strip = modal.querySelector("#paint-strip");
    strip.innerHTML = "";
    costumes.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `btn${i === current ? " primary" : ""}`;
      b.textContent = c.name || `kostüm ${i + 1}`;
      b.addEventListener("click", () => loadCostume(i));
      strip.appendChild(b);
    });
  }

  modal.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tool = btn.dataset.tool;
      modal.querySelectorAll("[data-tool]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const colorEl = modal.querySelector("#paint-color");
  const sizeEl = modal.querySelector("#paint-size");

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    start = pos(e);
    backup = snapshot();
    if (tool === "fill") {
      ctx.fillStyle = colorEl.value;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!drawing) return;
    drawing = false;
    const p = pos(e);
    ctx.strokeStyle = colorEl.value;
    ctx.lineWidth = Number(sizeEl.value);
    ctx.fillStyle = colorEl.value;
    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(start.x, start.y, p.x - start.x, p.y - start.y);
    } else if (tool === "circle") {
      const r = Math.hypot(p.x - start.x, p.y - start.y);
      ctx.beginPath();
      ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drawing || (tool !== "brush" && tool !== "eraser")) return;
    const p = pos(e);
    ctx.strokeStyle = tool === "eraser" ? "#f4f1ea" : colorEl.value;
    ctx.lineWidth = Number(sizeEl.value);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    start = p;
  });

  modal.querySelector("#paint-clear").addEventListener("click", () => {
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
  modal.querySelector("#paint-new").addEventListener("click", () => {
    costumes.push({ name: `kostum_${costumes.length + 1}`, image: "" });
    loadCostume(costumes.length - 1);
  });
  modal.querySelector("#paint-save").addEventListener("click", async () => {
    if (!costumes.length) costumes.push({ name: "kostum_1", image: "" });
    costumes[current].image = canvas.toDataURL("image/png");
    await onSave(costumes, current);
    modal.remove();
  });
  modal.querySelector("[data-close]").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  if (costumes.length) loadCostume(current);
  else renderStrip();
}
