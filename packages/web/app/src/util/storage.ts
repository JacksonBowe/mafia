// lib/storage/persisted.ts

// UNCOMMENT IF I EVER ADD MOBILE SUPPORT

// import { Capacitor } from '@capacitor/core';
// import { Preferences } from '@capacitor/preferences';
import { LocalStorage } from 'quasar';

// const isNative = () => Capacitor.isNativePlatform();

export function loadPersisted<T>(key: string): T | null {
	// if (isNative()) {
	//     const { value } = await Preferences.get({ key });
	//     return value ? (JSON.parse(value) as T) : null;
	// }
	return (LocalStorage.getItem(key) as T | null) ?? null;
}

export function savePersisted<T>(key: string, val: T): void {
	// if (isNative()) {
	//     await Preferences.set({ key, value: JSON.stringify(val) });
	// } else {
	LocalStorage.set(key, val);
	// }
}

export function removePersisted(key: string): void {
	// if (isNative()) {
	//     await Preferences.remove({ key });
	// } else {
	LocalStorage.remove(key);
	// }
}
