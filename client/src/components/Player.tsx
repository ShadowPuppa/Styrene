import { useMemo, useEffect, useState } from "react";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Heart, 
  Volume2, 
  ListMusic 
} from "lucide-react";

const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "0:00";
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function Player() {
  const { 
    currentSong, 
    isPlaying, 
    togglePlayPause, 
    playNext, 
    playPrevious, 
    currentTime, 
    duration, 
    volume, 
    setVolume, 
    seek 
  } = useAudioPlayer();
  
  // Local state for progress display
  const [progress, setProgress] = useState(0);
  
  // Calculate progress for slider
  useEffect(() => {
    if (duration) {
      setProgress((currentTime / duration) * 100);
    } else {
      setProgress(0);
    }
  }, [currentTime, duration]);
  
  // Handle progress bar change
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    if (duration) {
      seek((newProgress / 100) * duration);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
  };
  
  // Fallback image URL
  const albumArtUrl = useMemo(() => {
    return currentSong?.coverPath || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentSong?.title || 'Music')}&background=1e1e1e&color=fff&size=128`;
  }, [currentSong]);
  
  // If no song is loaded yet
  if (!currentSong) {
    return (
      <div className="bg-card border-t border-border p-3">
        <div className="flex items-center justify-center text-muted-foreground">
          <span>Select a song to start playback</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-card border-t border-border p-3 z-10">
      <div className="flex flex-col md:flex-row items-center">
        {/* Currently Playing */}
        <div className="flex items-center md:w-1/4 w-full md:mb-0 mb-3">
          <div className="h-12 w-12 mr-3 flex-shrink-0">
            <img 
              src={albumArtUrl} 
              alt="Now playing" 
              className="h-12 w-12 object-cover rounded"
            />
          </div>
          <div className="mr-4 overflow-hidden">
            <div className="text-sm font-medium truncate">{currentSong.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {currentSong.artist || 'Unknown Artist'}
            </div>
          </div>
          <button className="hidden md:block text-muted-foreground hover:text-foreground">
            <Heart className="h-5 w-5" />
          </button>
        </div>
        
        {/* Player Controls */}
        <div className="flex flex-col items-center md:w-2/4 w-full mb-3 md:mb-0">
          <div className="flex items-center space-x-4 mb-1">
            <button className="text-muted-foreground hover:text-foreground">
              <Shuffle className="h-5 w-5" />
            </button>
            <button 
              className="text-muted-foreground hover:text-foreground"
              onClick={playPrevious}
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button 
              className="w-10 h-10 rounded-full bg-white text-background flex items-center justify-center"
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button 
              className="text-muted-foreground hover:text-foreground"
              onClick={playNext}
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button className="text-muted-foreground hover:text-foreground">
              <Repeat className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center w-full px-2">
            <span className="text-xs text-muted-foreground mr-2">
              {formatTime(currentTime)}
            </span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress} 
              onChange={handleProgressChange}
              className="progress-bar w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-muted-foreground ml-2">
              {formatTime(duration)}
            </span>
          </div>
        </div>
        
        {/* Volume Controls */}
        <div className="hidden md:flex items-center justify-end md:w-1/4 space-x-3">
          <button className="text-muted-foreground hover:text-foreground">
            <ListMusic className="h-5 w-5" />
          </button>
          <button className="text-muted-foreground hover:text-foreground">
            <Volume2 className="h-5 w-5" />
          </button>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume * 100} 
            onChange={handleVolumeChange}
            className="volume-slider w-24 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
