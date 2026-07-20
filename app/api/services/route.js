import { portalHeaders } from "../previewHeaders";

async function forward(request) {
  const response = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/services`,
    {
      method: request.method,
      headers: {
        ...(await portalHeaders(request)),
      },
      body: request.method === "GET" ? undefined : await request.text(),
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

export const GET = forward;
export const POST = forward;
