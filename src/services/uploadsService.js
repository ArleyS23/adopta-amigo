import { apiFetch } from "./apiClient";

export function uploadPetImage(file, token) {
  const form = new FormData();
  form.append("image", file);
  return apiFetch("/uploads", {
    method: "POST",
    body: form,
    authToken: token,
  });
}
