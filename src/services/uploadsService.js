import { apiFetch } from "./apiClient";

export function uploadPetImage(file, user) {
  const form = new FormData();
  form.append("image", file);
  return apiFetch("/uploads", {
    method: "POST",
    body: form,
    headers: {
      "x-user-id": user.uid,
    },
  });
}
