import { get, set, del } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';
import { getUniqueId } from './utils.js';

// Songs are stored in IDB as an array under the 'songs' key.
//
// Songs have unique IDs to identify them. Songs also have a title, artist, album, and duration.
// We do not read this information from the song file itself, this is stored in IDB too.
// 
// There are 2 types of songs: remote and file.
// A remote song is one that has a URL to a remote audio file. A remote song's ID is its URL.
// A file song is one that was loaded as a file from disk and stored in IDB. A file song's ID
// is a unique ID generated when importing the file.

/**
 * Get the list of all songs stored in IDB.
 */
export async function getSongs() {
  let songs = await get('pwamp-songs');
  if (!songs) {
    songs = [];
    await set('pwamp-songs', songs);
  }
  return songs;
}

/**
 * Check if the given remote song URL is already in IDB.
 */
export async function hasRemoteURLSong(url) {
  const songs = await getSongs();
  return !!songs.find(s => s.id === url);
}

/**
 * Add a new remote song to the list of songs in IDB.
 */
export async function addRemoteURLSong(url, title, artist, album, duration) {
  await addSong('url', url, title, artist, album, duration);
}

/**
 * DO NOT LOOP OVER THIS FUNCTION TO IMPORT SEVERAL FILES, THIS WILL LEAD TO
 * AN INCONSISTENT STORE STATE. USE addMultipleLocalFileSongs() INSTEAD.
 * Add a new file song to the list of songs in IDB.
 * The song is expected to be passed as a File object.
 */
export async function addLocalFileSong(file, title, artist, album, duration) {
  const id = getUniqueId();
  await addSong('file', id, title, artist, album, duration, file);
}

/**
 * Add several new file songs to the list of songs in IDB.
 */
 export async function addMultipleLocalFileSongs(fileSongs) {
  fileSongs = fileSongs.map(fileSong => {
    return {
      title: fileSong.title,
      artist: fileSong.artist,
      album: fileSong.album,
      duration: fileSong.duration,
      data: fileSong.file,
      type: 'file',
      id: getUniqueId()
    }
  });

  let songs = await getSongs();
  songs = [...songs, ...fileSongs];
  await set('pwamp-songs', songs);
}


/**
 * Private implementation of addSong.
 */
async function addSong(type, id, title, artist, album, duration, data = null) {
  const song = {
    type,
    id,
    title,
    artist,
    album,
    duration,
    data
  };

  let songs = await getSongs();
  songs.push(song);
  await set('pwamp-songs', songs);
}

/**
 * Given the unique ID to an existing song, edit its title, artist and album.
 */
export async function editSong(id, title, artist, album) {
  const songs = await getSongs();
  const song = songs.find(s => s.id === id);
  if (!song) {
    throw new Error(`Could not find song with id ${id}`);
  }

  song.title = title;
  song.artist = artist;
  song.album = album;

  await set('pwamp-songs', songs);
}

/**
 * Given the unique ID to an existing song, delete it from IDB.
 */
export async function deleteSong(id) {
  let songs = await getSongs();
  songs = songs.filter(song => song.id !== id);
  await set('pwamp-songs', songs);
}

/**
 * Delete all songs from IDB.
 */
export async function deleteAllSongs() {
  await del('pwamp-songs');
}

/**
 * Set the volume in IDB so that we can remember it next time.
 */
export async function setVolume(volume) {
  await set('pwamp-volume', volume);
}

/**
 * Get the stored volume.
 */
export async function getVolume() {
  return await get('pwamp-volume');
}

/**
 * Set a custom skin in IDB.
 */
export async function setCustomSkin(skin) {
  await set('pwamp-customSkin', skin);
}

/**
 * Get the currently stored custom skin.
 */
export async function getCustomSkin(skin) {
  return await get('pwamp-customSkin');
}
