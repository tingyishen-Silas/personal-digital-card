export function readStorage(storageName, key) {
  try {
    return window[storageName].getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(storageName, key, value) {
  try {
    if (value === null) window[storageName].removeItem(key);
    else window[storageName].setItem(key, value);
  } catch {
    // The gallery remains usable when browser storage is unavailable.
  }
}
