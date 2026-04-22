import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "fashionFlipper_store";

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1 && Array.isArray(parsed.profiles)) return parsed;
  } catch {
    // unparseable — fall through to default
  }
  return null;
}

const DEFAULT_STORE = { version: 1, profiles: [], activeProfileId: null };

export default function useProfiles() {
  const [store, setStore] = useState(() => loadStore() ?? DEFAULT_STORE);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // storage quota or private-mode error — silently ignore
    }
  }, [store]);

  const addProfile = useCallback((name) => {
    const profile = {
      id: String(Date.now()),
      name,
      createdAt: new Date().toISOString(),
      measurements: {},
    };
    setStore((prev) => ({ ...prev, profiles: [...prev.profiles, profile] }));
    return profile;
  }, []);

  const updateProfile = useCallback((id, changes) => {
    setStore((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === id ? { ...p, ...changes } : p,
      ),
    }));
  }, []);

  const deleteProfile = useCallback((id) => {
    setStore((prev) => {
      const profiles = prev.profiles.filter((p) => p.id !== id);
      let activeProfileId = prev.activeProfileId;
      if (activeProfileId === id) {
        activeProfileId = profiles.length > 0 ? profiles[0].id : null;
      }
      return { ...prev, profiles, activeProfileId };
    });
  }, []);

  const setActiveProfile = useCallback((id) => {
    setStore((prev) => ({ ...prev, activeProfileId: id }));
  }, []);

  const activeProfile =
    store.profiles.find((p) => p.id === store.activeProfileId) ?? null;

  return {
    profiles: store.profiles,
    activeProfileId: store.activeProfileId,
    activeProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
  };
}
