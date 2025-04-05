import fetch from 'node-fetch';

// MusicBrainz API base URL
const MB_API_URL = 'https://musicbrainz.org/ws/2';

// It's important to provide user-agent information to comply with MusicBrainz API requirements
const USER_AGENT = 'Styrene/1.0.0 (https://replit.com)';

// A delay function to respect rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface MusicBrainzMetadata {
  title?: string;
  artist?: string;
  album?: string;
  releaseDate?: string;
  trackNumber?: number;
  duration?: number; // in milliseconds
}

/**
 * Perform a search query to MusicBrainz API
 */
async function mbSearch(entity: string, query: string, limit = 1): Promise<any> {
  const url = new URL(`${MB_API_URL}/${entity}`);
  url.searchParams.append('query', query);
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('fmt', 'json');
  
  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Lookup an entity by ID
 */
async function mbLookup(entity: string, id: string, includes: string[] = []): Promise<any> {
  let url = `${MB_API_URL}/${entity}/${id}?fmt=json`;
  
  if (includes.length > 0) {
    url += `&inc=${includes.join('+')}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Search for a recording in MusicBrainz by title and artist
 */
export async function searchRecording(title: string, artist?: string): Promise<MusicBrainzMetadata | null> {
  try {
    // Build query string
    let query = `recording:"${title}"`;
    if (artist) {
      query += ` AND artist:"${artist}"`;
    }
    
    // Search for recordings
    const searchResults = await mbSearch('recording', query);
    
    // Respect rate limiting
    await delay(1000);
    
    if (!searchResults.recordings || searchResults.recordings.length === 0) {
      return null;
    }
    
    const recording = searchResults.recordings[0];
    
    // Extract metadata from the recording
    const metadata: MusicBrainzMetadata = {
      title: recording.title,
      duration: recording.length || undefined,
    };
    
    // Extract artist information
    if (recording['artist-credit'] && recording['artist-credit'].length > 0) {
      metadata.artist = recording['artist-credit'][0].artist.name;
    }
    
    // If there are releases associated with the recording, get more information
    if (recording.releases && recording.releases.length > 0) {
      const releaseId = recording.releases[0].id;
      
      // Get detailed release information
      const release = await mbLookup('release', releaseId, ['recordings']);
      
      // Respect rate limiting
      await delay(1000);
      
      metadata.album = release.title;
      metadata.releaseDate = release.date;
      
      // Find the track number of this recording in the release
      if (release.media && release.media.length > 0) {
        for (const medium of release.media) {
          if (medium.tracks) {
            const track = medium.tracks.find((t: any) => t.recording?.id === recording.id);
            if (track) {
              metadata.trackNumber = parseInt(track.number, 10);
              break;
            }
          }
        }
      }
    }
    
    return metadata;
  } catch (error) {
    console.error('Error fetching from MusicBrainz:', error);
    return null;
  }
}

/**
 * Search for an artist in MusicBrainz
 */
export async function searchArtist(name: string): Promise<string | null> {
  try {
    const searchResults = await mbSearch('artist', `artist:"${name}"`);
    
    // Respect rate limiting
    await delay(1000);
    
    if (!searchResults.artists || searchResults.artists.length === 0) {
      return null;
    }
    
    return searchResults.artists[0].name;
  } catch (error) {
    console.error('Error fetching artist from MusicBrainz:', error);
    return null;
  }
}

/**
 * Search for an album (release) in MusicBrainz
 */
export async function searchAlbum(title: string, artist?: string): Promise<string | null> {
  try {
    let query = `release:"${title}"`;
    if (artist) {
      query += ` AND artist:"${artist}"`;
    }
    
    const searchResults = await mbSearch('release', query);
    
    // Respect rate limiting
    await delay(1000);
    
    if (!searchResults.releases || searchResults.releases.length === 0) {
      return null;
    }
    
    return searchResults.releases[0].title;
  } catch (error) {
    console.error('Error fetching album from MusicBrainz:', error);
    return null;
  }
}