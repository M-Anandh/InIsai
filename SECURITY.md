# InIsai (இனிசை) — Security Policy

## 1. Security Philosophy
InIsai is designed with defense-in-depth principles:
- **No Service Keys in Frontend:** Only the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` is included in the client build. The `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to secure server-side environments and never exposed to the browser.
- **Row Level Security (RLS):** All Supabase PostgreSQL tables employ strict RLS policies. Users can only read, insert, update, and delete their own records (profiles, playlists, history, liked tracks).
- **Client-Side Media Sandbox:** User local audio files are processed entirely in memory or stored in the browser's origin-isolated IndexedDB. No audio files are automatically uploaded to remote servers.
- **Input Validation:** All user inputs and API parameters are validated using Zod schemas.

## 2. Reporting Vulnerabilities
If you discover a security vulnerability in InIsai, please open a private report or contact the maintainer directly.

