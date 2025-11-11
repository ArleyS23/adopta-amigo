const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(options.headers || {}),
  };
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await safeError(response);
    const err = new Error(text);
    err.status = response.status;
    throw err;
  }

  return response.status === 204 ? null : response.json();
}

async function safeError(response) {
  try {
    const data = await response.json();
    return data?.message || `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}
