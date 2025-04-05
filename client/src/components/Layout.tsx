import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import Player from "@/components/Player";
import { useLocation, Link } from "wouter";
import styreneLogoPath from "../assets/styrenelogo-t.png";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Extract page from location
  const currentPage = location === "/" 
    ? "library" 
    : location.substring(1).split("/")[0];

  // Don't show navigation and player on authentication page
  const isAuthPage = location === "/auth";
  
  if (isAuthPage) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Sidebar - Hidden on mobile */}
      <Sidebar activePage={currentPage} />
      
      {/* Main Content Section */}
      <div className="flex-1 flex flex-col w-full">
        {/* Mobile Header - Only shown on mobile */}
        <div className="flex items-center justify-between p-4 md:hidden border-b border-border">
          <Link href="/">
            <div className="flex items-center">
              <img src={styreneLogoPath} alt="Styrene Logo" className="h-9 w-9 text-accent mr-2" />
              <h1 className="text-2xl font-medium text-foreground">Styrene</h1>
            </div>
          </Link>
          
          {user && (
            <div className="text-sm font-medium">
              {user.displayName || user.username}
            </div>
          )}
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
        
        {/* Player - Fixed at the bottom */}
        <Player />
      </div>
      
      {/* Mobile Navigation - Fixed at the bottom */}
      <MobileNavigation activePage={currentPage} />
    </div>
  );
}
