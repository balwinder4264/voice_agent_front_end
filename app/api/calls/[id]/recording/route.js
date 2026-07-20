export const dynamic = "force-dynamic";
import { portalHeaders } from "../../../previewHeaders";

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/calls/${id}/recording`,
      { cache: "no-store", headers: await portalHeaders(request, null) },
    );

    if (!response.ok) {
      return new Response("Recording not found", { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/wav",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Could not reach the voice agent backend.", {
      status: 502,
    });
  }
}
