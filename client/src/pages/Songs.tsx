import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Song } from "@/lib/types";
import { Play, Clock } from "lucide-react";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Songs() {
  const { playSong, setQueue } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: songs, isLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    queryFn: async () => {
      const response = await fetch("/api/songs");
      return response.json();
    },
  });

  const handlePlayAll = () => {
    if (songs && songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  const handlePlaySong = (song: Song) => {
    if (songs) {
      setQueue(songs);
      playSong(song);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredSongs = songs?.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.artist && song.artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (song.album && song.album.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Songs</h1>
        <div className="mb-4 flex justify-between items-center">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="rounded-md border overflow-hidden">
          <div className="bg-card p-4 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Title</div>
              <div className="col-span-3">Artist</div>
              <div className="col-span-2">Album</div>
              <div className="col-span-1 text-right">Duration</div>
            </div>
          </div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="border-b last:border-0 p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1">
                  <Skeleton className="h-4 w-4" />
                </div>
                <div className="col-span-5">
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="col-span-3">
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="col-span-1">
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Songs</h1>
      
      <div className="mb-4 flex flex-col md:flex-row justify-between gap-4 md:items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Search songs..."
            className="w-full md:w-80 px-4 py-2 rounded-md border border-input bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button 
          variant="default" 
          size="sm" 
          onClick={handlePlayAll}
          disabled={!songs || songs.length === 0}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          Play All
        </Button>
      </div>
      
      {(!filteredSongs || filteredSongs.length === 0) ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No songs match your search." : "No songs found."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="bg-card p-4 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Title</div>
              <div className="col-span-3">Artist</div>
              <div className="col-span-2">Album</div>
              <div className="col-span-1 text-right">
                <Clock className="h-4 w-4 ml-auto" />
              </div>
            </div>
          </div>
          
          {filteredSongs.map((song, index) => (
            <div 
              key={song.id} 
              className="border-b last:border-0 hover:bg-accent/5 transition-colors cursor-pointer"
              onClick={() => handlePlaySong(song)}
            >
              <div className="grid grid-cols-12 gap-4 items-center p-4">
                <div className="col-span-1 text-muted-foreground">{index + 1}</div>
                <div className="col-span-5 font-medium truncate">{song.title}</div>
                <div className="col-span-3 text-muted-foreground truncate">{song.artist || "Unknown Artist"}</div>
                <div className="col-span-2 text-muted-foreground truncate">{song.album || "Unknown Album"}</div>
                <div className="col-span-1 text-muted-foreground text-right">{formatDuration(song.duration)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}