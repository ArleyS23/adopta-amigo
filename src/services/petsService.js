import { apiFetch } from "./apiClient";

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.city) params.set("city", filters.city);
  if (filters.ownerId) params.set("ownerId", filters.ownerId);
  if (filters.ids?.length) params.set("ids", filters.ids.join(","));
  return params.toString() ? `?${params.toString()}` : "";
}

export function listPets(filters = {}) {
  return apiFetch(`/pets${buildQuery(filters)}`);
}

export function getPet(id) {
  return apiFetch(`/pets/${id}`);
}

export function createPet(payload, token) {
  return apiFetch("/pets", {
    method: "POST",
    body: JSON.stringify(payload),
    authToken: token,
  });
}

export function updatePetRequest(id, payload, token) {
  return apiFetch(`/pets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    authToken: token,
  });
}

export function deletePetRequest(id, token) {
  return apiFetch(`/pets/${id}`, {
    method: "DELETE",
    authToken: token,
  });
}
