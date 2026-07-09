import { cookies } from "next/headers";

async function forward(request) {
  const response = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/settings`,
    {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        cookie: (await cookies()).toString(),
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
export const PUT = forward;
