import { portalHeaders } from "../../previewHeaders";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const response = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/services/${id}`,
    {
      method: "PATCH",
      headers: {
        ...(await portalHeaders(request)),
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

export async function DELETE(request, { params }) {
  const { id } = await params;
  const response = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/services/${id}`,
    {
      method: "DELETE",
      headers: await portalHeaders(request, null),
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
