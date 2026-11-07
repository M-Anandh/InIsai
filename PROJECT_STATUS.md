# InIsai (இனிசை) — Project Status

*Last updated: Dev Overlay Suppressed, Change Password, Sign Out Everywhere & Dark/Light Theme*

---

## 1. Project Overview
- **Name:** InIsai (இனிசை)
- **Tagline:** Every Beat, Your World.
- **Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand, Supabase PostgreSQL, Web Audio API, PWA (Service Worker + Manifest).
- **Target Deployment:** Vercel Hobby + Supabase Free ($0 / ₹0 recurring cost).

---

## 2. Latest Enhancements & Features Completed

1. **Suppressed Next.js Developer Tools Overlay:**
   - Disabled `devIndicators: false` in `next.config.ts`.
   - Injected global CSS override to suppress `nextjs-portal`, `[data-nextjs-dev-indicator]`, and dev toasts in `globals.css`.
   - The black "N" badge in the bottom-left corner is completely removed for a clean experience.

2. **Sign Out Everywhere:**
   - Added a prominent **Sign Out** button in [`ProfilePage`](file:///e:/Music/src/app/profile/page.tsx) header card.
   - Added direct **Sign Out** button in [`Header.tsx`](file:///e:/Music/src/components/layout/Header.tsx) next to the user avatar.
   - Added **Sign Out** option in [`Sidebar.tsx`](file:///e:/Music/src/components/layout/Sidebar.tsx) below Profile.

3. **Change Password in Profile Section:**
   - Built a dedicated **Security & Change Password** card in [`ProfilePage`](file:///e:/Music/src/app/profile/page.tsx).
   - Features New Password and Confirm Password inputs with show/hide password toggle.
   - Fully wired to `changePassword` in `useAuthStore` and Supabase Auth with visual confirmation feedback.

4. **Dark & Light Theme Mode:**
   - Created reusable [`ThemeToggle.tsx`](file:///e:/Music/src/components/ui/ThemeToggle.tsx) component with Sun / Moon toggle.
   - Supported in [`Header.tsx`](file:///e:/Music/src/components/layout/Header.tsx) and [`ProfilePage`](file:///e:/Music/src/app/profile/page.tsx).
   - Full CSS variables and class overrides in `globals.css` for instant switching between deep midnight dark and clean modern light mode.

5. **Nilaave Vaa Featured Hero Track:**
   - Replaced *Malarndhum Malaraadha* with **"Nilaave Vaa"** from *Mouna Ragam* (Ilaiyaraaja, SPB) with direct 500x500 artwork and 320kbps `.mp4` audio stream.

6. **Dynamic Multi-Language Explore:**
   - English, Telugu, Malayalam, Hindi, and Tamil dynamic search on `/explore` with high-bitrate streaming.

---

## 3. Verification & Test Status
- **Unit Tests:** `npm test` passed 9/9 tests (0 failures).
- **Production Build:** `npm run build` compiled 20/20 routes cleanly with 0 errors.
