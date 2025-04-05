import { create } from 'zustand';
import { Song } from './types';

interface AudioPlayerState {
  // Current playback
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  audioElement: HTMLAudioElement | null;
  
  // Methods
  initAudio: (audioElement: HTMLAudioElement) => void;
  playSong: (song: Song) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  updateCurrentTime: (time: number) => void;
  updateDuration: (duration: number) => void;
}

export const useAudioPlayer = create<AudioPlayerState>((set, get) => {
  return {
    // Initial state
    currentSong: null,
    queue: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    audioElement: null,
    
    // Methods
    initAudio: (audioElement: HTMLAudioElement) => {
      // Set initial volume
      audioElement.volume = get().volume;
      
      // Add event listeners
      audioElement.addEventListener('timeupdate', () => {
        get().updateCurrentTime(audioElement.currentTime);
      });
      
      audioElement.addEventListener('durationchange', () => {
        get().updateDuration(audioElement.duration);
      });
      
      audioElement.addEventListener('ended', () => {
        get().playNext();
      });
      
      set({ audioElement });
    },
    
    playSong: (song: Song) => {
      const { audioElement } = get();
      if (!audioElement) return;
      
      // Record play in history
      fetch(`/api/songs/${song.id}/play`, { method: 'POST' })
        .catch(err => console.error('Error recording play:', err));
      
      // Set the song and prepare audio
      set({ currentSong: song, isPlaying: true });
      
      // Set audio source
      audioElement.src = `/api/stream/${song.id}`;
      audioElement.load();
      audioElement.play().catch(err => {
        console.error('Error playing audio:', err);
        set({ isPlaying: false });
      });
    },
    
    togglePlayPause: () => {
      const { audioElement, isPlaying } = get();
      if (!audioElement || !get().currentSong) return;
      
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play().catch(err => console.error('Error playing audio:', err));
      }
      
      set({ isPlaying: !isPlaying });
    },
    
    playNext: () => {
      const { currentSong, queue } = get();
      if (queue.length === 0) return;
      
      // Find current index
      const currentIndex = currentSong 
        ? queue.findIndex(song => song.id === currentSong.id) 
        : -1;
      
      // Get next song
      const nextIndex = currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
      const nextSong = queue[nextIndex];
      
      if (nextSong) {
        get().playSong(nextSong);
      }
    },
    
    playPrevious: () => {
      const { currentSong, queue, audioElement } = get();
      if (queue.length === 0 || !audioElement) return;
      
      // If we're past 3 seconds in the current song, restart it
      if (audioElement.currentTime > 3) {
        audioElement.currentTime = 0;
        return;
      }
      
      // Find current index
      const currentIndex = currentSong 
        ? queue.findIndex(song => song.id === currentSong.id) 
        : -1;
      
      // Get previous song
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
      const prevSong = queue[prevIndex];
      
      if (prevSong) {
        get().playSong(prevSong);
      }
    },
    
    setQueue: (songs: Song[]) => {
      set({ queue: songs });
    },
    
    addToQueue: (song: Song) => {
      set(state => ({ queue: [...state.queue, song] }));
    },
    
    setVolume: (volume: number) => {
      const { audioElement } = get();
      if (audioElement) {
        audioElement.volume = volume;
      }
      set({ volume });
    },
    
    seek: (time: number) => {
      const { audioElement } = get();
      if (audioElement) {
        audioElement.currentTime = time;
      }
    },
    
    updateCurrentTime: (time: number) => {
      set({ currentTime: time });
    },
    
    updateDuration: (duration: number) => {
      set({ duration });
    },
  };
});
