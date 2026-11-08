/**
 * LocalStorage Persistence Helper for Mock Mode
 * Ensures all user transactions, categories, accounts, members,
 * and CSV import records are safely retained across page refreshes.
 */

export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const testKey = '__fin_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function loadMockData<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) {
    return defaultValue;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : defaultValue;
  } catch (err) {
    console.warn(`[MockPersistence] Failed to load key "${key}" from localStorage:`, err);
    return defaultValue;
  }
}

export function saveMockData<T>(key: string, data: T): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[MockPersistence] Failed to save key "${key}" to localStorage:`, err);
  }
}

export function clearMockData(key: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[MockPersistence] Failed to clear key "${key}":`, err);
  }
}
