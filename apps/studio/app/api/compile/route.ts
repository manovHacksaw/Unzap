import { NextResponse } from "next/server";

const UPSTREAM =
  process.env.NEXT_PUBLIC_COMPILER_URL ??
  "https://gallant-peace-production-7e77.up.railway.app";

const COMPILE_TIMEOUT_MS = 30_000;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${UPSTREAM}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(COMPILE_TIMEOUT_MS),
    });
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    const message = isTimeout
      ? "Compiler service timed out. Please try again."
      : "Compiler service is unreachable. Please check your network or try again later.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: "Compiler service returned an unexpected response." },
      { status: 502 }
    );
  }

  return NextResponse.json(data, { status: upstream.status });
}
