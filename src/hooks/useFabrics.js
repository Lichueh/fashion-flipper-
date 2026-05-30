import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../utils/supabase";

// ── Request deduplication ─────────────────────────────────────────────────────
// PhoneFrame renders children into both a desktop branch and a mobile branch
// simultaneously (CSS hides one, but React mounts both). Combined with
// StrictMode's double-invoke, a single navigation to ClosetScreen would fire
// 4 identical SELECT queries. This Map ensures all concurrent callers for the
// same userId share one in-flight promise.
const _inFlight = new Map(); // userId → Promise<{ data, error }>

function _fetchFabrics(userId) {
  if (_inFlight.has(userId)) return _inFlight.get(userId);
  const p = supabase
    .from("fabrics")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  _inFlight.set(userId, p);
  p.finally(() => _inFlight.delete(userId));
  return p;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export default function useFabrics(userId, { fetch = true } = {}) {
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(fetch && !!userId);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Stable ref so callbacks never go stale
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Skip fetching entirely when the caller only needs mutation helpers.
    if (!fetch) return;

    if (!userId) {
      setFabrics([]);
      setError(null);
      setInitialized(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Safety net: if Supabase never responds, unblock the UI after 5 s.
    const loadTimeout = setTimeout(() => {
      if (!cancelled) {
        setError("timeout");
        setLoading(false);
      }
    }, 5000);

    async function load() {
      try {
        const { data, error: queryError } = await _fetchFabrics(userId);

        if (cancelled) return;

        if (queryError) {
          setError(queryError.message);
        } else {
          setFabrics(data ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? "Unknown error");
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

  // ── addFabric ────────────────────────────────────────────────────────────────
  // Optimistic: UUID is generated client-side, row is added to local state
  // immediately. Supabase insert fires in the background.
  const addFabric = useCallback((fields) => {
    const uid = userIdRef.current;
    if (!uid) return null;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const fabric = {
      id,
      user_id: uid,
      name: fields.name ?? "",
      source_type: fields.source_type ?? null,
      color: fields.color ?? null,
      fiber_content: fields.fiber_content ?? null,
      length_cm: fields.length_cm != null ? Number(fields.length_cm) : null,
      width_cm: fields.width_cm != null ? Number(fields.width_cm) : null,
      notes: fields.notes ?? null,
      image_url: fields.image_url ?? null,
      created_at: now,
      updated_at: now,
    };

    // Optimistic update — prepend so newest appears first
    setFabrics((prev) => [fabric, ...prev]);

    // Background Supabase write
    supabase
      .from("fabrics")
      .insert({ ...fabric })
      .then(({ error: insertError }) => {
        if (insertError) {
          console.error("[useFabrics] addFabric:", insertError.message);
          // Roll back the optimistic entry on failure
          setFabrics((prev) => prev.filter((f) => f.id !== id));
        }
      });

    return fabric;
  }, []);

  // ── deleteFabric ─────────────────────────────────────────────────────────────
  // Optimistic: row is removed from local state immediately.
  // Supabase delete fires in the background.
  const deleteFabric = useCallback((id) => {
    const uid = userIdRef.current;
    if (!uid) return;

    // Snapshot for rollback
    let removed;
    setFabrics((prev) => {
      removed = prev.find((f) => f.id === id);
      return prev.filter((f) => f.id !== id);
    });

    // Background Supabase delete
    supabase
      .from("fabrics")
      .delete()
      .eq("id", id)
      .eq("user_id", uid)
      .then(({ error: deleteError }) => {
        if (deleteError) {
          console.error("[useFabrics] deleteFabric:", deleteError.message);
          // Roll back by reinserting the removed item
          if (removed) {
            setFabrics((prev) =>
              [removed, ...prev].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at),
              ),
            );
          }
        }
      });
  }, []);

  // ── renameFabric ─────────────────────────────────────────────────────────────
  // Optimistic: local state updated immediately. Supabase write fires in background.
  const renameFabric = useCallback((id, name) => {
    const uid = userIdRef.current;
    if (!uid) return;

    let previous;
    setFabrics((prev) => {
      previous = prev.find((f) => f.id === id)?.name;
      return prev.map((f) => (f.id === id ? { ...f, name } : f));
    });

    supabase
      .from("fabrics")
      .update({ name })
      .eq("id", id)
      .eq("user_id", uid)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error("[useFabrics] renameFabric:", updateError.message);
          if (previous !== undefined) {
            setFabrics((prev) =>
              prev.map((f) => (f.id === id ? { ...f, name: previous } : f)),
            );
          }
        }
      });
  }, []);

  return {
    fabrics,
    loading,
    error,
    initialized,
    addFabric,
    deleteFabric,
    renameFabric,
  };
}
