import { NextResponse } from "next/server";
import { portalHeaders } from "../previewHeaders";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/billing-portal`,
      {
        method: "POST",
        headers: await portalHeaders(request),
        cache: "no-store",
      },
    );
    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: body.error || "Could not open subscription management." },
        { status: response.status },
      );
    }

    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the voice agent backend." },
      { status: 502 },
    );
  }
}
