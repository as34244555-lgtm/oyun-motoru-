async function request(path, options = {}) {
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

export const api = {
  state: () => request("/api/state"),
  scene: () => request("/api/scene"),
  scripts: () => request("/api/scripts"),
  setScripts: (payload) => request("/api/scripts", { method: "PUT", body: JSON.stringify(payload) }),
  addObject: (mesh) => request("/api/objects", { method: "POST", body: JSON.stringify({ mesh }) }),
  updateObject: (id, patch) => request(`/api/objects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeObject: (id) => request(`/api/objects/${id}`, { method: "DELETE" }),
  play: (scripts) => request("/api/play", { method: "POST", body: JSON.stringify(scripts || {}) }),
  stop: () => request("/api/stop", { method: "POST", body: "{}" }),
  input: (keys) => request("/api/input", { method: "POST", body: JSON.stringify({ keys }) }),
  reset: () => request("/api/reset", { method: "POST", body: "{}" }),
};
