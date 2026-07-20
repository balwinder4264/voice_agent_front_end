import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  cookieStore.delete("shop_token");
  cookieStore.delete("sales_token");
  cookieStore.delete("manager_token");
  return NextResponse.json({ ok: true });
}
