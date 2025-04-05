export interface Song {
  id: number;
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
  path: string;
  fileType: string;
  folderPath: string;
  coverPath: string | null;
  lastPlayed: string | null;
}

export interface Folder {
  id: number;
  path: string;
  name: string;
  parent: string | null;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}
