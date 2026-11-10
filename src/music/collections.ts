export interface OfficialCollectionDefinition {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  queries: string[];
  targetCount: number;
}

export const INISAI_OFFICIAL_COLLECTIONS: OfficialCollectionDefinition[] = [
  {
    id: "ilaiyaraaja-maestro-hits",
    title: "Ilaiyaraaja — Maestro Hits",
    subtitle: "Iconic symphonies & evergreen Tamil classics curated cleanly from Isaignani's discography.",
    gradient: "from-amber-600/80 via-rose-700/70 to-indigo-900",
    queries: [
      "Nilaave Vaa Ilaiyaraaja",
      "Kanne Kalaimane Ilaiyaraaja",
      "Thendral Vandhu Ennai Thodum Ilaiyaraaja",
      "Ilaya Nila Pozhigirathe",
      "Raja Raja Cholan Ilaiyaraaja",
      "Poove Sempoove Ilaiyaraaja",
      "Janani Janani Ilaiyaraaja",
      "Rakkamma Kaiya Thattu Ilaiyaraaja",
      "Ilaiyaraaja evergreen Tamil hit songs",
    ],
    targetCount: 25,
  },
  {
    id: "ilaiyaraaja-melody-gold",
    title: "Ilaiyaraaja — Melody Gold",
    subtitle: "SPB • Yesudas • S. Janaki • Chithra golden era soulful duets.",
    gradient: "from-orange-500/80 via-pink-600/75 to-purple-900",
    queries: [
      "Ilaiyaraaja SPB melody songs",
      "Ilaiyaraaja Janaki evergreen Tamil songs",
      "Ilaiyaraaja Chithra golden hits",
      "Mandram Vandha Thendralukku",
      "Sundari Kannal Oru Sethi",
    ],
    targetCount: 25,
  },
  {
    id: "anirudh-mass-melody",
    title: "Anirudh — Mass & Melody",
    subtitle: "High-energy Rockstar chartbusters and soul-stirring modern Tamil ballads.",
    gradient: "from-fuchsia-600/80 via-purple-700/75 to-cyan-800",
    queries: [
      "Why This Kolaveri Di Anirudh",
      "Vaathi Coming Anirudh",
      "Arabic Kuthu Anirudh",
      "Hukum Anirudh Jailer",
      "Kaavaalaa Jailer Anirudh",
      "Naa Ready Leo Anirudh",
      "Badass Leo Anirudh",
      "Manasilaayo Vettaiyan Anirudh",
      "Pathikichu Anirudh",
      "Ordinary Person Leo Anirudh",
      "Anirudh Ravichander Tamil hits playlist",
    ],
    targetCount: 25,
  },
  {
    id: "top-tamil-2026",
    title: "Top Tamil 2026",
    subtitle: "The biggest Tamil releases and viral anthems defining 2026.",
    gradient: "from-indigo-600/80 via-violet-600/75 to-rose-600",
    queries: [
      "Top Tamil songs 2026 hits",
      "Latest Tamil movie songs 2026",
      "Tamil trending chartbusters 2026",
    ],
    targetCount: 25,
  },
  {
    id: "tamil-trending-now",
    title: "Tamil Trending Now",
    subtitle: "Real-time Tamil chart sensations sweeping listeners everywhere.",
    gradient: "from-rose-500/80 via-orange-500/75 to-amber-600",
    queries: [
      "Tamil trending music now hits",
      "New Tamil hits Sai Abhyankkar Anirudh G V Prakash",
      "Top Tamil viral songs",
    ],
    targetCount: 25,
  },
  {
    id: "ar-rahman-essentials",
    title: "A. R. Rahman Essentials",
    subtitle: "Oscar maestro's transcendent soundscapes from Roja to Ponniyin Selvan.",
    gradient: "from-emerald-600/80 via-teal-700/75 to-indigo-900",
    queries: [
      "A R Rahman Tamil hits classics",
      "Munbe Vaa A R Rahman",
      "Uyire Uyire Bombay A R Rahman",
      "Nenjukkule A R Rahman",
    ],
    targetCount: 25,
  },
  {
    id: "yuvan-feel",
    title: "Yuvan — Feel",
    subtitle: "Late-night emotion and signature Yuvan Shankar Raja therapy.",
    gradient: "from-violet-600/80 via-indigo-700/80 to-slate-900",
    queries: [
      "Yuvan Shankar Raja melody hits",
      "Pogadhe Pogadhe Yuvan",
      "Loosu Penne Yuvan",
      "Oru Kal Oru Kannadi Yuvan",
    ],
    targetCount: 25,
  },
  {
    id: "tamil-90s-love",
    title: "Tamil 90s Love",
    subtitle: "Nostalgic 90s romance by Rahman, Deva, Vidyasagar, and Sirpy.",
    gradient: "from-pink-600/80 via-rose-700/75 to-amber-800",
    queries: [
      "90s Tamil love songs evergreen",
      "Vidyasagar melody Tamil hits",
      "Deva 90s Tamil romantic songs",
    ],
    targetCount: 25,
  },
  {
    id: "kuthu-and-dance",
    title: "Kuthu & Dance",
    subtitle: "Full-throttle percussion, dappankuthu basslines, and festival bangers.",
    gradient: "from-orange-600/85 via-red-600/80 to-purple-800",
    queries: [
      "Tamil kuthu dance party songs",
      "Tamil mass dance hits",
      "Otha Sollaala Aaluma Doluma Tamil",
    ],
    targetCount: 25,
  },
  {
    id: "late-night-drive",
    title: "Late-Night Drive",
    subtitle: "Lush atmospheric tracks for midnight highways and headphones.",
    gradient: "from-slate-800 via-indigo-900 to-purple-950",
    queries: [
      "Tamil chill lofi drive songs",
      "Alan Walker The Weeknd midnight drive music",
      "English ambient chill hits",
    ],
    targetCount: 25,
  },
  {
    id: "peaceful-meditation-ragas",
    title: "Peaceful Meditation & Ragas",
    subtitle: "Veena acoustics, flute ragas, and serene spiritual soundscapes.",
    gradient: "from-teal-600/80 via-emerald-700/75 to-cyan-900",
    queries: [
      "Carnatic Veena flute instrumental ragas peaceful",
      "Calm Indian classical meditation flute",
      "Spiritual chanting Gayatri Mantra peaceful",
    ],
    targetCount: 25,
  },
];
