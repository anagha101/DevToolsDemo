/**
 * Given a time in seconds, return a string in the format MM:SS.
 */
export function formatTime(time) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

/**
 * Get today's date and time, formatted as YYYY-MM-DD HH:MM:SS.
 */
export function getFormattedDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const hour = today.getHours();
  const minute = today.getMinutes();
  const seconds = today.getSeconds();
  return `${year}-${month < 10 ? "0" : ""}${month}-${day < 10 ? "0" : ""}${day} ${hour < 10 ? "0" : ""}${hour}:${minute < 10 ? "0" : ""}${minute}:${seconds < 10 ? "0" : ""}${seconds}`;
}

/**
 * Get a somewhat unique ID.
 */
export function getUniqueId() {
  let id = '';
  id += 'abcdefghijklmnopqrstuvwxyz'.split('')[Math.floor(Math.random() * 26)];
  id += 'abcdefghijklmnopqrstuvwxyz'.split('')[Math.floor(Math.random() * 26)];
  id += '0123456789'.split('')[Math.floor(Math.random() * 10)];
  id += '0123456789'.split('')[Math.floor(Math.random() * 10)];
  return id += Date.now();
}

/**
 * Using the FileSystem Access API, open a file picker and return the selected file(s).
 */
export async function openFilesFromDisk() {
  if (!('showOpenFilePicker' in window)) {
    return await legacyOpenFilesFromDisk();
  }

  // TODO: how to allow selecting a folder?
  const handles = await window.showOpenFilePicker({
    multiple: true,
    types: [{
      description: 'Audio files',
      accept: {
        "audio/*": ['.wav', '.mp3', '.mp4', '.aac', '.flac', '.ogg', '.webm']
      }
    }]
  });

  const files = [];
  for (const handle of handles) {
    const file = await handle.getFile();
    if (file.type.startsWith('audio/')) {
      files.push(file);
    }
  }

  return files;
}

function legacyOpenFilesFromDisk() {
  // Create an input type file element.
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'audio/*';

  // Simulate a click on the input element.
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  input.dispatchEvent(event);

  // Wait for the file to be selected.
  return new Promise((resolve) => {
    input.onchange = (event) => {
      resolve(event.target.files);
    }
  });
}

/**
 * Given a string with at least one dot and some text after it, return the part between
 * the start of the string and the last dot.
 */
function getFileNameWithoutExtension(fileName) {
  return fileName.split('.').slice(0, -1).join('.');
}

export function getSongNameFromURL(url) {
  return url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
}

function guessSongInfoFromString(str) {
  // Test for the following pattern: 04 - artist - title
  const match = str.match(/[0-9]+\s*-\s*([^-]+)\s*-\s*(.+)/);
  if (match && match.length === 3) {
    return {
      artist: match[1],
      title: match[2]
    }
  }

  return {}
}

/**
 * Use the parse-audio-metadata library to parse an audio file.
 * Do this in a worker thread, spawning it first if needed.
 * @param {File} The audio file to parse.
 * @return {Promise} A promise that resolves to the song info.
 */
function guessSongInfoFromFile(file) {
  return new Promise((resolve, reject) => {
    // Create a new one for every file, to avoid receiving messages about other songs.
    const worker = new Worker('./audio-metadata-parse-worker.js', { type: "module" });

    worker.addEventListener('message', event => {
      worker.terminate();
      resolve({
        artist: event.data.artist,
        title: event.data.title,
        album: event.data.album
      });
    }, { once: true });

    worker.postMessage(file);
  });
}

export async function guessSongInfo(file) {
  // First try from the file name.
  const name = getFileNameWithoutExtension(file.name);
  const fromFileName = guessSongInfoFromString(name);

  // Next parse the audio metadata.
  const fromMetadata = await guessSongInfoFromFile(file);

  // If anything is missing from the metadata, complete it from the file name.
  return {
    album: fromMetadata.album || fromFileName.album,
    artist: fromMetadata.artist || fromFileName.artist,
    title: fromMetadata.title || fromFileName.title
  };
}

/**
 * Skins are expected to have a `:root` CSS rule with a `--back` custom color property.
 * This function returns the CSS value of that property, so it can be used from JS.
 */
export function getCurrentSkinBackgroundColor() {
  let color = null;

  const rules = document.styleSheets[0].cssRules;
  for (const rule of rules) {
    if (rule.selectorText === ':root') {
      color = rule.style.getPropertyValue('--back');
    }
  }

  return parseColor(color ? color : '#000');
}

function parseColor(color) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  div.style.color = color.trim();
  const style = getComputedStyle(div).color;
  const match = style.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  div.remove();

  if (match) {
    return [match[1], match[2], match[3]];
  }

  throw new Error(`Color ${color} could not be parsed`);
}

export function canShare(file) {
  return file &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [new File([file], 'test', { type: file.type })] });
}
