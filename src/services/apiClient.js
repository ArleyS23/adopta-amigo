const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const { authToken, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
  const headers = {
    ...(rest.headers || {}),
  };
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
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
