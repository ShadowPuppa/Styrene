import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { storage } from './storage';
import { InsertSong, InsertFolder } from '@shared/schema';
import { searchRecording, MusicBrainzMetadata } from './musicbrainzService';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Supported audio file types
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];

export class MusicScanner {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    
    // Create music directory if it doesn't exist
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
  }

  async scanLibrary(): Promise<void> {
    try {
      console.log(`Starting music library scan at: ${this.basePath}`);
      
      // Clear existing data before scanning
      await storage.clearFolders();
      await storage.clearSongs();
      
      // Create root folder
      const rootName = path.basename(this.basePath);
      await storage.createFolder({
        path: this.basePath,
        name: rootName,
        parent: null
      });
      
      // Start scanning
      await this.scanDirectory(this.basePath);
      
      console.log('Music library scan complete');
    } catch (error) {
      console.error('Error scanning music library:', error);
      throw error;
    }
  }

  private async scanDirectory(dirPath: string): Promise<void> {
    try {
      const items = await readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await stat(itemPath);
        
        if (stats.isDirectory()) {
          // Found a directory, create folder entry
          const folderName = path.basename(itemPath);
          const parentPath = path.dirname(itemPath);
          
          await storage.createFolder({
            path: itemPath,
            name: folderName,
            parent: parentPath
          });
          
          // Recursively scan this directory
          await this.scanDirectory(itemPath);
        } else if (stats.isFile()) {
          // Check if this is an audio file
          const ext = path.extname(itemPath).toLowerCase();
          if (AUDIO_EXTENSIONS.includes(ext)) {
            await this.processMusicFile(itemPath, ext);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
      // Continue with other directories
    }
  }

  private async processMusicFile(filePath: string, fileExt: string): Promise<void> {
    try {
      // Basic metadata extraction from filename
      const fileName = path.basename(filePath, fileExt);
      const folderPath = path.dirname(filePath);
      
      // Try to extract artist and title from filename patterns like "Artist - Title"
      let artist = '';
      let title = fileName;
      
      if (fileName.includes(' - ')) {
        const parts = fileName.split(' - ');
        artist = parts[0].trim();
        title = parts[1].trim();
      }
      
      // Use folder name as album
      let album = path.basename(folderPath);
      
      // Estimate duration (fallback)
      const stats = await stat(filePath);
      let estimatedDuration = Math.floor(stats.size / 100000); // Rough estimation
      
      // Try to get metadata from MusicBrainz if basic metadata is incomplete
      if (!artist || title === fileName) {
        console.log(`Attempting to fetch metadata for "${fileName}" from MusicBrainz...`);
        try {
          const mbMetadata = await searchRecording(title, artist);
          
          if (mbMetadata) {
            console.log(`Found MusicBrainz metadata for "${fileName}"`);
            
            // Use the MusicBrainz metadata if available
            if (mbMetadata.title) title = mbMetadata.title;
            if (mbMetadata.artist) artist = mbMetadata.artist;
            if (mbMetadata.album) album = mbMetadata.album;
            
            // Convert duration from milliseconds to seconds if available
            if (mbMetadata.duration) {
              estimatedDuration = Math.floor(mbMetadata.duration / 1000);
            }
          } else {
            console.log(`No MusicBrainz metadata found for "${fileName}"`);
          }
        } catch (mbError) {
          console.error(`Error fetching MusicBrainz metadata for "${fileName}":`, mbError);
          // Continue with the basic metadata
        }
      }
      
      // Create song entry
      const song: InsertSong = {
        title,
        artist,
        album,
        duration: estimatedDuration,
        path: filePath,
        fileType: fileExt.substring(1), // Remove the dot
        folderPath,
        coverPath: null // Would be populated by album art extraction
      };
      
      await storage.createSong(song);
    } catch (error) {
      console.error(`Error processing music file ${filePath}:`, error);
      // Continue with other files
    }
  }
}

// Default music library path - should be configurable in production
export const defaultMusicLibraryPath = path.join(process.cwd(), 'music_library');
export const musicScanner = new MusicScanner(defaultMusicLibraryPath);
