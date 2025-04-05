import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, doublePrecision, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  album: text("album"),
  duration: integer("duration"),
  path: text("path").notNull(),
  fileType: text("file_type").notNull(),
  folderPath: text("folder_path").notNull(),
  coverPath: text("cover_path"),
  lastPlayed: timestamp("last_played"),
  // Track properties for recommendations
  genre: text("genre"),
  releaseYear: integer("release_year"),
  energy: doublePrecision("energy"), // 0.0 to 1.0 - how energetic the song is
  danceability: doublePrecision("danceability"), // 0.0 to 1.0 - how danceable the song is
  tempo: integer("tempo"), // BPM
  tags: text("tags").array(), // Array of tags like "chill", "workout", "study", etc.
});

export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  path: text("path").notNull().unique(),
  name: text("name").notNull(),
  parent: text("parent"),
});

// User's playback history
export const playbackHistory = pgTable("playback_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: 'cascade' }),
  playedAt: timestamp("played_at").defaultNow().notNull(),
  // New fields for smart shuffle
  playedFully: boolean("played_fully").default(false), // Whether the user listened to the whole song
  skipped: boolean("skipped").default(false), // Whether the user skipped the song
  context: text("context"), // What was the user doing when playing this song (e.g., "workout", "study")
});

// Playlists
export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  coverPath: text("cover_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Playlist songs junction table
export const playlistSongs = pgTable("playlist_songs", {
  playlistId: integer("playlist_id").notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: 'cascade' }),
  position: integer("position").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.playlistId, t.songId] }),
}));

// User favorites
export const userFavorites = pgTable("user_favorites", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: 'cascade' }),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.songId] }),
}));

// User song preferences - this will store preference data for smart shuffle
export const userSongPreferences = pgTable("user_song_preferences", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: 'cascade' }),
  rating: integer("rating"), // User rating 1-5 if they ever rate songs
  playCount: integer("play_count").default(0).notNull(), // How many times user has played this
  skipCount: integer("skip_count").default(0).notNull(), // How many times user has skipped this
  lastPlayed: timestamp("last_played"), // Last time user played this
  preferenceScore: doublePrecision("preference_score").default(0).notNull(), // Calculated score for recommendations
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.songId] }),
}));

// Song similarity matrix for recommendations
export const songSimilarities = pgTable("song_similarities", {
  sourceSongId: integer("source_song_id").notNull().references(() => songs.id, { onDelete: 'cascade' }),
  targetSongId: integer("target_song_id").notNull().references(() => songs.id, { onDelete: 'cascade' }),
  similarityScore: doublePrecision("similarity_score").notNull(), // How similar these songs are (0.0 to 1.0)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.sourceSongId, t.targetSongId] }),
}));

// User listening statistics for preference modeling
export const userListeningStats = pgTable("user_listening_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Time-based preferences
  timeOfDay: jsonb("time_of_day"), // JSON storing preferences by hour (0-23)
  dayOfWeek: jsonb("day_of_week"), // JSON storing preferences by day (Mon-Sun)
  // Genre preferences
  genrePreferences: jsonb("genre_preferences"), // JSON mapping genres to preference scores
  // Artist preferences  
  artistPreferences: jsonb("artist_preferences"), // JSON mapping artists to preference scores
  // Features preferences (for energy, tempo, etc.)
  featurePreferences: jsonb("feature_preferences"), // JSON with keys like "energy", "tempo" etc.
  // Most active contexts (workout, study, relax, etc.)
  contexts: jsonb("contexts"), // JSON mapping contexts to usage counts
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  lastPlayed: true,
  genre: true,
  releaseYear: true,
  energy: true,
  danceability: true,
  tempo: true,
  tags: true,
});

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlaylistSongSchema = createInsertSchema(playlistSongs);

export const songSearchSchema = z.object({
  query: z.string().optional(),
  folder: z.string().optional(),
});

export const smartShuffleOptionsSchema = z.object({
  useSmart: z.boolean().default(true),
  preferHighlyRated: z.boolean().default(true),
  exploreSimilar: z.boolean().default(true),
  exploreNew: z.boolean().default(true),
  respectTimeOfDay: z.boolean().default(false),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type PlaylistSong = typeof playlistSongs.$inferSelect;
export type InsertPlaylistSong = z.infer<typeof insertPlaylistSongSchema>;
export type SongSearch = z.infer<typeof songSearchSchema>;
export type PlaybackHistory = typeof playbackHistory.$inferSelect;
export type UserSongPreference = typeof userSongPreferences.$inferSelect;
export type SongSimilarity = typeof songSimilarities.$inferSelect;
export type UserListeningStats = typeof userListeningStats.$inferSelect;
export type SmartShuffleOptions = z.infer<typeof smartShuffleOptionsSchema>;
export type TimeOfDayPreferences = Record<number, number>; // e.g., 14 => preference weight
export type DayOfWeekPreferences = Record<string, number>; // e.g., "Monday" => weight
export type GenrePreferences = Record<string, number>;     // e.g., "rock" => score
export type ArtistPreferences = Record<string, number>;    // e.g., "Artist Name" => rating
export type FeaturePreferences = Record<string, number>;   // e.g., "danceability" => weight
export type ContextPreferences = Record<string, number>;   // e.g., "workout" => relevance

interface TimeOfDayPreferences {
  [hour: number]: number;
}

interface DayOfWeekPreferences {
  [day: string]: number; // or [day: number]: number if using numeric days
}

interface GenrePreferences {
  [genre: string]: number;
}

interface ArtistPreferences {
  [artist: string]: number;
}

interface FeaturePreferences {
  [feature: string]: number;
  energy?: number;
  energyCount?: number;
  tempo?: number;
  tempoCount?: number;
}

interface ContextPreferences {
  [context: string]: number;
}