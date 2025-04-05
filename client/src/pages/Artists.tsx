import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Song } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { apiRequest } from "@/lib/queryClient";

export default function Artists() {
  const { playSong, setQueue } = useAudioPlayer();
  const [artists, setArtists] = useState<{ name: string; songs: Song[] }[]>([]);

  const { data: songs, isLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    queryFn: async () => {
      const response = await fetch("/api/songs");
      return response.json();
    },
  });

  useEffect(() => {
    if (songs) {
      // Group songs by artist
      const artistMap = new Map<string, Song[]>();
      
      songs.forEach(song => {
        const artistName = song.artist || "Unknown Artist";
        if (!artistMap.has(artistName)) {
          artistMap.set(artistName, []);
        }
        artistMap.get(artistName)?.push(song);
      });
      
      // Convert map to array for rendering
      const artistsArray = Array.from(artistMap).map(([name, songs]) => ({
        name,
        songs
      }));
      
      // Sort by artist name
      artistsArray.sort((a, b) => a.name.localeCompare(b.name));
      
      setArtists(artistsArray);
    }
  }, [songs]);

  const handlePlayArtist = (artistSongs: Song[]) => {
    if (artistSongs.length > 0) {
      setQueue(artistSongs);
      playSong(artistSongs[0]);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Artists</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <Skeleton className="h-40 w-full" />
              </CardContent>
              <CardFooter className="flex flex-col items-start p-4">
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Artists</h1>
      
      {artists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No artists found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists.map((artist, index) => (
            <Card 
              key={index} 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePlayArtist(artist.songs)}
            >
              <CardContent className="p-0">
                <div className="h-40 bg-primary/10 flex items-center justify-center">
                  <div className="text-4xl font-bold text-primary/50">
                    {artist.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start p-4">
                <h3 className="font-medium text-lg truncate w-full">{artist.name}</h3>
                <p className="text-muted-foreground text-sm">{artist.songs.length} songs</p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}