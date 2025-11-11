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

export function createPet(payload, user, role = "user") {
  return apiFetch("/pets", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "x-user-id": user.uid,
      "x-user-role": role,
    },
  });
}

export function updatePetRequest(id, payload, user, role = "user") {
  return apiFetch(`/pets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      "x-user-id": user.uid,
      "x-user-role": role,
    },
  });
}

export function deletePetRequest(id, user, role = "user") {
  return apiFetch(`/pets/${id}`, {
    method: "DELETE",
    headers: {
      "x-user-id": user.uid,
      "x-user-role": role,
    },
  });
}
