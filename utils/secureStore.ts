

import { generateMachineFingerprint } from './fingerprint';

const DATA_KEY = btoa('__activation_data__');
const CHECKSUM_KEY = btoa('__activation_checksum__');
const ATTEMPTS_KEY = btoa('__activation_attempts__');
export const MAX_ATTEMPTS = 3;

interface ActivationData {
  isAdmin: boolean;
  machineId: string;
  licenseKey: string;
  fingerprint: string | null;
  timestamp: number;
}

const createChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

export const getActivationAttempts = (): number => {
    try {
        const attempts = localStorage.getItem(ATTEMPTS_KEY);
        // Use atob to be consistent with how it's stored
        return attempts ? parseInt(atob(attempts), 10) : 0;
    } catch {
        // If atob fails or any error, reset to 0
        localStorage.removeItem(ATTEMPTS_KEY);
        return 0;
    }
};

export const incrementActivationAttempts = (): number => {
    const currentAttempts = getActivationAttempts();
    const newAttempts = currentAttempts + 1;
    try {
        // Obfuscate the number slightly by encoding it
        localStorage.setItem(ATTEMPTS_KEY, btoa(newAttempts.toString()));
    } catch (e) {
        console.error("Could not save activation attempts:", e);
    }
    return newAttempts;
};

const resetActivationAttempts = (): void => {
    try {
        localStorage.removeItem(ATTEMPTS_KEY);
    } catch (e) {
        console.error("Could not reset activation attempts:", e);
    }
};

export const clearActivationData = (): void => {
    try {
        localStorage.removeItem(DATA_KEY);
        localStorage.removeItem(CHECKSUM_KEY);
    } catch (e) {
        console.error("Could not clear activation data:", e);
    }
};

export const saveActivationData = (
  machineId: string,
  licenseKey: string,
  fingerprint: string | null,
  isAdmin: boolean = false
): void => {
  try {
    const data: ActivationData = {
      isAdmin,
      machineId,
      licenseKey,
      fingerprint,
      timestamp: Date.now(),
    };

    const jsonString = JSON.stringify(data);
    const encodedData = btoa(jsonString);
    const checksum = createChecksum(encodedData);

    localStorage.setItem(DATA_KEY, encodedData);
    localStorage.setItem(CHECKSUM_KEY, checksum);

    // Reset attempts on successful save
    resetActivationAttempts();
  } catch (error) {
    console.error("Failed to save activation data:", error);
    // Clear everything if save fails
    clearActivationData();
  }
};

export const loadActivationData = (): ActivationData | null => {
  try {
    const encodedData = localStorage.getItem(DATA_KEY);
    const savedChecksum = localStorage.getItem(CHECKSUM_KEY);

    if (!encodedData || !savedChecksum) {
      return null;
    }

    const currentChecksum = createChecksum(encodedData);
    if (savedChecksum !== currentChecksum) {
      console.warn("Activation data tampered with. Clearing data.");
      clearActivationData();
      return null;
    }

    const jsonString = atob(encodedData);
    const data: ActivationData = JSON.parse(jsonString);
    return data;
  } catch (error) {
    console.error("Failed to load or parse activation data:", error);
    clearActivationData();
    return null;
  }
};