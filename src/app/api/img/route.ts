import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set([
  "lh3.googleusercontent.com",
  "yt3.googleusercontent.com",
  "yt3.ggpht.com",
  "i.ytimg.com",
  "c.saavncdn.com",
  "image.tmdb.org",
  "images.unsplash.com",
]);

function isPrivateIpOrHostname(host: string): boolean {
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  // IPv4 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
  const parts = host.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("u");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Strict SSRF guard
  if (parsed.protocol !== "https:") {
    return new NextResponse("Only HTTPS URLs allowed", { status: 403 });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateIpOrHostname(hostname)) {
    return new NextResponse("Forbidden host", { status: 403 });
  }

  if (!ALLOWED_HOSTS.has(hostname)) {
    return new NextResponse("Host not in allowlist", { status: 403 });
  }

  try {
    const upstreamRes = await fetch(parsed.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InIsaiProxy/1.0)",
        Accept: "image/webp,image/avif,image/jpeg,image/png,image/*;q=0.8",
      },
      referrerPolicy: "no-referrer",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Upstream failed: ${upstreamRes.status}`, {
        status: upstreamRes.status,
      });
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Target is not an image", { status: 415 });
    }

    const contentLength = parseInt(upstreamRes.headers.get("content-length") || "0", 10);
    if (contentLength > 5 * 1024 * 1024) {
      return new NextResponse("Image exceeds 5MB size limit", { status: 413 });
    }

    const imageBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Image fetch error: ${err.message}`, { status: 502 });
  }
}

