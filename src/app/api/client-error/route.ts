import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.error("[CLIENT-ERROR]", {
      timestamp: new Date().toISOString(),
      message: body.message,
      stack: body.stack,
      componentStack: body.componentStack,
      buildSha: body.buildSha,
      url: body.url,
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Invalid payload" }, { status: 400 });
  }
}

