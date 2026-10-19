// The auth session lives in SQLite-backed localStorage on phones, so you stay signed in.
import 'expo-sqlite/localStorage/install';

export const sessionStore = globalThis.localStorage;
