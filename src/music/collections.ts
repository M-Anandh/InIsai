export interface OfficialCollectionDefinition {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  artworkUrl: string;
  queries: string[];
  targetCount: number;
}

export const INISAI_OFFICIAL_COLLECTIONS: OfficialCollectionDefinition[] = [
  {
    id: "ilaiyaraaja-maestro-hits",
    title: "Ilaiyaraaja — Maestro Hits",
    subtitle: "Iconic symphonies & evergreen Tamil classics curated cleanly from Isaignani's discography.",
    gradient: "from-amber-600/80 via-rose-700/70 to-indigo-900",
    artworkUrl: "https://c.saavncdn.com/256/Mouna-Ragam-Tamil-2024-20251210130325-500x500.jpg",
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
    artworkUrl: "https://c.saavncdn.com/129/Thalapathi-Tamil-1991-20200814125819-500x500.jpg",
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
    artworkUrl: "https://c.saavncdn.com/832/Leo-Tamil-2023-20231020150912-500x500.jpg",
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
    artworkUrl: "https://c.saavncdn.com/264/Amaran-Tamil-2024-20241104112344-500x500.jpg",
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
    artworkUrl: "https://c.saavncdn.com/393/Aasa-Kooda-From-Think-Indie-Tamil-2024-20240614181215-500x500.jpg",
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
    artworkUrl: "https://c.saavncdn.com/001/Ponniyin-Selvan-Part-1-Tamil-2022-20220930101500-500x500.jpg",
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
    artworkUrl: "https://c.saavncdn.com/463/Paiya-Tamil-2009-20200814132800-500x500.jpg",
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
    artworkUrl: "https://c.saavncdn.com/083/Jeans-Tamil-1998-20200814125910-500x500.jpg",
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
    artworkUrl: "https://c.saavncdn.com/452/Master-Tamil-2020-20201217083049-500x500.jpg",
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
    artworkUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80",
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
    artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80",
    queries: [
      "Carnatic Veena flute instrumental ragas peaceful",
      "Calm Indian classical meditation flute",
      "Spiritual chanting Gayatri Mantra peaceful",
    ],
    targetCount: 25,
  },
];

