import { createJsEngine } from "./engine-js.js";

let mode = "unknown";
let js = null;

async function probe() {
  if (mode !== "unknown") return;
  try {
    const res = await fetch("api/state", { cache: "no-store" });
    if (res.ok) {
      mode = "cpp";
      return;
    }
  } catch (_) {
    /* static host */
  }
  mode = "js";
  js = createJsEngine();
}

async function request(path, options = {}) {
  await probe();
  if (mode === "js") return jsCall(path, options);
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error || detail;
    } catch (_) {
      /* ignore */
    }
    throw new Error(detail);
  }
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) return res.json();
  return res;
}

function jsCall(path, options) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  if (path === "api/state" || path === "/api/state") return js.state();
  if (path === "api/scripts" || path === "/api/scripts") {
    if (method === "GET") return js.scripts();
    return js.setScripts(body);
  }
  if (path === "api/objects" || path === "/api/objects") return js.addObject(body);
  if (path.startsWith("api/objects/") || path.startsWith("/api/objects/")) {
    const id = path.split("/").pop();
    if (method === "DELETE") return js.removeObject(id);
    return js.updateObject(id, body);
  }
  if (path === "api/play" || path === "/api/play") return js.play(body);
  if (path === "api/stop" || path === "/api/stop") return js.stop();
  if (path === "api/input" || path === "/api/input") return js.input(body.keys || []);
  if (path === "api/reset" || path === "/api/reset") return js.reset();
  if (path === "api/project" || path === "/api/project") {
    if (method === "GET") return js.project();
    return js.loadProject(body);
  }
  if (path === "api/backdrop" || path === "/api/backdrop") return js.setBackdrop(body.id);
  if (path === "api/camera" || path === "/api/camera") return js.updateCamera(body);
  return js.state();
}

export const api = {
  mode: () => mode,
  ready: probe,
  state: () => request("api/state"),
  scene: () => request("api/scene"),
  scripts: () => request("api/scripts"),
  setScripts: (payload) => request("api/scripts", { method: "PUT", body: JSON.stringify(payload) }),
  addObject: (mesh) => request("api/objects", { method: "POST", body: JSON.stringify(typeof mesh === "string" ? { mesh } : mesh) }),
  updateObject: (id, patch) => request(`api/objects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeObject: (id) => request(`api/objects/${id}`, { method: "DELETE" }),
  play: (scripts) => request("api/play", { method: "POST", body: JSON.stringify(scripts || {}) }),
  stop: () => request("api/stop", { method: "POST", body: "{}" }),
  input: (keys) => request("api/input", { method: "POST", body: JSON.stringify({ keys }) }),
  reset: () => request("api/reset", { method: "POST", body: "{}" }),
  project: () => request("api/project"),
  loadProject: (payload) => request("api/project", { method: "PUT", body: JSON.stringify(payload) }),
  setBackdrop: (id) => request("api/backdrop", { method: "POST", body: JSON.stringify({ id }) }),
  cloneObject: (id) => request(`api/clone/${id}`, { method: "POST", body: "{}" }),
  updateCamera: (patch) => request("api/camera", { method: "PATCH", body: JSON.stringify(patch) }),
};
