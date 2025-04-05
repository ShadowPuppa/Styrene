import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Folder, Song } from "@/lib/types";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { FolderOpen, Music, ChevronRight, MoreVertical, Play } from "lucide-react";

export default function Folders() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const currentPath = urlParams.get('path') || '';
  
  // State for current folder
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  
  // Fetch all folders
  const { data: folders } = useQuery<Folder[]>({
    queryKey: ['/api/folders'],
  });
  
  // Fetch songs in the current folder
  const { data: songs, isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs', { folder: currentPath }],
    enabled: !!currentPath,
  });
  
  // Fetch subfolders
  const [subFolders, setSubFolders] = useState<Folder[]>([]);
  
  // Audio player functions
  const { playSong, setQueue } = useAudioPlayer();
  
  // Update current folder when path changes
  useEffect(() => {
    if (folders && currentPath) {
      const folder = folders.find(f => f.path === currentPath);
      setCurrentFolder(folder || null);
      
      // Find subfolders
      const subs = folders.filter(f => f.parent === currentPath);
      setSubFolders(subs);
    } else if (folders) {
      // Find root folders (with no parent)
      const rootFolders = folders.filter(f => !f.parent);
      setSubFolders(rootFolders);
    }
  }, [folders, currentPath]);
  
  // Handle play song
  const handlePlaySong = (song: Song) => {
    if (songs) {
      setQueue(songs);
      playSong(song);
    }
  };
  
  // Play all songs in current folder
  const handlePlayAll = () => {
    if (songs && songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Build breadcrumbs
  const buildBreadcrumbs = () => {
    if (!currentPath || !folders) return [];
    
    const parts = [];
    let path = currentPath;
    
    while (path) {
      const folder = folders.find(f => f.path === path);
      if (folder) {
        parts.unshift({
          name: folder.name,
          path: folder.path
        });
        path = folder.parent || '';
      } else {
        break;
      }
    }
    
    return parts;
  };
  
  const breadcrumbs = buildBreadcrumbs();
  
  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Folder Browser</h1>
      
      {/* Breadcrumbs */}
      <div className="flex items-center mb-6 overflow-x-auto pb-2">
        <a 
          href="/folders" 
          className="text-muted-foreground hover:text-foreground flex items-center"
        >
          <FolderOpen className="h-4 w-4 mr-1" />
          Root
        </a>
        
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
            <a 
              href={`/folders?path=${encodeURIComponent(crumb.path)}`}
              className={`${
                index === breadcrumbs.length - 1 
                  ? 'text-foreground font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {crumb.name}
            </a>
          </div>
        ))}
      </div>
      
      {/* Folder contents */}
      <div className="space-y-6">
        {/* Subfolder list */}
        {subFolders.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-3">Folders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subFolders.map(folder => (
                <a 
                  key={folder.path}
                  href={`/folders?path=${encodeURIComponent(folder.path)}`}
                  className="flex items-center p-4 bg-card rounded-md hover:bg-opacity-90 transition"
                >
                  <FolderOpen className="h-10 w-10 text-muted-foreground mr-3" />
                  <div>
                    <h3 className="font-medium">{folder.name}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Songs list */}
        {currentPath && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Songs</h2>
              
              {songs && songs.length > 0 && (
                <button 
                  onClick={handlePlayAll}
                  className="flex items-center px-4 py-1 rounded-full bg-primary text-white text-sm hover:bg-opacity-90"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Play All
                </button>
              )}
            </div>
            
            {songsLoading ? (
              <div className="text-muted-foreground">Loading songs...</div>
            ) : !songs || songs.length === 0 ? (
              <div className="text-muted-foreground">No songs in this folder</div>
            ) : (
              <div className="bg-card rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-card">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Artist</th>
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
                              <Music className="h-10 w-10 p-2 rounded bg-background" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{song.title}</div>
                              <div className="text-sm text-muted-foreground md:hidden">{song.artist || 'Unknown Artist'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm hidden md:table-cell">
                          {song.artist || 'Unknown Artist'}
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
          </div>
        )}
      </div>
    </div>
  );
}
