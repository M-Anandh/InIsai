import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !token) {
      return NextResponse.json(
        { error: "Unauthorized or missing credentials" },
        { status: 401 }
      );
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized session" },
        { status: 401 }
      );
    }

    const [likesRes, playlistsRes] = await Promise.all([
      client.from("liked_songs").select("*").eq("user_id", user.id),
      client.from("playlists").select("*").eq("user_id", user.id),
    ]);

    const exportPayload = {
      version: "2.0",
      app: "InIsai (இனிசை)",
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      likedSongs: likesRes.data || [],
      playlists: playlistsRes.data || [],
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="inisai-export-${user.id.slice(0, 8)}-${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Export failed" },
      { status: 500 }
    );
  }
}
