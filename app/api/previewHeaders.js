import { cookies } from "next/headers";

export async function portalHeaders(request, contentType = "application/json") {
  const headers = {
    cookie: (await cookies()).toString(),
  };
  if (contentType) headers["Content-Type"] = contentType;

  const previewToken = request.headers.get("x-admin-preview-token");
  if (previewToken) headers["x-admin-preview-token"] = previewToken;

  return headers;
}
