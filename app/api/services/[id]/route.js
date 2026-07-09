import { cookies } from "next/headers";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const response = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/services/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: (await cookies()).toString(),
      },
      body: await request.text(),
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

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const response = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/services/${id}`,
    {
      method: "DELETE",
      headers: { cookie: (await cookies()).toString() },
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
