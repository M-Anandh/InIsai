-- Seed initial curated track metadata for InIsai
INSERT INTO public.tracks (id, title, artist, album, duration, artwork_url, stream_url, source_type, source_id, language, genre)
VALUES 
(
  'inisai-tamil-01',
  'Malarndhum Malaraadha (மலர்ந்தும் மலராத)',
  'T. M. Soundararajan, P. Susheela',
  'Pasamalar Classics',
  214,
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'https://ia800301.us.archive.org/15/items/MalarndhumMalaraadha/Malarndhum%20Malaraadha.mp3',
  'curated',
  'curated-tamil-01',
  'Tamil',
  'Melody'
),
(
  'inisai-tamil-02',
  'Kanne Kalaimane (கண்ணே கலைமானே)',
  'K. J. Yesudas, Ilaiyaraaja',
  'Moondram Pirai Evergreens',
  242,
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'https://ia800208.us.archive.org/30/items/KanneKalaimane/Kanne_Kalaimane.mp3',
  'curated',
  'curated-tamil-02',
  'Tamil',
  'Melody'
),
(
  'inisai-inst-01',
  'Midnight Veena Serenade (சாரங்கி வீணை நாதம்)',
  'Carnatic Ambient Collective',
  'Acoustic Nirvana',
  210,
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
  'curated',
  'curated-inst-01',
  'Instrumental',
  'Classical'
)
ON CONFLICT (id) DO NOTHING;
