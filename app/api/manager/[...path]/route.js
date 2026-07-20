import { portalHeaders } from "../../previewHeaders";

async function forward(request, { params }) {
  const { path } = await params;
  const { search } = new URL(request.url);
  const response = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:3000"}/api/manager/${path.join("/")}${search}`,
    {
      method: request.method,
      headers: {
        ...(await portalHeaders(request)),
      },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    },
  );
  const headers = {
    "Content-Type": response.headers.get("content-type") || "application/json",
  };
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return new Response(response.body, { status: response.status, headers });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
