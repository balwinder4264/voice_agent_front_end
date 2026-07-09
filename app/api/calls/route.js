import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:3000"}/api/shop/calls?${searchParams.toString()}`,
      { cache: "no-store", headers: { cookie: (await cookies()).toString() } },
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "Could not reach the voice agent backend." },
      { status: 502 },
    );
  }
}
