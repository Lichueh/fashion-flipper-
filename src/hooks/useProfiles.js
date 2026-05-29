import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../utils/supabase";
import { MEASUREMENT_GROUPS } from "../data/patternMeasurements";

// Flat list of every FreeSewing measurement key — must match the columns in
// the `measurement_profiles` Supabase table.
const ALL_KEYS = Object.values(MEASUREMENT_GROUPS).flat();

// ── Shape converters ──────────────────────────────────────────────────────────

function rowToProfile(row, skillLevel) {
  const measurements = {};
  for (const key of ALL_KEYS) {
    if (row[key] != null) measurements[key] = Math.round(Number(row[key]));
  }
  return {
    id: row.id,
    name: row.label ?? "My Profile",
    createdAt: row.created_at ?? new Date().toISOString(),
    measurements,
    gender: null, // not stored in schema; kept as null
    skillLevel: skillLevel ?? "beginner",
    isDefault: row.is_default ?? false,
  };
}

// Returns an object with one entry per measurement key (null when absent).
function measurementCols(measurements) {
  const cols = {};
  for (const key of ALL_KEYS) {
    cols[key] = measurements[key] != null ? Number(measurements[key]) : null;
  }
  return cols;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export default function useProfiles(userId) {
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  // skillLevel is user-scoped (profiles.sewing_experience_level) and
  // propagated to every measurement_profiles row in the app's shape.
  const [skillLevel, setSkillLevel] = useState(null);
  const [loading, setLoading] = useState(!!userId);
  const [timedOut, setTimedOut] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Stable refs so callbacks never go stale
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const skillLevelRef = useRef(skillLevel);
  skillLevelRef.current = skillLevel;

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setProfiles([]);
      setActiveProfileId(null);
      setSkillLevel(null);
      setTimedOut(false);
      setInitialized(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setTimedOut(false);

    // Safety net: if Supabase never responds, unblock the UI after 5 s.
    const loadTimeout = setTimeout(() => {
      if (!cancelled) {
        setTimedOut(true);
        setLoading(false);
      }
    }, 5000);

    // Wraps a Supabase query promise in a race against a per-query timeout so
    // we can identify which specific table is hanging rather than just seeing
    // the global 5 s safety net fire.
    function withTimeout(promise, label, ms = 5000) {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`[useProfiles] ${label} query timeout`)),
            ms,
          ),
        ),
      ]);
    }

    async function load() {
      try {
        // ── Queries: profiles + measurement_profiles in parallel ──────────
        let profileResult, rowsResult;
        try {
          [profileResult, rowsResult] = await Promise.all([
            withTimeout(
              supabase
                .from("profiles")
                .select("sewing_experience_level")
                .eq("id", userId)
                .maybeSingle(),
              "profiles",
            ),
            withTimeout(
              supabase
                .from("measurement_profiles")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: true }),
              "measurement_profiles",
            ),
          ]);
        } catch (err) {
          return; // bail out — finally will call setLoading(false)
        }

        if (cancelled) return;
        const level = profileResult.data?.sewing_experience_level ?? null;
        setSkillLevel(level);

        const rows = rowsResult.data ?? [];
        const mapped = rows.map((r) => rowToProfile(r, level));
        setProfiles(mapped);

        const defaultRow = rows.find((r) => r.is_default) ?? rows[0];
        setActiveProfileId(defaultRow?.id ?? null);
      } catch {
        // unexpected error — loading gate unblocked by finally
      } finally {
        clearTimeout(loadTimeout);
        if (!cancelled) {
          setLoading(false);
          setInitialized(true);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
    };
  }, [userId]);

  // ── addProfile ───────────────────────────────────────────────────────────────
  // Stays synchronous so callers (ProfileEditorScreen, SkillLevelScreen) can
  // use the return value's .id immediately.  Supabase write is fire-and-forget.
  const addProfile = useCallback((name, extra = {}) => {
    const uid = userIdRef.current;
    if (!uid) return null;

    const id = crypto.randomUUID();
    const isFirst = profilesRef.current.length === 0;
    const level = extra.skillLevel ?? skillLevelRef.current ?? "beginner";

    const profile = {
      id,
      name,
      createdAt: new Date().toISOString(),
      measurements: extra.measurements ?? {},
      gender: null,
      skillLevel: level,
      isDefault: isFirst,
    };

    // Optimistic update
    setProfiles((prev) => [...prev, profile]);
    if (isFirst) setActiveProfileId(id);

    // Background Supabase write
    supabase
      .from("measurement_profiles")
      .insert({
        id,
        user_id: uid,
        label: name,
        unit: "mm",
        is_default: isFirst,
        ...(extra.measurements ? measurementCols(extra.measurements) : {}),
      })
      .then(({ error }) => {
        if (error) console.error("[useProfiles] addProfile:", error.message);
      });

    if (extra.skillLevel !== undefined) {
      setSkillLevel(extra.skillLevel);
      supabase
        .from("profiles")
        .update({ sewing_experience_level: extra.skillLevel })
        .eq("id", uid)
        .then(({ error }) => {
          if (error)
            console.error(
              "[useProfiles] addProfile skillLevel:",
              error.message,
            );
        });
    }

    return profile;
  }, []); // reads from refs — no dep array needed

  // ── updateProfile ────────────────────────────────────────────────────────────
  const updateProfile = useCallback((id, changes) => {
    const uid = userIdRef.current;
    if (!uid) return;

    console.log("[updateProfile] called with", { id, changes });

    // Optimistic state update
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== id) {
          // skillLevel is user-level — propagate to every profile in state
          return changes.skillLevel !== undefined
            ? { ...p, skillLevel: changes.skillLevel }
            : p;
        }
        return { ...p, ...changes };
      }),
    );

    if (changes.skillLevel !== undefined) {
      setSkillLevel(changes.skillLevel);
      supabase
        .from("profiles")
        .update({ sewing_experience_level: changes.skillLevel })
        .eq("id", uid)
        .then(({ error }) => {
          if (error)
            console.error(
              "[useProfiles] updateProfile skillLevel:",
              error.message,
            );
        });
    }

    const cols = {};
    if (changes.name !== undefined) cols.label = changes.name;
    if (changes.measurements !== undefined) {
      if (Object.keys(changes.measurements).length === 0) {
        // An empty measurements object would null-out all 38 measurement columns.
        // Skip the write to prevent accidental data loss.
        console.warn(
          "[useProfiles] updateProfile: measurements is {} — skipping measurement columns to prevent data loss",
          { id },
        );
      } else {
        Object.assign(cols, measurementCols(changes.measurements));
      }
    }

    if (Object.keys(cols).length > 0) {
      console.log("[updateProfile] writing cols to Supabase", { id, cols });
      supabase
        .from("measurement_profiles")
        .update(cols)
        .eq("id", id)
        .eq("user_id", uid)
        .then(({ error }) => {
          if (error)
            console.error("[useProfiles] updateProfile cols:", error.message);
        });
    }
  }, []);

  // ── deleteProfile ────────────────────────────────────────────────────────────
  const deleteProfile = useCallback((id) => {
    const uid = userIdRef.current;
    if (!uid) return;

    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setActiveProfileId((cur) => {
        if (cur !== id) return cur;
        return next.length > 0 ? next[0].id : null;
      });
      return next;
    });

    supabase
      .from("measurement_profiles")
      .delete()
      .eq("id", id)
      .eq("user_id", uid)
      .then(({ error }) => {
        if (error) console.error("[useProfiles] deleteProfile:", error.message);
      });
  }, []);

  // ── setActiveProfile ─────────────────────────────────────────────────────────
  const setActiveProfile = useCallback((id) => {
    const uid = userIdRef.current;
    if (!uid) return;

    setActiveProfileId(id);
    setProfiles((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));

    // Two-step DB update: clear all, then set chosen
    supabase
      .from("measurement_profiles")
      .update({ is_default: false })
      .eq("user_id", uid)
      .then(() => {
        supabase
          .from("measurement_profiles")
          .update({ is_default: true })
          .eq("id", id)
          .eq("user_id", uid)
          .then(({ error }) => {
            if (error)
              console.error("[useProfiles] setActiveProfile:", error.message);
          });
      });
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────────
  const rawActive = profiles.find((p) => p.id === activeProfileId) ?? null;
  // Ensure skillLevel from the profiles table is always reflected on the
  // active profile object (it may lag if skillLevel was just written).
  const activeProfile = rawActive
    ? { ...rawActive, skillLevel: skillLevel ?? rawActive.skillLevel }
    : null;

  // Expose profiles with the current user-level skillLevel on each item
  const enrichedProfiles = profiles.map((p) => ({
    ...p,
    skillLevel: skillLevel ?? p.skillLevel,
  }));

  return {
    profiles: enrichedProfiles,
    activeProfileId,
    activeProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    loading,
    timedOut,
    initialized,
  };
}
