import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import { Song } from "@/lib/types";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { ListFilter, Grid, Play, MoreVertical } from "lucide-react";
import { formatDistance } from 'date-fns';

interface AlbumCardProps {
  title: string;
  artist?: string;
  coverUrl: string;
  onClick: () => void;
}

function AlbumCard({ title, artist, coverUrl, onClick }: AlbumCardProps) {
  return (
    <div 
      className="bg-card rounded-md overflow-hidden hover:bg-opacity-80 transition cursor-pointer" 
      onClick={onClick}
    >
      <div className="aspect-w-1 aspect-h-1 relative">
        <img 
          src={coverUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=1e1e1e&color=fff&size=128`}
          alt={`${title} cover`} 
          className="object-cover w-full h-48 sm:h-40"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <button 
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Play className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{title}</h3>
        <p className="text-muted-foreground text-xs truncate">{artist || 'Unknown Artist'}</p>
      </div>
    </div>
  );
}

export default function Library() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const searchQuery = urlParams.get('query');

  // Fetch songs, applying search if present
  const { data: songs, isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs', searchQuery],
    enabled: true,
  });

  // Fetch recently played
  const { data: recentSongs, isLoading: recentLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs/recent'],
  });

  // Get player functions
  const { playSong, setQueue } = useAudioPlayer();

  // Group songs by album to show in recently played
  const albumsByName = recentSongs?.reduce((acc, song) => {
    if (!song.album) return acc;
    
    if (!acc[song.album]) {
      acc[song.album] = {
        title: song.album,
        artist: song.artist,
        coverPath: song.coverPath,
        songs: []
      };
    }
    
    acc[song.album].songs.push(song);
    return acc;
  }, {} as Record<string, { title: string, artist: string | null, coverPath: string | null, songs: Song[] }>);
  
  const recentAlbums = albumsByName ? Object.values(albumsByName) : [];

  // Play a song and set the queue to all songs
  const handlePlaySong = (song: Song) => {
    if (songs) {
      setQueue(songs);
      playSong(song);
    }
  };

  // Play an album
  const handlePlayAlbum = (albumSongs: Song[]) => {
    if (albumSongs.length > 0) {
      setQueue(albumSongs);
      playSong(albumSongs[0]);
    }
  };

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format last played
  const formatLastPlayed = (dateString: string | null) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  return (
    <div>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-accent mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 13.5V18M16.5 7.5V18M7.5 18V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="text-xl font-medium">SoundStream</h1>
        </div>
        <Link href="/search">
          <button className="p-2 rounded-full hover:bg-card">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>
        </Link>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium">
            {searchQuery ? `Search Results: "${searchQuery}"` : "Your Library"}
          </h1>
          <div className="flex space-x-2">
            <button className="p-2 rounded-full hover:bg-card">
              <ListFilter className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-card bg-primary bg-opacity-20">
              <Grid className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Recently Played Section - only show if not searching */}
        {!searchQuery && (
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-4">Recently Played</h2>
            {recentLoading ? (
              <div className="text-muted-foreground">Loading recently played...</div>
            ) : recentAlbums.length === 0 ? (
              <div className="text-muted-foreground">No recently played albums</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recentAlbums.slice(0, 6).map((album, index) => (
                  <AlbumCard
                    key={`${album.title}-${index}`}
                    title={album.title}
                    artist={album.artist || undefined}
                    coverUrl={album.coverPath || ''}
                    onClick={() => handlePlayAlbum(album.songs)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        
        {/* All Songs Section */}
        <section>
          <h2 className="text-lg font-medium mb-4">
            {searchQuery ? 'Matching Songs' : 'All Songs'}
          </h2>
          {songsLoading ? (
            <div className="text-muted-foreground">Loading songs...</div>
          ) : !songs || songs.length === 0 ? (
            <div className="text-muted-foreground">
              {searchQuery ? 'No songs matching your search' : 'No songs found in your library'}
            </div>
          ) : (
            <div className="bg-card rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-card">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Artist</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Album</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Duration</th>
                    <th scope="col" className="relative px-6 py-3 w-10">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {songs.map((song, index) => (
                    <tr 
                      key={song.id} 
                      className="hover:bg-background transition cursor-pointer"
                      onClick={() => handlePlaySong(song)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 mr-3">
                            <img 
                              className="h-10 w-10 rounded" 
                              src={song.coverPath || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=1e1e1e&color=fff&size=128`} 
                              alt="Album Art"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{song.title}</div>
                            <div className="text-sm text-muted-foreground md:hidden">{song.artist || 'Unknown Artist'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground hidden md:table-cell">
                        {song.artist || 'Unknown Artist'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground hidden lg:table-cell">
                        {song.album || 'Unknown Album'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground hidden sm:table-cell">
                        {formatDuration(song.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-muted-foreground">
                        <button 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Would handle more options here
                          }}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
