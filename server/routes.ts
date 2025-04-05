import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { musicScanner } from "./musicScanner";
import { songSearchSchema, insertPlaylistSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize music library
  try {
    await musicScanner.scanLibrary();
  } catch (error) {
    console.error("Error initializing music library:", error);
  }

  // Setup authentication routes and middleware
  const { isAuthenticated } = setupAuth(app);

  // API Routes
  
  // ----- Song Routes -----
  app.get("/api/songs", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string | undefined;
      const folder = req.query.folder as string | undefined;
      
      const searchParams = songSearchSchema.parse({ query, folder });
      const songs = await storage.getSongs(searchParams);
      
      res.json(songs);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to get songs" });
      }
    }
  });

  app.get("/api/songs/recent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
      const recentSongs = await storage.getRecentlyPlayed(userId, limit);
      res.json(recentSongs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recently played songs" });
    }
  });

  app.get("/api/songs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid song ID" });
      }
      
      const song = await storage.getSong(id);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }
      
      res.json(song);
    } catch (error) {
      res.status(500).json({ message: "Failed to get song" });
    }
  });

  app.post("/api/songs/:id/play", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const songId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      if (isNaN(songId)) {
        return res.status(400).json({ message: "Invalid song ID" });
      }
      
      const updatedSong = await storage.updateSongLastPlayed(songId, userId);
      if (!updatedSong) {
        return res.status(404).json({ message: "Song not found" });
      }
      
      res.json(updatedSong);
    } catch (error) {
      res.status(500).json({ message: "Failed to update last played time" });
    }
  });

  // ----- Folder Routes -----
  app.get("/api/folders", async (req: Request, res: Response) => {
    try {
      const folders = await storage.getFolders();
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get folders" });
    }
  });

  app.get("/api/folders/sub", async (req: Request, res: Response) => {
    try {
      const parentPath = req.query.parent as string;
      if (!parentPath) {
        return res.status(400).json({ message: "Parent path is required" });
      }
      
      const subFolders = await storage.getSubFolders(parentPath);
      res.json(subFolders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get sub-folders" });
    }
  });

  // ----- Playlist Routes -----
  app.get("/api/playlists", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const playlists = await storage.getPlaylists(userId);
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ message: "Failed to get playlists" });
    }
  });

  app.post("/api/playlists", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const playlistData = insertPlaylistSchema.parse({
        ...req.body,
        userId
      });
      
      const playlist = await storage.createPlaylist(playlistData);
      res.status(201).json(playlist);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create playlist" });
      }
    }
  });

  app.get("/api/playlists/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.id);
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: "Invalid playlist ID" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if the playlist belongs to the user
      if (playlist.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ message: "Failed to get playlist" });
    }
  });

  app.get("/api/playlists/:id/songs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.id);
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: "Invalid playlist ID" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if the playlist belongs to the user
      if (playlist.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const songs = await storage.getPlaylistSongs(playlistId);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get playlist songs" });
    }
  });

  app.patch("/api/playlists/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.id);
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: "Invalid playlist ID" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if the playlist belongs to the user
      if (playlist.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { name, description, coverPath } = req.body;
      
      const updatedPlaylist = await storage.updatePlaylist(playlistId, {
        name,
        description,
        coverPath
      });
      
      res.json(updatedPlaylist);
    } catch (error) {
      res.status(500).json({ message: "Failed to update playlist" });
    }
  });

  app.delete("/api/playlists/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.id);
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: "Invalid playlist ID" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if the playlist belongs to the user
      if (playlist.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const success = await storage.deletePlaylist(playlistId);
      if (success) {
        res.json({ message: "Playlist deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete playlist" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete playlist" });
    }
  });

  app.post("/api/playlists/:id/songs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.id);
      const songId = parseInt(req.body.songId);
      const position = req.body.position !== undefined ? parseInt(req.body.position) : -1;
      
      if (isNaN(playlistId) || isNaN(songId)) {
        return res.status(400).json({ message: "Invalid playlist ID or song ID" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if the playlist belongs to the user
      if (playlist.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.addSongToPlaylist(playlistId, songId, position);
      res.json({ message: "Song added to playlist" });
    } catch (error) {
      res.status(500).json({ message: "Failed to add song to playlist" });
    }
  });

  app.delete("/api/playlists/:playlistId/songs/:songId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.playlistId);
      const songId = parseInt(req.params.songId);
      
      if (isNaN(playlistId) || isNaN(songId)) {
        return res.status(400).json({ message: "Invalid playlist ID or song ID" });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if the playlist belongs to the user
      if (playlist.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.removeSongFromPlaylist(playlistId, songId);
      res.json({ message: "Song removed from playlist" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove song from playlist" });
    }
  });

  // ----- Favorites Routes -----
  app.get("/api/favorites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to get favorites" });
    }
  });

  app.post("/api/favorites/:songId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const songId = parseInt(req.params.songId);
      
      if (isNaN(songId)) {
        return res.status(400).json({ message: "Invalid song ID" });
      }
      
      await storage.addToFavorites(userId, songId);
      res.json({ message: "Song added to favorites" });
    } catch (error) {
      res.status(500).json({ message: "Failed to add song to favorites" });
    }
  });

  app.delete("/api/favorites/:songId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const songId = parseInt(req.params.songId);
      
      if (isNaN(songId)) {
        return res.status(400).json({ message: "Invalid song ID" });
      }
      
      await storage.removeFromFavorites(userId, songId);
      res.json({ message: "Song removed from favorites" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove song from favorites" });
    }
  });

  app.get("/api/favorites/:songId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const songId = parseInt(req.params.songId);
      
      if (isNaN(songId)) {
        return res.status(400).json({ message: "Invalid song ID" });
      }
      
      const isFavorite = await storage.isUserFavorite(userId, songId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // ----- Stream Route -----
  app.get("/api/stream/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid song ID" });
      }
      
      const song = await storage.getSong(id);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }
      
      const filePath = song.path;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      // Handle range requests for streaming
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] && parts[1].trim() !== "" ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        
        // Handle invalid ranges
        if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
          // Return the full file if range is invalid
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': `audio/${song.fileType}`
          });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        
        const fileStream = fs.createReadStream(filePath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': `audio/${song.fileType}`
        });
        
        fileStream.pipe(res);
      } else {
        // Send entire file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': `audio/${song.fileType}`
        });
        
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      console.error("Streaming error:", error);
      res.status(500).json({ message: "Failed to stream audio" });
    }
  });

  // ----- Admin Routes -----
  app.post("/api/rescan", async (req: Request, res: Response) => {
    try {
      await musicScanner.scanLibrary();
      res.json({ message: "Music library scan completed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to rescan music library" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
