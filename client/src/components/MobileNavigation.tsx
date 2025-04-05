import { Link } from "wouter";
import { LibraryBig, Search, Folder, Settings, LogOut, User } from "lucide-react";
import styreneLogoPath from "../assets/styrenelogo-t.png";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MobileNavigationProps {
  activePage: string;
}

export default function MobileNavigation({ activePage }: MobileNavigationProps) {
  const { user, logoutMutation } = useAuth();
  
  // Don't show navigation on auth page
  if (activePage === 'auth') return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-2 z-10">
      <div className="flex justify-around">
        <Link 
          href="/" 
          className={`flex flex-col items-center p-2 ${
            activePage === 'library' ? 'text-accent' : 'text-muted-foreground hover:text-accent'
          }`}
        >
          <LibraryBig className="h-6 w-6" />
          <span className="text-xs mt-1">Library</span>
        </Link>
        
        <Link 
          href="/folders" 
          className={`flex flex-col items-center p-2 ${
            activePage === 'folders' ? 'text-accent' : 'text-muted-foreground hover:text-accent'
          }`}
        >
          <Folder className="h-6 w-6" />
          <span className="text-xs mt-1">Folders</span>
        </Link>
        
        <Link 
          href="/settings" 
          className={`flex flex-col items-center p-2 ${
            activePage === 'settings' ? 'text-accent' : 'text-muted-foreground hover:text-accent'
          }`}
        >
          <Settings className="h-6 w-6" />
          <span className="text-xs mt-1">Settings</span>
        </Link>
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className={`flex flex-col items-center p-2 text-muted-foreground hover:text-accent`}>
              <User className="h-6 w-6" />
              <span className="text-xs mt-1">Account</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>{user.displayName?.[0] || user.username[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm truncate max-w-[150px]">
                  {user.displayName || user.username}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
