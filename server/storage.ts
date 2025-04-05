import { 
  users, 
  songs, 
  folders,
  playlists,
  playlistSongs,
  userFavorites,
  playbackHistory,
  userSongPreferences,
  songSimilarities,
  userListeningStats,
  type User, 
  type InsertUser, 
  type Song, 
  type InsertSong, 
  type Folder, 
  type InsertFolder,
  type SongSearch,
  type Playlist,
  type InsertPlaylist,
  type PlaylistSong,
  type InsertPlaylistSong,
  type UserSongPreference,
  type PlaybackHistory,
  type SongSimilarity,
  type UserListeningStats,
  type SmartShuffleOptions,
  type TimeOfDayPreferences,
  type DayOfWeekPreferences,
  type GenrePreferences,
  type ArtistPreferences,
  type FeaturePreferences,
  type ContextPreferences
} from "@shared/schema";
import session from "express-session";

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  
  // Song operations
  getSongs(search?: SongSearch): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSongLastPlayed(songId: number, userId: number): Promise<Song | undefined>;
  getRecentlyPlayed(userId: number, limit?: number): Promise<Song[]>;
  
  // Folder operations
  getFolders(): Promise<Folder[]>;
  getFolderByPath(path: string): Promise<Folder | undefined>;
  getSubFolders(parentPath: string): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  clearFolders(): Promise<void>;
  clearSongs(): Promise<void>;
  
  // Playlist operations
  getPlaylists(userId: number): Promise<Playlist[]>;
  getPlaylist(id: number): Promise<Playlist | undefined>;
  getPlaylistSongs(playlistId: number): Promise<Song[]>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(id: number, playlistData: Partial<InsertPlaylist>): Promise<Playlist | undefined>;
  deletePlaylist(id: number): Promise<boolean>;
  addSongToPlaylist(playlistId: number, songId: number, position: number): Promise<void>;
  removeSongFromPlaylist(playlistId: number, songId: number): Promise<void>;
  
  // Favorites operations
  getUserFavorites(userId: number): Promise<Song[]>;
  addToFavorites(userId: number, songId: number): Promise<void>;
  removeFromFavorites(userId: number, songId: number): Promise<void>;
  isUserFavorite(userId: number, songId: number): Promise<boolean>;
  
  // Smart Shuffle operations
  recordPlayback(userId: number, songId: number, playedFully: boolean, skipped: boolean, context?: string): Promise<PlaybackHistory>;
  getUserSongPreference(userId: number, songId: number): Promise<UserSongPreference | undefined>;
  updateUserSongPreference(userId: number, songId: number, data: Partial<UserSongPreference>): Promise<UserSongPreference>;
  getUserListeningStats(userId: number): Promise<UserListeningStats | undefined>;
  updateUserListeningStats(userId: number, data: Partial<UserListeningStats>): Promise<UserListeningStats>;
  getSongSimilarity(sourceSongId: number, targetSongId: number): Promise<SongSimilarity | undefined>;
  updateSongSimilarity(sourceSongId: number, targetSongId: number, similarityScore: number): Promise<SongSimilarity>;
  getSmartShuffleRecommendations(userId: number, options: SmartShuffleOptions, limit?: number): Promise<Song[]>;
}

import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private songs: Map<number, Song>;
  private folders: Map<number, Folder>;
  private playlists: Map<number, Playlist>;
  private playlistSongsMap: Map<string, number>; // Maps playlistId-songId to position
  private userFavoritesMap: Map<string, Date>; // Maps userId-songId to addedAt
  private playbackHistoryMap: Map<number, PlaybackHistory>;
  private userSongPreferencesMap: Map<string, UserSongPreference>; // Maps userId-songId to preference
  private songSimilaritiesMap: Map<string, SongSimilarity>; // Maps sourceSongId-targetSongId to similarity
  private userListeningStatsMap: Map<number, UserListeningStats>; // userId to stats
  
  private userCurrentId: number;
  private songCurrentId: number;
  private folderCurrentId: number;
  private playlistCurrentId: number;
  private playbackHistoryCurrentId: number;
  private userListeningStatsCurrentId: number;
  
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.songs = new Map();
    this.folders = new Map();
    this.playlists = new Map();
    this.playlistSongsMap = new Map();
    this.userFavoritesMap = new Map();
    this.playbackHistoryMap = new Map();
    this.userSongPreferencesMap = new Map();
    this.songSimilaritiesMap = new Map();
    this.userListeningStatsMap = new Map();
    
    this.userCurrentId = 1;
    this.songCurrentId = 1;
    this.folderCurrentId = 1;
    this.playlistCurrentId = 1;
    this.playbackHistoryCurrentId = 1;
    this.userListeningStatsCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      ...insertUser, 
      id,
      displayName: insertUser.displayName || null,
      email: insertUser.email || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user,
      ...userData,
      displayName: userData.displayName !== undefined ? userData.displayName : user.displayName,
      email: userData.email !== undefined ? userData.email : user.email
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Song operations
  async getSongs(search?: SongSearch): Promise<Song[]> {
    let result = Array.from(this.songs.values());
    
    if (search?.query) {
      const query = search.query.toLowerCase();
      result = result.filter(song => 
        song.title.toLowerCase().includes(query) || 
        (song.artist && song.artist.toLowerCase().includes(query)) ||
        (song.album && song.album.toLowerCase().includes(query))
      );
    }
    
    if (search?.folder) {
      result = result.filter(song => song.folderPath === search.folder || song.folderPath.startsWith(`${search.folder}/`));
    }
    
    return result;
  }

  async getSong(id: number): Promise<Song | undefined> {
    return this.songs.get(id);
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const id = this.songCurrentId++;
    const song: Song = { 
      ...insertSong, 
      id, 
      artist: insertSong.artist || null,
      album: insertSong.album || null,
      duration: insertSong.duration || null,
      coverPath: insertSong.coverPath || null,
      lastPlayed: null,
      // Add the new properties for smart shuffle
      genre: null,
      releaseYear: null,
      energy: null,
      danceability: null,
      tempo: null,
      tags: null
    };
    this.songs.set(id, song);
    return song;
  }

  async updateSongLastPlayed(songId: number, userId: number): Promise<Song | undefined> {
    const song = this.songs.get(songId);
    if (!song) return undefined;
    
    // Update last played timestamp for the song
    const updatedSong = { 
      ...song, 
      lastPlayed: new Date() 
    };
    this.songs.set(songId, updatedSong);
    
    // Add to user's playback history
    const historyId = this.playbackHistoryCurrentId++;
    this.playbackHistoryMap.set(historyId, {
      id: historyId,
      userId,
      songId,
      playedAt: new Date(),
      playedFully: true,
      skipped: false,
      context: null
    });
    
    return updatedSong;
  }

  async getRecentlyPlayed(userId: number, limit = 10): Promise<Song[]> {
    // Get user's playback history, sorted by most recent
    const userHistory = Array.from(this.playbackHistoryMap.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
    
    // Get unique songs from history (most recent play of each song)
    const uniqueSongIds = new Set<number>();
    const recentSongIds: number[] = [];
    
    for (const history of userHistory) {
      if (!uniqueSongIds.has(history.songId)) {
        uniqueSongIds.add(history.songId);
        recentSongIds.push(history.songId);
        if (recentSongIds.length >= limit) break;
      }
    }
    
    // Return the songs in order
    return recentSongIds
      .map(id => this.songs.get(id))
      .filter((song): song is Song => song !== undefined);
  }

  // Folder operations
  async getFolders(): Promise<Folder[]> {
    return Array.from(this.folders.values());
  }

  async getFolderByPath(path: string): Promise<Folder | undefined> {
    return Array.from(this.folders.values()).find(
      (folder) => folder.path === path
    );
  }

  async getSubFolders(parentPath: string): Promise<Folder[]> {
    return Array.from(this.folders.values()).filter(
      (folder) => folder.parent === parentPath
    );
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const id = this.folderCurrentId++;
    const folder: Folder = { 
      ...insertFolder, 
      id,
      parent: insertFolder.parent || null
    };
    this.folders.set(id, folder);
    return folder;
  }

  async clearFolders(): Promise<void> {
    this.folders.clear();
    this.folderCurrentId = 1;
  }

  async clearSongs(): Promise<void> {
    this.songs.clear();
    this.songCurrentId = 1;
  }
  
  // Playlist operations
  async getPlaylists(userId: number): Promise<Playlist[]> {
    return Array.from(this.playlists.values())
      .filter(playlist => playlist.userId === userId);
  }
  
  async getPlaylist(id: number): Promise<Playlist | undefined> {
    return this.playlists.get(id);
  }
  
  async getPlaylistSongs(playlistId: number): Promise<Song[]> {
    // Get all songs in the playlist sorted by position
    const playlistEntries = Array.from(this.playlistSongsMap.entries())
      .filter(([key]) => key.startsWith(`${playlistId}-`))
      .map(([key, position]) => {
        const songId = parseInt(key.split('-')[1]);
        return { songId, position };
      })
      .sort((a, b) => a.position - b.position);
    
    // Map to actual songs
    return playlistEntries
      .map(entry => this.songs.get(entry.songId))
      .filter((song): song is Song => song !== undefined);
  }
  
  async createPlaylist(playlist: InsertPlaylist): Promise<Playlist> {
    const id = this.playlistCurrentId++;
    const newPlaylist: Playlist = {
      ...playlist,
      id,
      description: playlist.description || null,
      coverPath: playlist.coverPath || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.playlists.set(id, newPlaylist);
    return newPlaylist;
  }
  
  async updatePlaylist(id: number, playlistData: Partial<InsertPlaylist>): Promise<Playlist | undefined> {
    const playlist = this.playlists.get(id);
    if (!playlist) return undefined;
    
    const updatedPlaylist = {
      ...playlist,
      ...playlistData,
      description: playlistData.description !== undefined ? playlistData.description : playlist.description,
      coverPath: playlistData.coverPath !== undefined ? playlistData.coverPath : playlist.coverPath,
      updatedAt: new Date()
    };
    
    this.playlists.set(id, updatedPlaylist);
    return updatedPlaylist;
  }
  
  async deletePlaylist(id: number): Promise<boolean> {
    const success = this.playlists.delete(id);
    
    // Also delete all playlist songs
    const playlistSongKeys = Array.from(this.playlistSongsMap.keys())
      .filter(key => key.startsWith(`${id}-`));
    
    for (const key of playlistSongKeys) {
      this.playlistSongsMap.delete(key);
    }
    
    return success;
  }
  
  async addSongToPlaylist(playlistId: number, songId: number, position: number): Promise<void> {
    const key = `${playlistId}-${songId}`;
    this.playlistSongsMap.set(key, position);
  }
  
  async removeSongFromPlaylist(playlistId: number, songId: number): Promise<void> {
    const key = `${playlistId}-${songId}`;
    this.playlistSongsMap.delete(key);
    
    // Reorder remaining songs
    const playlistEntries = Array.from(this.playlistSongsMap.entries())
      .filter(([k]) => k.startsWith(`${playlistId}-`))
      .map(([k, pos]) => {
        const sId = parseInt(k.split('-')[1]);
        return { songId: sId, position: pos };
      })
      .sort((a, b) => a.position - b.position);
    
    // Update positions
    for (let i = 0; i < playlistEntries.length; i++) {
      const entry = playlistEntries[i];
      this.playlistSongsMap.set(`${playlistId}-${entry.songId}`, i);
    }
  }
  
  // Favorites operations
  async getUserFavorites(userId: number): Promise<Song[]> {
    const favoriteKeys = Array.from(this.userFavoritesMap.keys())
      .filter(key => key.startsWith(`${userId}-`));
    
    const songIds = favoriteKeys.map(key => parseInt(key.split('-')[1]));
    
    return songIds
      .map(id => this.songs.get(id))
      .filter((song): song is Song => song !== undefined)
      .sort((a, b) => {
        const keyA = `${userId}-${a.id}`;
        const keyB = `${userId}-${b.id}`;
        const timeA = this.userFavoritesMap.get(keyA)?.getTime() || 0;
        const timeB = this.userFavoritesMap.get(keyB)?.getTime() || 0;
        return timeB - timeA; // Sort by most recently added
      });
  }
  
  async addToFavorites(userId: number, songId: number): Promise<void> {
    const key = `${userId}-${songId}`;
    this.userFavoritesMap.set(key, new Date());
  }
  
  async removeFromFavorites(userId: number, songId: number): Promise<void> {
    const key = `${userId}-${songId}`;
    this.userFavoritesMap.delete(key);
  }
  
  async isUserFavorite(userId: number, songId: number): Promise<boolean> {
    const key = `${userId}-${songId}`;
    return this.userFavoritesMap.has(key);
  }
  
  // Smart Shuffle operations
  async recordPlayback(userId: number, songId: number, playedFully: boolean, skipped: boolean, context?: string): Promise<PlaybackHistory> {
    const id = this.playbackHistoryCurrentId++;
    const record: PlaybackHistory = {
      id,
      userId,
      songId,
      playedAt: new Date(),
      playedFully,
      skipped,
      context: context || null
    };
    
    this.playbackHistoryMap.set(id, record);
    
    // Update song's last played if appropriate
    if (playedFully && !skipped) {
      const song = this.songs.get(songId);
      if (song) {
        const updatedSong = {
          ...song,
          lastPlayed: new Date()
        };
        this.songs.set(songId, updatedSong);
      }
    }
    
    // Update user song preference
    const prefKey = `${userId}-${songId}`;
    const existingPref = this.userSongPreferencesMap.get(prefKey);
    
    if (existingPref) {
      const updateData: UserSongPreference = {
        ...existingPref,
        lastPlayed: new Date(),
        updatedAt: new Date(),
        playCount: playedFully ? existingPref.playCount + 1 : existingPref.playCount,
        skipCount: skipped ? existingPref.skipCount + 1 : existingPref.skipCount
      };
      
      // Calculate preference score
      const playWeight = 1;
      const skipWeight = -0.5;
      updateData.preferenceScore = 
        updateData.playCount * playWeight + 
        updateData.skipCount * skipWeight;
      
      this.userSongPreferencesMap.set(prefKey, updateData);
    } else {
      // Create new preference
      const newPref: UserSongPreference = {
        userId,
        songId,
        rating: null,
        playCount: playedFully ? 1 : 0,
        skipCount: skipped ? 1 : 0,
        lastPlayed: new Date(),
        preferenceScore: playedFully ? 1 : (skipped ? -0.5 : 0),
        updatedAt: new Date()
      };
      
      this.userSongPreferencesMap.set(prefKey, newPref);
    }
    
    // Update listening stats
    await this.updateListeningStatsFromPlayback(userId, songId, playedFully, skipped, context);
    
    return record;
  }
  
  async getUserSongPreference(userId: number, songId: number): Promise<UserSongPreference | undefined> {
    const key = `${userId}-${songId}`;
    return this.userSongPreferencesMap.get(key);
  }
  
  async updateUserSongPreference(userId: number, songId: number, data: Partial<UserSongPreference>): Promise<UserSongPreference> {
    const key = `${userId}-${songId}`;
    const existingPref = this.userSongPreferencesMap.get(key);
    
    if (existingPref) {
      const updatedPref: UserSongPreference = {
        ...existingPref,
        ...data,
        updatedAt: new Date()
      };
      this.userSongPreferencesMap.set(key, updatedPref);
      return updatedPref;
    } else {
      // Create new preference
      const newPref: UserSongPreference = {
        userId,
        songId,
        rating: null,
        playCount: 0,
        skipCount: 0,
        lastPlayed: null,
        preferenceScore: 0,
        ...data,
        updatedAt: new Date()
      };
      this.userSongPreferencesMap.set(key, newPref);
      return newPref;
    }
  }
  
  async getUserListeningStats(userId: number): Promise<UserListeningStats | undefined> {
    return this.userListeningStatsMap.get(userId);
  }
  
  async updateUserListeningStats(userId: number, data: Partial<UserListeningStats>): Promise<UserListeningStats> {
    const existingStats = this.userListeningStatsMap.get(userId);
    
    if (existingStats) {
      const updatedStats: UserListeningStats = {
        ...existingStats,
        ...data,
        updatedAt: new Date()
      };
      this.userListeningStatsMap.set(userId, updatedStats);
      return updatedStats;
    } else {
      // Create new stats
      const id = this.userListeningStatsCurrentId++;
      const newStats: UserListeningStats = {
        id,
        userId,
        timeOfDay: data.timeOfDay || {},
        dayOfWeek: data.dayOfWeek || {},
        genrePreferences: data.genrePreferences || {},
        artistPreferences: data.artistPreferences || {},
        featurePreferences: data.featurePreferences || {},
        contexts: data.contexts || {},
        updatedAt: new Date()
      };
      this.userListeningStatsMap.set(userId, newStats);
      return newStats;
    }
  }
  
  // Helper method to update listening stats based on playback
  private async updateListeningStatsFromPlayback(
    userId: number, 
    songId: number, 
    playedFully: boolean, 
    skipped: boolean,
    context?: string
  ): Promise<void> {
    if (!playedFully || skipped) return; // Only update stats for fully played songs
    
    // Get the song
    const song = this.songs.get(songId);
    if (!song) return;
    
    // Get or create user stats
    let stats = await this.getUserListeningStats(userId);
    if (!stats) {
      stats = await this.updateUserListeningStats(userId, {
        timeOfDay: {},
        dayOfWeek: {},
        genrePreferences: {},
        artistPreferences: {},
        featurePreferences: {},
        contexts: {},
      });
    }
    
    // Update time of day preference
    const hour = new Date().getHours();
    const timeOfDay: TimeOfDayPreferences = stats.timeOfDay || Object.create(null);
    timeOfDay[hour] = (timeOfDay[hour] || 0) + 1;
    
    // Update day of week preference
    const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const dayOfWeek: DayOfWeekPreferences = stats.dayOfWeek || {};
    dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;
    
    // Update genre preference if available
    const genrePreferences: GenrePreferences = stats.genrePreferences || {};
    if (song.genre) {
      genrePreferences[song.genre] = (genrePreferences[song.genre] || 0) + 1;
    }
    
    // Update artist preference if available
    const artistPreferences: ArtistPreferences = stats.artistPreferences || {};
    if (song.artist) {
      artistPreferences[song.artist] = (artistPreferences[song.artist] || 0) + 1;
    }
    
    // Update feature preferences if available
    const featurePreferences: FeaturePreferences = stats.featurePreferences || {
  energy: 0,
  energyCount: 0,
  tempo: 0,
  tempoCount: 0
	};

	if (song.energy !== null && song.energy !== undefined) {
  featurePreferences.energy = (featurePreferences.energy || 0) + song.energy;
  featurePreferences.energyCount = (featurePreferences.energyCount || 0) + 1;
	}
    
    // Update contexts if available
    const contexts: ContextPreferences = stats.contexts || {};
    if (context) {
      contexts[context] = (contexts[context] || 0) + 1;
    }
    
    // Save updated stats
    await this.updateUserListeningStats(userId, {
      timeOfDay,
      dayOfWeek,
      genrePreferences,
      artistPreferences,
      featurePreferences,
      contexts,
    });
  }
  
  async getSongSimilarity(sourceSongId: number, targetSongId: number): Promise<SongSimilarity | undefined> {
    const key = `${sourceSongId}-${targetSongId}`;
    return this.songSimilaritiesMap.get(key);
  }
  
  async updateSongSimilarity(sourceSongId: number, targetSongId: number, similarityScore: number): Promise<SongSimilarity> {
    const key = `${sourceSongId}-${targetSongId}`;
    const existingSimilarity = this.songSimilaritiesMap.get(key);
    
    if (existingSimilarity) {
      const updatedSimilarity: SongSimilarity = {
        ...existingSimilarity,
        similarityScore,
        updatedAt: new Date()
      };
      this.songSimilaritiesMap.set(key, updatedSimilarity);
      return updatedSimilarity;
    } else {
      // Create new similarity
      const newSimilarity: SongSimilarity = {
        sourceSongId,
        targetSongId,
        similarityScore,
        updatedAt: new Date()
      };
      this.songSimilaritiesMap.set(key, newSimilarity);
      return newSimilarity;
    }
  }
  
async getSmartShuffleRecommendations(userId: number, options: SmartShuffleOptions, limit: number = 20): Promise<Song[]> {
    // Get all songs
    const allSongs = Array.from(this.songs.values());
    
    // If smart shuffle is disabled, return random songs
    if (!options.useSmart) {
        let songs = allSongs.sort(() => Math.random() - 0.5);
        
        // Filter out recently played songs if exploreNew is enabled
        if (options.exploreNew) {
            const recentlyPlayed = Array.from(this.playbackHistoryMap.values())
                .filter(entry => entry.userId === userId)
                .map(entry => entry.songId);
            
            const recentIds = new Set(recentlyPlayed);
            songs = songs.filter(song => !recentIds.has(song.id));
        }
        
        return songs.slice(0, limit);
    }

    // Get user's listening stats
    const stats = await this.getUserListeningStats(userId);
    
    // Get favorite artists and genres from stats if available
    const favoriteArtists = new Set<string>();
    const favoriteGenres = new Set<string>();
    
    if (stats) {
        if (stats.artistPreferences) {
            Object.keys(stats.artistPreferences).forEach(artist => {
                if ((stats.artistPreferences[artist] || 0) > 5) {
                    favoriteArtists.add(artist);
                }
            });
        }
        
        if (stats.genrePreferences) {
            Object.keys(stats.genrePreferences).forEach(genre => {
                if ((stats.genrePreferences[genre] || 0) > 5) {
                    favoriteGenres.add(genre);
                }
            });
        }
    }

    // Calculate scores for each song
    const scoredSongs = allSongs.map(song => {
        let score = Math.random(); // Base random component
        
        // Preference score
        if (options.preferHighlyRated) {
            const prefKey = `${userId}-${song.id}`;
            const pref = this.userSongPreferencesMap.get(prefKey);
            if (pref) {
                score += pref.preferenceScore * 2; // Weight preference higher
            }
        }
        
        // Similarity to preferred artists/genres
        if (options.exploreSimilar) {
            // Artist similarity
            if (song.artist && favoriteArtists.has(song.artist)) {
                score += 1.5;
            }
            
            // Genre similarity
            if (song.genre && favoriteGenres.has(song.genre)) {
                score += 1;
            }
        }
        
        // Time of day preferences
        if (options.respectTimeOfDay && stats?.timeOfDay) {
            const hour = new Date().getHours();
            const hourPreference = stats.timeOfDay[hour];
            
            if (hourPreference && hourPreference > 5) {
                // If user has a strong preference for this hour, boost songs with similar properties
                if (stats.genrePreferences && song.genre && stats.genrePreferences[song.genre]) {
                    score += 0.5;
                }
            }
        }
        
        return { song, score };
    });
    
    // Sort by score and return
    return scoredSongs
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.song);
}

import { db } from './db';
import { eq, desc, like, and, or, isNull, sql, asc, inArray, not } from 'drizzle-orm';
import connectPg from "connect-pg-simple";
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }
  
  // Smart Shuffle operations
  async recordPlayback(userId: number, songId: number, playedFully: boolean, skipped: boolean, context?: string): Promise<PlaybackHistory> {
    // Insert playback record
    const [record] = await db
      .insert(playbackHistory)
      .values({
        userId,
        songId,
        playedAt: new Date(),
        playedFully,
        skipped,
        context: context || null
      })
      .returning();
    
    // Update song's last played if appropriate
    if (playedFully && !skipped) {
      await db
        .update(songs)
        .set({ lastPlayed: new Date() })
        .where(eq(songs.id, songId));
    }
    
    // Update user song preference
    const [existingPref] = await db
      .select()
      .from(userSongPreferences)
      .where(
        and(
          eq(userSongPreferences.userId, userId),
          eq(userSongPreferences.songId, songId)
        )
      );
    
    const playWeight = 1;
    const skipWeight = -0.5;
    
    if (existingPref) {
      // Update existing preference
      await db
        .update(userSongPreferences)
        .set({
          lastPlayed: new Date(),
          updatedAt: new Date(),
          playCount: playedFully ? existingPref.playCount + 1 : existingPref.playCount,
          skipCount: skipped ? existingPref.skipCount + 1 : existingPref.skipCount,
          preferenceScore: playedFully 
            ? existingPref.preferenceScore + playWeight
            : (skipped ? existingPref.preferenceScore + skipWeight : existingPref.preferenceScore)
        })
        .where(
          and(
            eq(userSongPreferences.userId, userId),
            eq(userSongPreferences.songId, songId)
          )
        );
    } else {
      // Create new preference
      await db
        .insert(userSongPreferences)
        .values({
          userId,
          songId,
          rating: null,
          playCount: playedFully ? 1 : 0,
          skipCount: skipped ? 1 : 0,
          lastPlayed: new Date(),
          preferenceScore: playedFully ? playWeight : (skipped ? skipWeight : 0),
          updatedAt: new Date()
        });
    }
    
    // Update listening stats
    await this.updateListeningStatsFromPlayback(userId, songId, playedFully, skipped, context);
    
    return record;
  }
  
  async getUserSongPreference(userId: number, songId: number): Promise<UserSongPreference | undefined> {
    const [pref] = await db
      .select()
      .from(userSongPreferences)
      .where(
        and(
          eq(userSongPreferences.userId, userId),
          eq(userSongPreferences.songId, songId)
        )
      );
    
    return pref;
  }
  
  async updateUserSongPreference(userId: number, songId: number, data: Partial<UserSongPreference>): Promise<UserSongPreference> {
    // Check if preference exists
    const [existingPref] = await db
      .select()
      .from(userSongPreferences)
      .where(
        and(
          eq(userSongPreferences.userId, userId),
          eq(userSongPreferences.songId, songId)
        )
      );
    
    if (existingPref) {
      // Update existing preference
      const [updatedPref] = await db
        .update(userSongPreferences)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(userSongPreferences.userId, userId),
            eq(userSongPreferences.songId, songId)
          )
        )
        .returning();
      
      return updatedPref;
    } else {
      // Create new preference
      const [newPref] = await db
        .insert(userSongPreferences)
        .values({
          userId,
          songId,
          rating: null,
          playCount: 0,
          skipCount: 0,
          lastPlayed: null,
          preferenceScore: 0,
          ...data,
          updatedAt: new Date()
        })
        .returning();
      
      return newPref;
    }
  }
  
  async getUserListeningStats(userId: number): Promise<UserListeningStats | undefined> {
    const [stats] = await db
      .select()
      .from(userListeningStats)
      .where(eq(userListeningStats.userId, userId));
    
    return stats;
  }
  
  async updateUserListeningStats(userId: number, data: Partial<UserListeningStats>): Promise<UserListeningStats> {
    // Check if stats exist
    const [existingStats] = await db
      .select()
      .from(userListeningStats)
      .where(eq(userListeningStats.userId, userId));
    
    if (existingStats) {
      // Update existing stats
      const [updatedStats] = await db
        .update(userListeningStats)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(userListeningStats.userId, userId))
        .returning();
      
      return updatedStats;
    } else {
      // Create new stats
      const [newStats] = await db
        .insert(userListeningStats)
        .values({
          userId,
          timeOfDay: data.timeOfDay || {},
          dayOfWeek: data.dayOfWeek || {},
          genrePreferences: data.genrePreferences || {},
          artistPreferences: data.artistPreferences || {},
          featurePreferences: data.featurePreferences || {},
          contexts: data.contexts || {},
          updatedAt: new Date()
        })
        .returning();
      
      return newStats;
    }
  }
  
  // Helper method to update listening stats based on playback
  private async updateListeningStatsFromPlayback(
    userId: number, 
    songId: number, 
    playedFully: boolean, 
    skipped: boolean,
    context?: string
  ): Promise<void> {
    if (!playedFully || skipped) return; // Only update stats for fully played songs
    
    // Get the song
    const [song] = await db
      .select()
      .from(songs)
      .where(eq(songs.id, songId));
    
    if (!song) return;
    
    // Get or create user stats
    let stats = await this.getUserListeningStats(userId);
    if (!stats) {
      stats = await this.updateUserListeningStats(userId, {
        timeOfDay: {},
        dayOfWeek: {},
        genrePreferences: {},
        artistPreferences: {},
        featurePreferences: {},
        contexts: {},
      });
    }
    
    // Update time of day preference
    const hour = new Date().getHours();
    const timeOfDay: TimeOfDayPreferences = stats.timeOfDay || {};
    timeOfDay[hour] = (timeOfDay[hour] || 0) + 1;
    
    // Update day of week preference
    const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const dayOfWeek: DayOfWeekPreferences = stats.dayOfWeek || {};
    dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;
    
    // Update genre preference if available
    const genrePreferences: GenrePreferences = stats.genrePreferences || {};
    if (song.genre) {
      genrePreferences[song.genre] = (genrePreferences[song.genre] || 0) + 1;
    }
    
    // Update artist preference if available
    const artistPreferences: ArtistPreferences = stats.artistPreferences || {};
    if (song.artist) {
      artistPreferences[song.artist] = (artistPreferences[song.artist] || 0) + 1;
    }
    
    // Update feature preferences if available
    const featurePreferences: FeaturePreferences = stats.featurePreferences || {};
    if (song.energy !== null && song.energy !== undefined) {
      featurePreferences.energy = (featurePreferences.energy || 0) + song.energy;
      featurePreferences.energyCount = (featurePreferences.energyCount || 0) + 1;
    }
    if (song.tempo !== null && song.tempo !== undefined) {
      featurePreferences.tempo = (featurePreferences.tempo || 0) + song.tempo;
      featurePreferences.tempoCount = (featurePreferences.tempoCount || 0) + 1;
    }
    
    // Update contexts if available
    const contexts: ContextPreferences = stats.contexts || {};
    if (context) {
      contexts[context] = (contexts[context] || 0) + 1;
    }
    
    // Save updated stats
    await this.updateUserListeningStats(userId, {
      timeOfDay,
      dayOfWeek,
      genrePreferences,
      artistPreferences,
      featurePreferences,
      contexts,
    });
  }
  
  async getSongSimilarity(sourceSongId: number, targetSongId: number): Promise<SongSimilarity | undefined> {
    const [similarity] = await db
      .select()
      .from(songSimilarities)
      .where(
        and(
          eq(songSimilarities.sourceSongId, sourceSongId),
          eq(songSimilarities.targetSongId, targetSongId)
        )
      );
    
    return similarity;
  }
  
  async updateSongSimilarity(sourceSongId: number, targetSongId: number, similarityScore: number): Promise<SongSimilarity> {
    // Check if similarity exists
    const [existingSimilarity] = await db
      .select()
      .from(songSimilarities)
      .where(
        and(
          eq(songSimilarities.sourceSongId, sourceSongId),
          eq(songSimilarities.targetSongId, targetSongId)
        )
      );
    
    if (existingSimilarity) {
      // Update existing similarity
      const [updatedSimilarity] = await db
        .update(songSimilarities)
        .set({
          similarityScore,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(songSimilarities.sourceSongId, sourceSongId),
            eq(songSimilarities.targetSongId, targetSongId)
          )
        )
        .returning();
      
      return updatedSimilarity;
    } else {
      // Create new similarity
      const [newSimilarity] = await db
        .insert(songSimilarities)
        .values({
          sourceSongId,
          targetSongId,
          similarityScore,
          updatedAt: new Date()
        })
        .returning();
      
      return newSimilarity;
    }
  }
  
  async getSmartShuffleRecommendations(userId: number, options: SmartShuffleOptions, limit: number = 20): Promise<Song[]> {
    // If smart shuffle is disabled, return random songs
    if (!options.useSmart) {
      return await db
        .select()
        .from(songs)
        .orderBy(sql`RANDOM()`)
        .limit(limit);
    }
    
    // Get user's listening stats
    const [stats] = await db
      .select()
      .from(userListeningStats)
      .where(eq(userListeningStats.userId, userId));
    
    // Base query for songs
    let query = db.select().from(songs);
    
    // Get IDs of recently played songs if exploreNew is enabled
    let recentlyPlayedSongIds: { songId: number }[] = [];
    if (options.exploreNew) {
      recentlyPlayedSongIds = await db
        .select({ songId: playbackHistory.songId })
        .from(playbackHistory)
        .where(
          and(
            eq(playbackHistory.userId, userId),
            sql`${playbackHistory.playedAt} > NOW() - INTERVAL '1 day'`
          )
        );
    }
    
    // Get preferred songs based on preference score
    if (options.preferHighlyRated) {
      let result = await query.execute();
      
      // Filter out recently played songs if exploreNew is enabled
      if (options.exploreNew && recentlyPlayedSongIds.length > 0) {
        const recentIds = new Set(recentlyPlayedSongIds.map(item => item.songId));
        result = result.filter(song => !recentIds.has(song.id));
      }
      
      // Get user preferences for each song
      const prefs = await db
        .select()
        .from(userSongPreferences)
        .where(eq(userSongPreferences.userId, userId));
      
      const prefMap = new Map(prefs.map(pref => [pref.songId, pref]));
      
      // Score songs based on user preferences and other factors
      const scoredSongs = result.map(song => {
        let score = Math.random(); // Base random component
        
        // Preference score
        const pref = prefMap.get(song.id);
        if (pref) {
          score += pref.preferenceScore * 2; // Weight preference higher
        }
        
        // Similarity to preferred artists/genres
if (options.exploreSimilar && stats?.artistPreferences && song.artist && stats.artistPreferences[song.artist]) {
    score += 1.5;
}

// Genre similarity
if (song.genre && stats.genrePreferences && stats.genrePreferences[song.genre]) {
    score += 1;
}

// Time of day preferences
		if (options.respectTimeOfDay && stats && stats.timeOfDay) {
			const hour = new Date().getHours();
			const hourPreference = stats.timeOfDay[hour];
    
			if (hourPreference && hourPreference > 5) {
// If user has a strong preference for this hour, boost songs with similar properties
				if (stats.genrePreferences && song.genre && stats.genrePreferences[song.genre]) {
					score += 0.5;
				}
			}
		}
        
        return { song, score };
      });
      
      // Sort by score and return
      return scoredSongs
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.song);
    } else {
      // If not using preferences, just return random songs (but still filter out recently played)
      let songs = await query
        .orderBy(sql`RANDOM()`)
        .execute();
        
      // Filter out recently played songs if exploreNew is enabled
      if (options.exploreNew && recentlyPlayedSongIds.length > 0) {
        const recentIds = new Set(recentlyPlayedSongIds.map(item => item.songId));
        songs = songs.filter(song => !recentIds.has(song.id));
      }
      
      return songs.slice(0, limit);
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }
  
  // Song operations
  async getSongs(search?: SongSearch): Promise<Song[]> {
    if (search) {
      const conditions = [];
      
      if (search.query) {
        // Search across multiple fields with a single query
        conditions.push(
          or(
            like(songs.title, `%${search.query}%`),
            like(songs.artist, `%${search.query}%`),
            like(songs.album, `%${search.query}%`)
          )
        );
      }
      
      if (search.folder) {
        conditions.push(eq(songs.folderPath, search.folder));
      }
      
      if (conditions.length > 0) {
        return await db.select().from(songs).where(and(...conditions));
      }
    }
    
    // Without conditions just execute a simple select all
    return db.select().from(songs).execute();
  }
  
  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song || undefined;
  }
  
  async createSong(insertSong: InsertSong): Promise<Song> {
    const [song] = await db
      .insert(songs)
      .values(insertSong)
      .returning();
    return song;
  }
  
  async updateSongLastPlayed(songId: number, userId: number): Promise<Song | undefined> {
    // First update the song's last played timestamp
    const [song] = await db
      .update(songs)
      .set({ lastPlayed: new Date() })
      .where(eq(songs.id, songId))
      .returning();
    
    // Then add to user's playback history
    if (song) {
      await db
        .insert(playbackHistory)
        .values({
          userId,
          songId,
          playedAt: new Date()
        })
        .onConflictDoNothing();  // In case there's a unique constraint
    }
    
    return song || undefined;
  }
  
  async getRecentlyPlayed(userId: number, limit = 10): Promise<Song[]> {
    // First get the most recent play for each song
    const latestPlays = await db
      .select({
        songId: playbackHistory.songId,
        playedAt: sql<Date>`MAX(${playbackHistory.playedAt})`,
      })
      .from(playbackHistory)
      .where(eq(playbackHistory.userId, userId))
      .groupBy(playbackHistory.songId)
      .orderBy(desc(sql`MAX(${playbackHistory.playedAt})`))
      .limit(limit);
    
    if (latestPlays.length === 0) {
      return [];
    }
    
    // Then fetch the actual songs
    const songIds = latestPlays.map(play => play.songId);
    
    const result = await db
      .select()
      .from(songs)
      .where(sql`${songs.id} IN (${songIds.join(',')})`);
    
    // Sort them in the same order as the latest plays
    const songMap = new Map(result.map(song => [song.id, song]));
    return latestPlays
      .map(play => songMap.get(play.songId))
      .filter((song): song is Song => song !== undefined);
  }
  
  // Folder operations
  async getFolders(): Promise<Folder[]> {
    return await db.select().from(folders).execute();
  }
  
  async getFolderByPath(path: string): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.path, path));
    return folder || undefined;
  }
  
  async getSubFolders(parentPath: string): Promise<Folder[]> {
    return await db.select().from(folders).where(eq(folders.parent, parentPath)).execute();
  }
  
  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const [folder] = await db
      .insert(folders)
      .values(insertFolder)
      .returning();
    return folder;
  }
  
  async clearFolders(): Promise<void> {
    await db.delete(folders);
  }
  
  async clearSongs(): Promise<void> {
    await db.delete(songs);
  }
  
  // Playlist operations
  async getPlaylists(userId: number): Promise<Playlist[]> {
    return await db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId))
      .orderBy(asc(playlists.name))
      .execute();
  }
  
  async getPlaylist(id: number): Promise<Playlist | undefined> {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id));
    return playlist || undefined;
  }
  
  async getPlaylistSongs(playlistId: number): Promise<Song[]> {
    const playlistSongsWithPosition = await db
      .select({
        song: songs,
        position: playlistSongs.position
      })
      .from(playlistSongs)
      .innerJoin(songs, eq(songs.id, playlistSongs.songId))
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(asc(playlistSongs.position));
    
    return playlistSongsWithPosition.map(item => item.song);
  }
  
  async createPlaylist(playlist: InsertPlaylist): Promise<Playlist> {
    const [newPlaylist] = await db
      .insert(playlists)
      .values(playlist)
      .returning();
    return newPlaylist;
  }
  
  async updatePlaylist(id: number, playlistData: Partial<InsertPlaylist>): Promise<Playlist | undefined> {
    const [updatedPlaylist] = await db
      .update(playlists)
      .set({
        ...playlistData,
        updatedAt: new Date()
      })
      .where(eq(playlists.id, id))
      .returning();
    return updatedPlaylist || undefined;
  }
  
  async deletePlaylist(id: number): Promise<boolean> {
    try {
      // The cascade delete should handle deleting associated playlistSongs
      const result = await db
        .delete(playlists)
        .where(eq(playlists.id, id));
      
      // For drizzle, we consider any execution as success since it doesn't consistently return row counts
      return true;
    } catch (error) {
      console.error("Error deleting playlist:", error);
      return false;
    }
  }
  
  async addSongToPlaylist(playlistId: number, songId: number, position: number): Promise<void> {
    // Get the current maximum position
    const existingSongs = await db
      .select()
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId));
    
    const maxPosition = existingSongs.length > 0 
      ? Math.max(...existingSongs.map(s => s.position))
      : -1;
    
    // Check if song is already in the playlist
    const existingSong = existingSongs.find(s => s.songId === songId);
    
    if (existingSong) {
      // Song already exists, just update the position
      await db
        .update(playlistSongs)
        .set({ position })
        .where(and(
          eq(playlistSongs.playlistId, playlistId),
          eq(playlistSongs.songId, songId)
        ));
    } else {
      // Add new song to playlist
      await db
        .insert(playlistSongs)
        .values({
          playlistId,
          songId,
          position: position >= 0 ? position : maxPosition + 1
        });
    }
  }
  
  async removeSongFromPlaylist(playlistId: number, songId: number): Promise<void> {
    // First, get the position of the song to be removed
    const [songToRemove] = await db
      .select()
      .from(playlistSongs)
      .where(and(
        eq(playlistSongs.playlistId, playlistId),
        eq(playlistSongs.songId, songId)
      ));
    
    if (!songToRemove) return;
    
    const positionToRemove = songToRemove.position;
    
    // Delete the song from the playlist
    await db
      .delete(playlistSongs)
      .where(and(
        eq(playlistSongs.playlistId, playlistId),
        eq(playlistSongs.songId, songId)
      ));
    
    // Update positions of remaining songs
    await db
      .update(playlistSongs)
      .set({
        position: sql`${playlistSongs.position} - 1`
      })
      .where(and(
        eq(playlistSongs.playlistId, playlistId),
        sql`${playlistSongs.position} > ${positionToRemove}`
      ));
  }
  
  // Favorites operations
  async getUserFavorites(userId: number): Promise<Song[]> {
    return await db
      .select({
        song: songs
      })
      .from(userFavorites)
      .innerJoin(songs, eq(songs.id, userFavorites.songId))
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.addedAt))
      .then(result => result.map(r => r.song));
  }
  
  async addToFavorites(userId: number, songId: number): Promise<void> {
    await db
      .insert(userFavorites)
      .values({
        userId,
        songId,
        addedAt: new Date()
      })
      .onConflictDoNothing();
  }
  
  async removeFromFavorites(userId: number, songId: number): Promise<void> {
    await db
      .delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.songId, songId)
      ));
  }
  
  async isUserFavorite(userId: number, songId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.songId, songId)
      ));
    
    return !!favorite;
  }
}

export const storage = new DatabaseStorage();
