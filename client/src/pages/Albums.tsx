import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Song } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface Album {
  name: string;
  artist: string;
  songs: Song[];
  coverPath: string | null;
}

export default function Albums() {
  const [albums, setAlbums] = useState<Album[]>([]);

  const { data: songs, isLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    queryFn: async () => {
      const response = await fetch("/api/songs");
      return response.json();
    },
  });

  useEffect(() => {
    if (songs) {
      // Group songs by album
      const albumMap = new Map<string, Album>();
      
      songs.forEach(song => {
        const albumName = song.album || "Unknown Album";
        const artistName = song.artist || "Unknown Artist";
        const key = `${albumName}-${artistName}`;
        
        if (!albumMap.has(key)) {
          albumMap.set(key, {
            name: albumName,
            artist: artistName,
            songs: [],
            coverPath: song.coverPath
          });
        }
        
        albumMap.get(key)?.songs.push(song);
      });
      
      // Convert map to array for rendering
      const albumsArray = Array.from(albumMap.values());
      
      // Sort by album name
      albumsArray.sort((a, b) => a.name.localeCompare(b.name));
      
      setAlbums(albumsArray);
    }
  }, [songs]);

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Albums</h1>
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
      <h1 className="text-3xl font-bold mb-6">Albums</h1>
      
      {albums.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No albums found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {albums.map((album, index) => (
            <Link key={index} href={`/album/${encodeURIComponent(album.name)}`}>
              <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {album.coverPath ? (
                    <img 
                      src={album.coverPath} 
                      alt={album.name} 
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="h-40 bg-primary/10 flex items-center justify-center">
                      <div className="text-4xl font-bold text-primary/50">
                        {album.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col items-start p-4">
                  <h3 className="font-medium text-lg truncate w-full">{album.name}</h3>
                  <p className="text-muted-foreground text-sm">{album.artist}</p>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}