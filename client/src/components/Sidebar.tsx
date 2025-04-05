import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Folder } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import { 
  LibraryBig, 
  Album, 
  Music, 
  PersonStanding, 
  Pause, 
  Folder as FolderIcon, 
  Settings, 
  ChevronLeft, 
  EllipsisVertical,
  LogOut,
  User
} from "lucide-react";
import styreneLogoPath from "../assets/styrenelogo-t.png";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  activePage: string;
}

export default function Sidebar({ activePage }: SidebarProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const { user, logoutMutation } = useAuth();
  
  // Fetch folders for the folder browser
  const { data: folders } = useQuery<Folder[]>({
    queryKey: ['/api/folders'],
  });
  
  const toggleFolder = (folderPath: string) => {
    setOpenFolders(prevOpenFolders => {
      const newOpenFolders = new Set(prevOpenFolders);
      if (newOpenFolders.has(folderPath)) {
        newOpenFolders.delete(folderPath);
      } else {
        newOpenFolders.add(folderPath);
      }
      return newOpenFolders;
    });
  };
  
  // Group folders by parent
  const foldersByParent = folders?.reduce((acc, folder) => {
    const parent = folder.parent || 'root';
    if (!acc[parent]) {
      acc[parent] = [];
    }
    acc[parent].push(folder);
    return acc;
  }, {} as Record<string, Folder[]>) || {};
  
  // Render sub-folders recursively
  const renderSubFolders = (parentPath: string) => {
    const children = foldersByParent[parentPath];
    if (!children || children.length === 0) return null;
    
    return (
      <ul className="ml-4 mt-1 space-y-1">
        {children.map(folder => (
          <li key={folder.id}>
            <Link 
              href={`/folders?path=${encodeURIComponent(folder.path)}`}
              className="flex items-center px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <FolderIcon className="mr-2 h-4 w-4" />
              {folder.name}
            </Link>
          </li>
        ))}
      </ul>
    );
  };
  
  return (
    <div className="hidden md:flex md:flex-col md:w-64 bg-card border-r border-border">
      <div className="flex items-center p-4">
        <img src={styreneLogoPath} alt="Styrene Logo" className="h-8 w-8 text-accent mr-2" />
        <h1 className="text-2xl font-medium text-foreground">Styrene</h1>
      </div>
      
      <div className="p-4">
        <SearchBar />
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 px-2">
          <li>
            <Link 
              href="/" 
              className={`flex items-center px-4 py-3 rounded-md hover:bg-primary hover:bg-opacity-10 ${
                activePage === 'library' 
                  ? 'bg-primary bg-opacity-20 text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LibraryBig className="h-5 w-5 mr-3" />
              Library
            </Link>
          </li>
          <li>
            <Link 
              href="/albums" 
              className={`flex items-center px-4 py-3 rounded-md hover:bg-primary hover:bg-opacity-10 ${
                activePage === 'albums' 
                  ? 'bg-primary bg-opacity-20 text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Album className="h-5 w-5 mr-3" />
              Albums
            </Link>
          </li>
          <li>
            <Link 
              href="/songs" 
              className={`flex items-center px-4 py-3 rounded-md hover:bg-primary hover:bg-opacity-10 ${
                activePage === 'songs' 
                  ? 'bg-primary bg-opacity-20 text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Music className="h-5 w-5 mr-3" />
              Songs
            </Link>
          </li>
          <li>
            <Link 
              href="/artists" 
              className={`flex items-center px-4 py-3 rounded-md hover:bg-primary hover:bg-opacity-10 ${
                activePage === 'artists' 
                  ? 'bg-primary bg-opacity-20 text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PersonStanding className="h-5 w-5 mr-3" />
              Artists
            </Link>
          </li>
          <li>
            <Link 
              href="/playlists" 
              className={`flex items-center px-4 py-3 rounded-md hover:bg-primary hover:bg-opacity-10 ${
                activePage === 'playlists' 
                  ? 'bg-primary bg-opacity-20 text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Pause className="h-5 w-5 mr-3" />
              Playlists
            </Link>
          </li>
        </ul>
        
        {/* Folder Browser */}
        <div className="mt-6 p-4">
          <h3 className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Folders</h3>
          <ul className="space-y-1">
            {folders && foldersByParent['root']?.map(folder => (
              <li key={folder.id}>
                <div 
                  className="flex items-center px-2 py-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => toggleFolder(folder.path)}
                >
                  <FolderIcon className="h-4 w-4 mr-2" />
                  {folder.name}
                  {openFolders.has(folder.path) ? (
                    <ChevronLeft className="ml-auto h-4 w-4" />
                  ) : (
                    <EllipsisVertical className="ml-auto h-4 w-4" />
                  )}
                </div>
                {openFolders.has(folder.path) && renderSubFolders(folder.path)}
              </li>
            ))}
          </ul>
        </div>
      </nav>
      
      <div className="border-t border-border">
        <Link 
          href="/settings" 
          className={`flex items-center justify-start px-4 py-3 rounded-md w-full text-muted-foreground hover:text-foreground hover:bg-primary hover:bg-opacity-10 ${
            activePage === 'settings' ? 'text-foreground' : ''
          }`}
        >
          <Settings className="h-5 w-5 mr-3 flex-shrink-0" />
          <span className="text-sm">Settings</span>
        </Link>
        
        {user && (
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-start h-auto px-4 py-3 rounded-md text-left w-full text-muted-foreground hover:text-foreground hover:bg-primary hover:bg-opacity-10">
                  <User className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div className="text-sm font-medium truncate max-w-[120px]">
                    {user.displayName || user.username}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()} 
                  disabled={logoutMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
