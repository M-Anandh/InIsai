import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_SHA ||
    "prod-v2.1.2";

  return NextResponse.json(
    {
      version: "2.1.2",
      sha,
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
