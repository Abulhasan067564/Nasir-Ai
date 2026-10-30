import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminSettings {
  siteName: string;
  siteTagline: string;
  siteTaglineBn: string;
  siteLogo: string | null; // Base64 data URL or external image URL
  assistantName: string;
  systemInstructionOverride: string;
  defaultModel: string;
  enableLiveVoice: boolean;
  enableSearchGrounding: boolean;
  enableVoiceTyping: boolean;
  welcomeGreetingBn: string;
  welcomeGreetingEn: string;
  footerAttribution: string;
  themeAccent: 'emerald' | 'cyan' | 'blue' | 'purple' | 'amber';
  updatedAt: string;
}

export const DEFAULT_ADMIN_PASSWORD = 'NasirAdmin@2026!#Secure';
export const ADMIN_SETTINGS_DOC_ID = 'general_config';
export const ADMIN_SETTINGS_STORAGE_KEY = 'nasir_ai_admin_settings';
export const ADMIN_PASS_STORAGE_KEY = 'nasir_ai_admin_pass';
export const ADMIN_SETTINGS_CHANGE_EVENT = 'nasir_admin_settings_changed';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  siteName: 'Nasir AI',
  siteTagline: 'Advanced Full-Stack AI Assistant',
  siteTaglineBn: 'উন্নত ও শক্তিশালী সার্বিক এআই সহকারী',
  siteLogo: null,
  assistantName: 'Nasir AI',
  systemInstructionOverride: '',
  defaultModel: 'gemini-3.1-flash-lite',
  enableLiveVoice: true,
  enableSearchGrounding: true,
  enableVoiceTyping: true,
  welcomeGreetingBn: 'নাসির এআই-তে স্বাগতম! আজকে আপনাকে কীভাবে সাহায্য করতে পারি?',
  welcomeGreetingEn: 'Welcome to Nasir AI! How can I assist you today?',
  footerAttribution: 'Developed by Nasir • Powered by Advanced Gemini AI',
  themeAccent: 'emerald',
  updatedAt: new Date().toISOString(),
};

/**
 * Loads current admin settings from Firestore or localStorage fallback.
 */
export async function getAdminSettings(): Promise<AdminSettings> {
  // 1. Try Firestore first
  try {
    const docRef = doc(db, 'admin_settings', ADMIN_SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as AdminSettings;
      const merged = { ...DEFAULT_ADMIN_SETTINGS, ...data };
      localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Could not read admin settings from Firestore, using local cache:', err);
  }

  // 2. Try LocalStorage
  try {
    const cached = localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(cached) };
    }
  } catch {}

  return DEFAULT_ADMIN_SETTINGS;
}

/**
 * Saves admin settings to both Firestore and localStorage, then dispatches change event.
 */
export async function saveAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
  const current = await getAdminSettings();
  const updated: AdminSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // Save to localStorage immediately
  try {
    localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    if (updated.siteLogo) {
      localStorage.setItem('nasir_ai_custom_logo', updated.siteLogo);
    } else {
      localStorage.removeItem('nasir_ai_custom_logo');
    }
    window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_CHANGE_EVENT, { detail: updated }));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }

  // Save to Firestore
  try {
    const docRef = doc(db, 'admin_settings', ADMIN_SETTINGS_DOC_ID);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Firestore write failed for admin settings (offline mode active):', err);
  }

  return updated;
}

/**
 * Verifies admin password
 */
export function verifyAdminPassword(inputPass: string): boolean {
  const storedPass = localStorage.getItem(ADMIN_PASS_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD;
  return inputPass.trim() === storedPass.trim();
}

/**
 * Changes admin password
 */
export async function changeAdminPassword(newPass: string): Promise<boolean> {
  if (!newPass || newPass.trim().length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  try {
    localStorage.setItem(ADMIN_PASS_STORAGE_KEY, newPass.trim());
    // Also save password doc in Firestore if permitted
    try {
      const passRef = doc(db, 'admin_settings', 'auth_secret');
      await setDoc(passRef, {
        password: newPass.trim(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {}
    return true;
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to update admin password.');
  }
}
