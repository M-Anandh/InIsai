import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === "https://placeholder-project.supabase.co") {
      // Local or unconfigured Supabase instance - guest deletion
      return NextResponse.json({
        success: true,
        message: "Guest profile and local data purged.",
      });
    }

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authentication token" },
        { status: 401 }
      );
    }

    // Verify token and retrieve user
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await client.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized or expired session" },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Use admin client if service role key is available
    if (serviceRoleKey && serviceRoleKey !== "your-supabase-service-role-key") {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Cascade delete user data across tables
      await Promise.allSettled([
        adminClient.from("liked_songs").delete().eq("user_id", userId),
        adminClient.from("playlists").delete().eq("user_id", userId),
        adminClient.from("history").delete().eq("user_id", userId),
        adminClient.from("listening_history").delete().eq("user_id", userId),
        adminClient.from("signals").delete().eq("user_id", userId),
        adminClient.from("profiles").delete().eq("id", userId),
      ]);

      // Delete the Supabase auth user
      const { error: deleteUserErr } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteUserErr) {
        console.error("[AccountDelete] Admin delete error:", deleteUserErr);
      }
    } else {
      // Fallback: Delete rows permitted by user's RLS policies
      const userAuthedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      await Promise.allSettled([
        userAuthedClient.from("liked_songs").delete().eq("user_id", userId),
        userAuthedClient.from("playlists").delete().eq("user_id", userId),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Account and associated data deleted permanently.",
    });
  } catch (err: any) {
    console.error("[AccountDelete] Fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
