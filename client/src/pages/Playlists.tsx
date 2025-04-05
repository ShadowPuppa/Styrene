import { useState } from "react";
import { PlusCircle, Music } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Playlists() {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Placeholder for playlists - in a production app, this would be stored in the database
  // This would be populated via a useQuery hook for data fetching
  const [playlists, setPlaylists] = useState<{ id: number; name: string; songCount: number }[]>([
    // Empty initially - feature to be implemented
  ]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a playlist name",
        variant: "destructive",
      });
      return;
    }

    // This would be a database operation in a real app
    const newPlaylist = {
      id: Date.now(), // Temporary ID generation
      name: newPlaylistName,
      songCount: 0
    };

    setPlaylists([...playlists, newPlaylist]);
    setNewPlaylistName("");
    setIsDialogOpen(false);

    toast({
      title: "Success",
      description: `Playlist "${newPlaylistName}" created!`,
    });
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Playlists</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-2 md:mt-0">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="col-span-3"
                  placeholder="My Awesome Playlist"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlaylist}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-primary/10 p-6 rounded-full mb-4">
            <Music className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-xl font-medium mb-2">No playlists yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first playlist to organize your music just the way you like it
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Your First Playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="playlist-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="playlist-name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="col-span-3"
                    placeholder="My Awesome Playlist"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePlaylist}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlists.map((playlist) => (
            <Card 
              key={playlist.id} 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="p-0">
                <div className="h-40 bg-primary/10 flex items-center justify-center">
                  <Music className="h-16 w-16 text-primary/50" />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start p-4">
                <h3 className="font-medium text-lg truncate w-full">{playlist.name}</h3>
                <p className="text-muted-foreground text-sm">{playlist.songCount} songs</p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <div className="h-16">
        {/* Spacer for bottom player */}
      </div>
    </div>
  );
}