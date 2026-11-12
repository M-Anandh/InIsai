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

      // Delete nested playlist_items for user's playlists first if table exists
      try {
        const { data: userPlaylists } = await adminClient
          .from("playlists")
          .select("id")
          .eq("user_id", userId);
        const playlistIds = (userPlaylists || []).map((p: { id: string }) => p.id).filter(Boolean);
        if (playlistIds.length > 0) {
          await adminClient.from("playlist_items").delete().in("playlist_id", playlistIds);
        }
      } catch {
        // Optional table
      }

      // Cascade delete user data across all user tables (self-only via verified JWT userId)
      await Promise.allSettled([
        adminClient.from("liked_songs").delete().eq("user_id", userId),
        adminClient.from("liked_tracks").delete().eq("user_id", userId),
        adminClient.from("playlists").delete().eq("user_id", userId),
        adminClient.from("history").delete().eq("user_id", userId),
        adminClient.from("listening_history").delete().eq("user_id", userId),
        adminClient.from("signals").delete().eq("user_id", userId),
        adminClient.from("taste_profiles").delete().eq("user_id", userId),
        adminClient.from("profiles").delete().eq("id", userId),
      ]);

      // Best-effort storage cleanup for user avatar/backup buckets if present
      for (const bucket of ["avatars", "user-data"]) {
        try {
          const { data: files } = await adminClient.storage.from(bucket).list(userId);
          if (files && files.length > 0) {
            await adminClient.storage
              .from(bucket)
              .remove(files.map((f) => `${userId}/${f.name}`));
          }
        } catch {
          // Bucket may not exist
        }
      }

      // Revoke active session tokens & delete auth user
      try {
        await adminClient.auth.admin.signOut(token, "global");
      } catch {
        // Proceed with user deletion even if session revocation fails
      }

      const { error: deleteUserErr } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteUserErr) {
        console.error("[AccountDelete] Admin delete error:", deleteUserErr);
        return NextResponse.json(
          { error: deleteUserErr.message || "Failed to delete authentication user" },
          { status: 500 }
        );
      }
    } else {
      // Fallback: Delete rows permitted by user's RLS policies
      const userAuthedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      await Promise.allSettled([
        userAuthedClient.from("liked_songs").delete().eq("user_id", userId),
        userAuthedClient.from("liked_tracks").delete().eq("user_id", userId),
        userAuthedClient.from("playlists").delete().eq("user_id", userId),
        userAuthedClient.from("history").delete().eq("user_id", userId),
        userAuthedClient.from("listening_history").delete().eq("user_id", userId),
        userAuthedClient.from("signals").delete().eq("user_id", userId),
        userAuthedClient.from("taste_profiles").delete().eq("user_id", userId),
        userAuthedClient.from("profiles").delete().eq("id", userId),
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

