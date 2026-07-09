export async function POST(request) {
  const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:3000"}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: await request.text(),
  });
  return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Set-Cookie": response.headers.get("set-cookie") || "" } });
}
