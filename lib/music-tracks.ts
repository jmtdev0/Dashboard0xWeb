export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  sourceUrl: string;
  audioUrl: string;
  durationSeconds: number;
};

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "klustone-romance",
    title: "Klustone - Romance",
    artist: "EELF",
    sourceUrl: "https://www.youtube.com/watch?v=30WXaYsIt-w",
    audioUrl: "/audio/klustone-romance.mp3",
    durationSeconds: 302,
  },
];
