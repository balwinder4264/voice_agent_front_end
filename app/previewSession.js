export const PREVIEW_TOKEN_KEY = "admin_preview_token";
export const PREVIEW_TARGET_KEY = "admin_preview_target";

export function previewFetch(input, init = {}) {
  if (typeof window === "undefined") return fetch(input, init);

  const token = window.sessionStorage.getItem(PREVIEW_TOKEN_KEY);
  if (!token) return fetch(input, init);

  const headers = new Headers(init.headers || {});
  headers.set("x-admin-preview-token", token);
  return fetch(input, { ...init, headers });
}

export function getPreviewTarget() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PREVIEW_TARGET_KEY);
}

export function clearPreviewSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PREVIEW_TOKEN_KEY);
  window.sessionStorage.removeItem(PREVIEW_TARGET_KEY);
}
