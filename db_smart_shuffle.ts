// Smart Shuffle operations for DatabaseStorage
import { db } from './server/db';
import {
  songs,
  playbackHistory,
  userSongPreferences,
  userListeningStats,
  songSimilarities,
  PlaybackHistory,
  UserSongPreference,
  UserListeningStats,
  SongSimilarity,
  SmartShuffleOptions,
  Song
} from './shared/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';

export async function recordPlayback(userId: number, songId: number, playedFully: boolean, skipped: boolean, context?: string): Promise<PlaybackHistory> {
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
  await updateListeningStatsFromPlayback(userId, songId, playedFully, skipped, context);
  
  return record;
}

export async function getUserSongPreference(userId: number, songId: number): Promise<UserSongPreference | undefined> {
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

export async function updateUserSongPreference(userId: number, songId: number, data: Partial<UserSongPreference>): Promise<UserSongPreference> {
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

export async function getUserListeningStats(userId: number): Promise<UserListeningStats | undefined> {
  const [stats] = await db
    .select()
    .from(userListeningStats)
    .where(eq(userListeningStats.userId, userId));
  
  return stats;
}

export async function updateUserListeningStats(userId: number, data: Partial<UserListeningStats>): Promise<UserListeningStats> {
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
export async function updateListeningStatsFromPlayback(
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
  let stats = await getUserListeningStats(userId);
  if (!stats) {
    stats = await updateUserListeningStats(userId, {
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
  const timeOfDay = stats.timeOfDay || {};
  timeOfDay[hour] = (timeOfDay[hour] || 0) + 1;
  
  // Update day of week preference
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const dayOfWeek = stats.dayOfWeek || {};
  dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;
  
  // Update genre preference if available
  const genrePreferences = stats.genrePreferences || {};
  if (song.genre) {
    genrePreferences[song.genre] = (genrePreferences[song.genre] || 0) + 1;
  }
  
  // Update artist preference if available
  const artistPreferences = stats.artistPreferences || {};
  if (song.artist) {
    artistPreferences[song.artist] = (artistPreferences[song.artist] || 0) + 1;
  }
  
  // Update feature preferences if available
  const featurePreferences = stats.featurePreferences || {};
  if (song.energy !== null && song.energy !== undefined) {
    featurePreferences.energy = (featurePreferences.energy || 0) + song.energy;
    featurePreferences.energyCount = (featurePreferences.energyCount || 0) + 1;
  }
  if (song.tempo !== null && song.tempo !== undefined) {
    featurePreferences.tempo = (featurePreferences.tempo || 0) + song.tempo;
    featurePreferences.tempoCount = (featurePreferences.tempoCount || 0) + 1;
  }
  
  // Update contexts if available
  const contexts = stats.contexts || {};
  if (context) {
    contexts[context] = (contexts[context] || 0) + 1;
  }
  
  // Save updated stats
  await updateUserListeningStats(userId, {
    timeOfDay,
    dayOfWeek,
    genrePreferences,
    artistPreferences,
    featurePreferences,
    contexts,
  });
}

export async function getSongSimilarity(sourceSongId: number, targetSongId: number): Promise<SongSimilarity | undefined> {
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

export async function updateSongSimilarity(sourceSongId: number, targetSongId: number, similarityScore: number): Promise<SongSimilarity> {
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

export async function getSmartShuffleRecommendations(userId: number, options: SmartShuffleOptions, limit: number = 20): Promise<Song[]> {
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
  
  // Exclude recently played if exploreNew is enabled
  if (options.exploreNew) {
    const recentlyPlayedSongIds = await db
      .select({ songId: playbackHistory.songId })
      .from(playbackHistory)
      .where(
        and(
          eq(playbackHistory.userId, userId),
          sql`${playbackHistory.playedAt} > NOW() - INTERVAL '1 day'`
        )
      );
    
    if (recentlyPlayedSongIds.length > 0) {
      const recentIds = recentlyPlayedSongIds.map(item => item.songId);
      query = query.where(sql`${songs.id} NOT IN (${recentIds.join(',')})`);
    }
  }
  
  // Get preferred songs based on preference score
  if (options.preferHighlyRated) {
    const result = await query.execute();
    
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
      if (options.exploreSimilar && stats) {
        // Artist similarity
        if (song.artist && stats.artistPreferences && 
            stats.artistPreferences[song.artist]) {
          score += 1.5;
        }
        
        // Genre similarity
        if (song.genre && stats.genrePreferences && 
            stats.genrePreferences[song.genre]) {
          score += 1;
        }
      }
      
      // Time of day preferences
      if (options.respectTimeOfDay && stats && stats.timeOfDay) {
        const hour = new Date().getHours();
        const hourPreference = stats.timeOfDay[hour];
        
        if (hourPreference && hourPreference > 5) {
          // If user has a strong preference for this hour, boost songs with similar properties
          if (stats.genrePreferences && song.genre && 
              stats.genrePreferences[song.genre]) {
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
    // If not using preferences, just return random songs
    return await query
      .orderBy(sql`RANDOM()`)
      .limit(limit)
      .execute();
  }
}