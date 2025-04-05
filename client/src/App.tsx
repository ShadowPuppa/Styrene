import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import Library from "@/pages/Library";
import Album from "@/pages/Album";
import Folders from "@/pages/Folders";
import Settings from "@/pages/Settings";
import Songs from "@/pages/Songs";
import Artists from "@/pages/Artists";
import Albums from "@/pages/Albums";
import Playlists from "@/pages/Playlists";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { useEffect, useRef } from "react";
import { useAudioPlayer } from "@/lib/audioPlayer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <ProtectedRoute component={Library} />
      </Route>
      <Route path="/songs">
        <ProtectedRoute component={Songs} />
      </Route>
      <Route path="/artists">
        <ProtectedRoute component={Artists} />
      </Route>
      <Route path="/albums">
        <ProtectedRoute component={Albums} />
      </Route>
      <Route path="/album/:id">
        <ProtectedRoute component={Album} />
      </Route>
      <Route path="/playlists">
        <ProtectedRoute component={Playlists} />
      </Route>
      <Route path="/folders">
        <ProtectedRoute component={Folders} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route>
        <ProtectedRoute component={NotFound} />
      </Route>
    </Switch>
  );
}

function App() {
  // Initialize audio element for the player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initAudio = useAudioPlayer(state => state.initAudio);
  
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audioRef.current = audio;
      initAudio(audio);
    }
  }, [initAudio]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
