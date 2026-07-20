import { portalHeaders } from "../../previewHeaders";

async function forward(request, { params }) {
  const { id } = await params;
  const response = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/staff/${id}`,
    {
      method: request.method,
      headers: {
        ...(await portalHeaders(request)),
      },
      body: request.method === "DELETE" ? undefined : await request.text(),
      cache: "no-store",
    },
  );
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}

export const PATCH = forward;
export const DELETE = forward;
