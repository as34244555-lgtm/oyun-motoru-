import { CHARACTERS, characterCostumes } from "./library.js";

function hexToRgb(hex) {
  const h = (hex || "#cccccc").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, hex: `#${h.padStart(6, "0")}` };
}

function catalogColor(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const hue = ((h >>> 0) % 360) / 360;
  const s = 0.62, l = 0.55;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 0.5) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = f(hue + 1 / 3), g = f(hue), b = f(hue - 1 / 3);
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return { r, g, b, hex: `#${to(r)}${to(g)}${to(b)}` };
}

function vec(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function refreshOrbit(cam) {
  cam.pitch = Math.max(-80, Math.min(80, cam.pitch));
  cam.distance = Math.max(1.2, cam.distance);
  const pr = (cam.pitch * Math.PI) / 180;
  const yr = (cam.yaw * Math.PI) / 180;
  cam.position = {
    x: cam.target.x + cam.distance * Math.cos(pr) * Math.sin(yr),
    y: cam.target.y + cam.distance * Math.sin(pr),
    z: cam.target.z + cam.distance * Math.cos(pr) * Math.cos(yr),
  };
}

function makeDefault() {
  const camera = { position: vec(6.2, 4.2, 6.6), target: vec(0.2, 0.5, 0), fov: 50, yaw: 45, pitch: 28, distance: 9.2, follow: "" };
  refreshOrbit(camera);
  return {
    objects: [
      { id: "ground", name: "Zemin", mesh: "plane", position: vec(0, 0, 0), rotation: vec(), scale: vec(14, 1, 14), color: hexToRgb("#476b57"), velocity: vec(), visible: true, dynamic: false, grounded: true, trigger: false, catalogId: "", costumes: [], costumeIndex: 0, opacity: 1, size: 100, layer: 0, sayText: "", sayTime: 0, animating: false, animFps: 6, animClip: "idle", isClone: false },
    ],
    camera,
    gravity: -20,
    backdrop: "cayir",
    timer: 0,
    volume: 80,
    lastSound: "",
    lastBroadcast: "",
    playing: false,
    runtime: { vars: {}, lists: {}, timer: 0 },
  };
}

function defaultScripts() {
  return { scripts: [] };
}

function arg(block, key, fallback = "") {
  const v = block.args?.[key];
  return v === undefined || v === null ? fallback : String(v);
}
function argf(block, key, fallback = 0) {
  const n = Number(arg(block, key, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function createJsEngine() {
  let scene = makeDefault();
  let snapshot = structuredClone(scene);
  let scripts = defaultScripts().scripts;
  const vars = {};
  const lists = {};
  let keys = new Set();
  let serial = 10;
  let startDone = new WeakMap();

  function find(id) {
    return scene.objects.find((o) => o.id === id || o.name === id);
  }

  function applyPreset(cam, p) {
    if (p === "on") { cam.yaw = 0; cam.pitch = 8; cam.distance = 8; }
    else if (p === "yan") { cam.yaw = 90; cam.pitch = 10; cam.distance = 8; }
    else if (p === "ust") { cam.yaw = 0; cam.pitch = 80; cam.distance = 12; }
    else if (p === "fps") { cam.yaw = 0; cam.pitch = 5; cam.distance = 2.2; }
    else { cam.yaw = 45; cam.pitch = 28; cam.distance = 9.2; }
    refreshOrbit(cam);
  }

  function evalCond(self, block) {
    const op = (block.op || "").toLowerCase();
    if (op === "key_down" || op === "key_pressed") return keys.has(arg(block, "key", "Space"));
    if (op === "grounded") return !!self?.grounded;
    if (op === "visible") return !!self?.visible;
    if (op === "var_gt") return (vars[arg(block, "name", "skor")] || 0) > argf(block, "value");
    if (op === "timer_gt") return scene.timer > argf(block, "seconds", argf(block, "value", 1));
    if (op === "compare") {
      const a = argf(block, "a"), b = argf(block, "b"), c = arg(block, "cmp", ">");
      if (c === "<") return a < b;
      if (c === "=") return Math.abs(a - b) < 1e-5;
      return a > b;
    }
    if (op === "random_chance") return Math.random() * 100 < argf(block, "value", 50);
    if (op === "touching" && self) {
      const name = arg(block, "name");
      const ah = half(self);
      return scene.objects.some((o) => {
        if (o.id === self.id) return false;
        if (name && o.name !== name && o.id !== name) return false;
        const bh = half(o);
        return Math.abs(o.position.x - self.position.x) < ah.x + bh.x &&
          Math.abs((o.position.y || 0) - (self.position.y || 0)) < ah.y + bh.y &&
          Math.abs(o.position.z - self.position.z) < ah.z + bh.z;
      });
    }
    if (op === "edge" && self) return Math.abs(self.position.x) > 6 || Math.abs(self.position.z) > 6;
    return false;
  }

  function half(o) {
    const s = Math.max(0.15, (o.size || 100) / 100);
    return { x: 0.5 * (o.scale?.x || 1) * s, y: 0.5 * (o.scale?.y || 1) * s, z: 0.5 * (o.scale?.z || 1) * s };
  }

  function runNamed(self, name, dt) {
    for (const script of scripts) {
      const hat = (typeof script.hat === "string" ? script.hat : script.hat?.op || "").toLowerCase();
      if (hat === "define_block" && arg(script.hat, "name", "") === name) {
        for (const block of script.stack || []) runBlock(self, block, dt);
      }
    }
  }

  function runBlock(self, block, dt) {
    const op = (block.op || "").toLowerCase();
    if (!self && !["set_var", "change_var", "set_backdrop", "set_camera_orbit", "set_camera_yaw", "set_camera_pitch", "set_camera_distance", "camera_follow", "camera_unfollow", "camera_preset", "change_camera_yaw", "change_camera_pitch", "calc", "play_anim", "call_block", "play_sound", "broadcast"].includes(op)) return;
    const move = (dx, dy, dz) => { self.position.x += dx; self.position.y += dy; self.position.z += dz; };
    if (op === "rotate") self.rotation[arg(block, "axis", "y")] += argf(block, "degrees", 90) * dt;
    else if (op === "jump" && (self.grounded || arg(block, "always") === "true")) { self.velocity.y = argf(block, "force", 8); self.grounded = false; }
    else if (op === "change_position") move(argf(block, "x"), argf(block, "y"), argf(block, "z"));
    else if (op === "set_position") { self.position = { x: argf(block, "x"), y: argf(block, "y"), z: argf(block, "z") }; }
    else if (op === "set_x") self.position.x = argf(block, "value");
    else if (op === "set_y") self.position.y = argf(block, "value");
    else if (op === "set_z") self.position.z = argf(block, "value");
    else if (op === "change_x") self.position.x += argf(block, "value", 0.1);
    else if (op === "change_y") self.position.y += argf(block, "value", 0.1);
    else if (op === "change_z") self.position.z += argf(block, "value", 0.1);
    else if (op === "say") { self.sayText = arg(block, "text", "Merhaba!"); self.sayTime = argf(block, "seconds", 2); }
    else if (op === "start_anim") { self.animating = true; self.animFps = argf(block, "fps", 8); self.animClip = "walk"; }
    else if (op === "stop_anim") { self.animating = false; self.animClip = "idle"; }
    else if (op === "play_anim") { self.animClip = arg(block, "name", "walk"); self.animating = self.animClip !== "idle"; }
    else if (op === "next_costume") self.costumeIndex = ((self.costumeIndex || 0) + 1) % Math.max(1, (self.costumes || []).length || 3);
    else if (op === "show") self.visible = true;
    else if (op === "hide") self.visible = false;
    else if (op === "set_color") self.color = hexToRgb(arg(block, "color", "#ffffff"));
    else if (op === "set_scale") { const s = argf(block, "value", 1); self.scale = { x: s, y: s, z: s }; }
    else if (op === "set_size") self.size = argf(block, "value", 100);
    else if (op === "move_forward" || op === "move_steps") {
      const yaw = (self.rotation.y * Math.PI) / 180;
      const a = argf(block, "amount", argf(block, "steps", 3)) * dt;
      move(Math.sin(yaw) * a, 0, Math.cos(yaw) * a);
    }
    else if (op === "turn_left") self.rotation.y += argf(block, "degrees", 15);
    else if (op === "turn_right") self.rotation.y -= argf(block, "degrees", 15);
    else if (op === "set_heading") self.rotation.y = argf(block, "degrees", 0);
    else if (op === "set_var") vars[arg(block, "name", "skor")] = argf(block, "value");
    else if (op === "change_var") vars[arg(block, "name", "skor")] = (vars[arg(block, "name", "skor")] || 0) + argf(block, "value", 1);
    else if (op === "calc") {
      const a = argf(block, "a"), b = argf(block, "b"), fn = arg(block, "fn", "+");
      let v = a + b;
      if (fn === "-") v = a - b;
      else if (fn === "*") v = a * b;
      else if (fn === "/") v = b === 0 ? 0 : a / b;
      vars[arg(block, "name", "skor")] = v;
    }
    else if (op === "set_backdrop") scene.backdrop = arg(block, "name", "cayir");
    else if (op === "camera_follow") scene.camera.follow = arg(block, "name", self?.id || "");
    else if (op === "camera_unfollow") scene.camera.follow = "";
    else if (op === "set_camera_yaw") { scene.camera.yaw = argf(block, "value", 45); refreshOrbit(scene.camera); }
    else if (op === "set_camera_pitch") { scene.camera.pitch = argf(block, "value", 28); refreshOrbit(scene.camera); }
    else if (op === "set_camera_distance") { scene.camera.distance = argf(block, "value", 9); refreshOrbit(scene.camera); }
    else if (op === "change_camera_yaw") { scene.camera.yaw += argf(block, "value", 10) * dt; refreshOrbit(scene.camera); }
    else if (op === "change_camera_pitch") { scene.camera.pitch += argf(block, "value", 10) * dt; refreshOrbit(scene.camera); }
    else if (op === "set_velocity" && self) self.velocity = { x: argf(block, "x"), y: argf(block, "y"), z: argf(block, "z") };
    else if (op === "bounce_edge" && self) {
      if (Math.abs(self.position.x) > 6) self.velocity.x *= -1;
      if (Math.abs(self.position.z) > 6) self.velocity.z *= -1;
    }
    else if (op === "call_block") runNamed(self, arg(block, "name", "dans"), dt);
    else if (op === "play_sound") scene.lastSound = arg(block, "name", "meow");
    else if (op === "broadcast") scene.lastBroadcast = arg(block, "name", "merhaba");
    else if (op === "create_clone" && self) {
      const copy = structuredClone(self);
      copy.id = `${self.id}_c${serial++}`;
      copy.name = `${self.name} kopya`;
      copy.isClone = true;
      copy.cloneOf = self.id;
      copy.position = { ...self.position, x: self.position.x + 0.6 };
      scene.objects.push(copy);
    }
    else if (op === "camera_preset") applyPreset(scene.camera, arg(block, "name", "izometrik"));
    else if (op === "set_camera_orbit") {
      scene.camera.yaw = argf(block, "yaw", scene.camera.yaw);
      scene.camera.pitch = argf(block, "pitch", scene.camera.pitch);
      scene.camera.distance = argf(block, "distance", scene.camera.distance);
      refreshOrbit(scene.camera);
    }
    else if (op === "if" || op === "if_else") {
      const cond = block.cond || { op: arg(block, "condOp", "key_down"), args: block.args || {} };
      const ok = evalCond(self, cond);
      for (const child of (ok ? block.then : block.else) || []) runBlock(self, child, dt);
    }
    else if (op === "repeat") {
      const n = Math.min(16, Math.max(0, argf(block, "times", 1)));
      for (let i = 0; i < n; i += 1) for (const child of block.stack || block.then || []) runBlock(self, child, dt);
    }
    else if (op === "forever") {
      for (const child of block.stack || block.then || []) runBlock(self, child, dt);
    }
  }

  function overlaps(a, b) {
    const ah = half(a), bh = half(b);
    return Math.abs(a.position.x - b.position.x) < ah.x + bh.x &&
      Math.abs(a.position.y - b.position.y) < ah.y + bh.y &&
      Math.abs(a.position.z - b.position.z) < ah.z + bh.z;
  }

  function physics(dt) {
    for (const o of scene.objects) {
      if (o.sayTime > 0) {
        o.sayTime -= dt;
        if (o.sayTime <= 0) o.sayText = "";
      }
      if (!o.dynamic || o.mesh === "plane") {
        if (!o.dynamic) o.grounded = true;
        continue;
      }
      o.velocity = o.velocity || vec();
      o.velocity.y += scene.gravity * dt;
      o.position.x += (o.velocity.x || 0) * dt;
      o.position.y += o.velocity.y * dt;
      o.position.z += (o.velocity.z || 0) * dt;
      const floor = half(o).y;
      if (o.position.y <= floor) {
        o.position.y = floor;
        if (o.velocity.y < 0) o.velocity.y = 0;
        o.grounded = true;
        o.velocity.x *= 0.86;
        o.velocity.z *= 0.86;
      } else o.grounded = false;
    }
    for (let i = 0; i < scene.objects.length; i += 1) {
      for (let j = i + 1; j < scene.objects.length; j += 1) {
        const a = scene.objects[i], b = scene.objects[j];
        if ((!a.dynamic && !b.dynamic) || a.trigger || b.trigger) continue;
        if (!overlaps(a, b)) continue;
        const ah = half(a), bh = half(b);
        const ox = ah.x + bh.x - Math.abs(a.position.x - b.position.x);
        const oy = ah.y + bh.y - Math.abs(a.position.y - b.position.y);
        const oz = ah.z + bh.z - Math.abs(a.position.z - b.position.z);
        const dyn = a.dynamic ? a : b;
        const other = dyn === a ? b : a;
        if (oy <= ox && oy <= oz) {
          const dir = dyn.position.y >= other.position.y ? 1 : -1;
          dyn.position.y += dir * oy;
          if (dir > 0) { dyn.velocity.y = Math.max(0, dyn.velocity.y); dyn.grounded = true; }
          else dyn.velocity.y = Math.min(0, dyn.velocity.y);
        } else if (ox <= oz) {
          const dir = dyn.position.x >= other.position.x ? 1 : -1;
          dyn.position.x += dir * ox;
          dyn.velocity.x *= -0.3;
        } else {
          const dir = dyn.position.z >= other.position.z ? 1 : -1;
          dyn.position.z += dir * oz;
          dyn.velocity.z *= -0.3;
        }
      }
    }
  }

  function tick(dt) {
    if (!scene.playing) return;
    scene.timer += dt;
    scene.runtime.timer = scene.timer;
    for (const script of scripts) {
      const self = find(script.target);
      if (!self) continue;
      const hat = (typeof script.hat === "string" ? script.hat : script.hat?.op || "every_frame").toLowerCase();
      script.pc = script.pc || 0;
      script.waitLeft = script.waitLeft || 0;
      let run = false;
      if (hat === "define_block") run = false;
      else if (hat === "every_frame") run = true;
      else if (hat === "when_start") {
        if (!script._done) { run = true; script._done = true; script.pc = 0; }
        else if (script.waitLeft > 0 || script.pc < (script.stack || []).length) run = true;
      } else if (hat === "when_key") run = keys.has(arg(script.hat, "key", "Space"));
      else if (hat === "when_broadcast") run = scene.lastBroadcast === arg(script.hat, "name", "merhaba");
      else if (hat === "when_touching") run = evalCond(self, { op: "touching", args: script.hat.args || {} });
      if (!run) continue;
      if (script.waitLeft > 0) {
        script.waitLeft -= dt;
        if (script.waitLeft > 0) continue;
        script.pc += 1;
      }
      const stack = script.stack || [];
      if (hat === "every_frame" && script.pc >= stack.length) script.pc = 0;
      for (; script.pc < stack.length; script.pc += 1) {
        const block = stack[script.pc];
        const bop = (block.op || "").toLowerCase();
        if (bop === "wait") { script.waitLeft = argf(block, "seconds", 1); break; }
        if (bop === "wait_until_key" && !keys.has(arg(block, "key", "Space"))) break;
        if (bop === "stop_this") { script.pc = stack.length; break; }
        runBlock(self, block, dt);
      }
      if (hat === "every_frame" && script.pc >= stack.length && script.waitLeft <= 0) script.pc = 0;
    }
    physics(dt);
    if (scene.camera.follow) {
      const tracked = find(scene.camera.follow);
      if (tracked) scene.camera.target = { ...tracked.position };
    }
    refreshOrbit(scene.camera);
  }

  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
  }, 16);

  return {
    mode: "js",
    state() {
      return { ...scene, runtime: { vars: { ...vars }, lists, timer: scene.timer } };
    },
    scripts() { return { scripts }; },
    async setScripts(payload) { scripts = structuredClone(payload.scripts || []); scripts.forEach((s) => { s._done = false; }); },
    async addObject(spec) {
      let mesh = typeof spec === "string" ? spec : spec.mesh || "cube";
      const catalogId = typeof spec === "object" ? spec.catalogId || "" : "";
      const asPlatform = mesh === "platform";
      const asTrigger = mesh === "trigger";
      if (asPlatform || asTrigger) mesh = "cube";
      const id = `${mesh}_${serial++}`;
      const ch = CHARACTERS.find((c) => c.id === catalogId);
      const obj = {
        id, name: spec.name || (asPlatform ? "Platform" : asTrigger ? "Tetik" : ch?.name || mesh), mesh: catalogId ? "character" : mesh,
        position: vec((scene.objects.length % 5) * 0.4, asPlatform ? 1 : asTrigger ? 0.7 : 0.55, 0), rotation: vec(),
        scale: asPlatform ? vec(2.2, 0.28, 2.2) : asTrigger ? vec(1.4, 1.4, 1.4) : vec(1, 1, 1),
        color: catalogId ? catalogColor(catalogId) : hexToRgb(asPlatform ? "#8b6a46" : asTrigger ? "#3fd4be" : "#dd8844"),
        velocity: vec(), visible: true, dynamic: mesh !== "plane" && !asPlatform && !asTrigger, grounded: false, trigger: asTrigger,
        catalogId, costumes: catalogId ? characterCostumes(catalogId) : [], costumeIndex: 0,
        opacity: asTrigger ? 0.35 : 1, size: 100, layer: 0, sayText: "", sayTime: 0, animating: false, animFps: 6, animClip: "idle", isClone: false,
      };
      scene.objects.push(obj);
      if (!scene.playing) snapshot = structuredClone(scene);
      return { id, name: obj.name };
    },
    async updateObject(id, patch) {
      const o = find(id);
      if (!o) throw new Error("nesne yok");
      if (patch.name) o.name = patch.name;
      if (patch.color) o.color = typeof patch.color === "string" ? hexToRgb(patch.color) : patch.color;
      if (patch.position) Object.assign(o.position, patch.position);
      if (patch.rotation) Object.assign(o.rotation, patch.rotation);
      if (patch.scale) Object.assign(o.scale, patch.scale);
      if (patch.animClip) o.animClip = patch.animClip;
      if (patch.mesh) o.mesh = patch.mesh;
      if (patch.costumes) o.costumes = patch.costumes;
      if (patch.costumeIndex !== undefined) o.costumeIndex = patch.costumeIndex;
      if (patch.trigger !== undefined) o.trigger = !!patch.trigger;
      if (patch.opacity !== undefined) o.opacity = patch.opacity;
      if (patch.visible !== undefined) o.visible = patch.visible;
      if (patch.dynamic !== undefined) o.dynamic = patch.dynamic;
    },
    async removeObject(id) { scene.objects = scene.objects.filter((o) => o.id !== id); },
    async play(payload) {
      if (payload?.scripts) scripts = structuredClone(payload.scripts);
      scripts.forEach((s) => { s._done = false; s.pc = 0; s.waitLeft = 0; });
      snapshot = structuredClone(scene);
      scene.playing = true;
      scene.timer = 0;
      scene.lastSound = "";
    },
    async stop() {
      scene = structuredClone(snapshot);
      scene.playing = false;
      keys = new Set();
    },
    async input(list) { keys = new Set(list || []); },
    async reset() { scene = makeDefault(); snapshot = structuredClone(scene); scripts = defaultScripts().scripts; },
    async project() { return { ...scene, scripts }; },
    async loadProject(p) {
      scene = { ...makeDefault(), ...p, objects: p.objects || makeDefault().objects, camera: p.camera || makeDefault().camera };
      scripts = p.scripts || defaultScripts().scripts;
      scene.playing = false;
    },
    async setBackdrop(id) { scene.backdrop = id; },
    async updateCamera(patch) {
      if (patch.preset) applyPreset(scene.camera, patch.preset);
      if (patch.yaw !== undefined) scene.camera.yaw = Number(patch.yaw);
      if (patch.pitch !== undefined) scene.camera.pitch = Number(patch.pitch);
      if (patch.distance !== undefined) scene.camera.distance = Number(patch.distance);
      if (patch.fov !== undefined) scene.camera.fov = Number(patch.fov);
      if (patch.follow !== undefined) scene.camera.follow = patch.follow;
      refreshOrbit(scene.camera);
      return this.state();
    },
    async cloneObject(id) {
      const src = find(id);
      if (!src) return { id: "" };
      const copy = structuredClone(src);
      copy.id = `${src.id}_c${serial++}`;
      copy.name = `${src.name} kopya`;
      copy.isClone = true;
      copy.cloneOf = src.id;
      copy.position = { ...src.position, x: src.position.x + 0.6 };
      scene.objects.push(copy);
      return { id: copy.id };
    },
  };
}

