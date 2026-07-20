import { NextResponse } from "next/server";
import { portalHeaders } from "../previewHeaders";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/agents`,
      {
        cache: "no-store",
        headers: await portalHeaders(request, null),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "Could not reach the voice agent backend." },
      { status: 502 },
    );
  }
}
