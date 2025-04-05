import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Folder, HardDrive, Check } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [isRescanning, setIsRescanning] = useState(false);
  
  const handleRescanLibrary = async () => {
    try {
      setIsRescanning(true);
      
      await apiRequest('/api/rescan', { method: 'POST' });
      
      toast({
        title: "Library Scan Complete",
        description: "Your music library has been scanned successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error rescanning library:', error);
      
      toast({
        title: "Scan Failed",
        description: "There was an error scanning your music library.",
        variant: "destructive",
      });
    } finally {
      setIsRescanning(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-medium mb-6">Settings</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Music Library</CardTitle>
            <CardDescription>
              Configure how Styrene accesses and manages your music files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="library-path">Music Library Path</Label>
              <div className="flex gap-2">
                <Input 
                  id="library-path" 
                  value="./music_library" 
                  disabled
                  className="flex-1"
                />
                <Button variant="outline" size="icon">
                  <Folder className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This is the default path where your music is stored. Changes require restart.
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <Label>Scan Library</Label>
                  <p className="text-sm text-muted-foreground">
                    Scan your music library to find new or changed files.
                  </p>
                </div>
                <Button 
                  onClick={handleRescanLibrary} 
                  disabled={isRescanning}
                  className="bg-primary text-white"
                >
                  {isRescanning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Rescan Library
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Playback Settings</CardTitle>
            <CardDescription>
              Configure audio playback preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Crossfade Between Tracks</Label>
                <p className="text-sm text-muted-foreground">
                  Smoothly transition between songs.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="crossfade" className="text-sm">2s</Label>
                <Input 
                  id="crossfade" 
                  type="range" 
                  min="0" 
                  max="12" 
                  defaultValue="2"
                  className="w-24 h-2"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Audio Quality</Label>
                <p className="text-sm text-muted-foreground">
                  Higher quality uses more bandwidth.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <select className="bg-card border-border rounded px-3 py-1 text-sm">
                  <option>Original</option>
                  <option>High (320kbps)</option>
                  <option>Medium (160kbps)</option>
                  <option>Low (96kbps)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>
              Configure how Styrene gathers and manages metadata for your music.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="musicbrainz-toggle">MusicBrainz Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically fetch missing song metadata from MusicBrainz.org
                  </p>
                </div>
                <Switch id="musicbrainz-toggle" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Technical details about your Styrene instance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Type</span>
                <span>In-Memory</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supported Formats</span>
                <span>MP3, WAV, FLAC, OGG, M4A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metadata Source</span>
                <span>MusicBrainz.org</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 py-2 px-6 text-xs text-muted-foreground">
            <div className="flex items-center">
              <HardDrive className="h-3 w-3 mr-1" />
              Music Library Path: ./music_library
            </div>
            <div className="ml-auto flex items-center">
              <Check className="h-3 w-3 mr-1 text-primary" />
              Server Running
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
