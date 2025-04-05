import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Song } from "@/lib/types";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { Play, Pause, MoreVertical, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Album() {
  // Get album ID from route
  const [match, params] = useRoute<{ id: string }>("/album/:id");
  const albumId = params?.id;
  
  // Get songs by album
  const { data: songs, isLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs', { album: albumId }],
    enabled: !!albumId,
  });
  
  // Get player functions
  const { playSong, setQueue, currentSong, isPlaying, togglePlayPause } = useAudioPlayer();
  
  // Collect album info from the first song
  const albumInfo = songs?.[0] ? {
    title: songs[0].album || 'Unknown Album',
    artist: songs[0].artist || 'Unknown Artist',
    coverPath: songs[0].coverPath
  } : null;
  
  // Handle play album button
  const handlePlayAlbum = () => {
    if (songs && songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };
  
  // Handle play song
  const handlePlaySong = (song: Song) => {
    if (songs) {
      setQueue(songs);
      playSong(song);
    }
  };
  
  // Check if this album is currently playing
  const isAlbumPlaying = !!currentSong && songs?.some(song => song.id === currentSong.id) && isPlaying;
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate total duration
  const totalDuration = songs?.reduce((total, song) => total + (song.duration || 0), 0) || 0;
  const totalDurationFormatted = () => {
    const minutes = Math.floor(totalDuration / 60);
    const seconds = totalDuration % 60;
    return `${minutes} min ${seconds} sec`;
  };
  
  return (
    <div>
      <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Library
      </Link>
      
      {isLoading ? (
        <div className="text-center py-8">Loading album...</div>
      ) : !albumInfo ? (
        <div className="text-center py-8">Album not found</div>
      ) : (
        <>
          {/* Album Header */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
            <div className="h-48 w-48 flex-shrink-0">
              <img 
                src={albumInfo.coverPath || `https://ui-avatars.com/api/?name=${encodeURIComponent(albumInfo.title)}&background=1e1e1e&color=fff&size=200`}
                alt={albumInfo.title}
                className="h-full w-full object-cover rounded-md shadow-lg"
              />
            </div>
            
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">{albumInfo.title}</h1>
              <p className="text-muted-foreground text-lg mt-1">{albumInfo.artist}</p>
              <p className="text-muted-foreground text-sm mt-2">
                {songs?.length || 0} songs • {totalDurationFormatted()}
              </p>
              
              <div className="mt-4">
                <button 
                  onClick={isAlbumPlaying ? togglePlayPause : handlePlayAlbum}
                  className="px-5 py-2.5 rounded-full bg-primary text-white flex items-center justify-center hover:bg-opacity-90"
                >
                  {isAlbumPlaying ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Play
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Song List */}
          <div className="bg-card rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-card">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Duration</th>
                  <th scope="col" className="relative px-6 py-3 w-10">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {songs?.map((song, index) => {
                  const isCurrentSong = currentSong?.id === song.id;
                  
                  return (
                    <tr 
                      key={song.id} 
                      className={`hover:bg-background transition cursor-pointer ${isCurrentSong ? 'bg-primary bg-opacity-10' : ''}`}
                      onClick={() => handlePlaySong(song)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 mr-3 md:hidden">
                            <img 
                              className="h-10 w-10 rounded" 
                              src={song.coverPath || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=1e1e1e&color=fff&size=128`} 
                              alt="Album Art"
                            />
                          </div>
                          <div className="text-sm font-medium">{song.title}</div>
                        </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
