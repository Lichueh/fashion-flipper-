import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../utils/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still resolving, null = no session, object = active session
  const [session, setSession] = useState(undefined);
  // true when getSession takes longer than 5 s — unblocks the loading gate
  // without forcing a null session (which would log the user out permanently).
  const [authTimedOut, setAuthTimedOut] = useState(false);
  // Prevents duplicate profile upserts across re-renders and StrictMode cycles.
  const syncedUserRef = useRef(null);

  // ── Auth bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // cancelled: prevents stale async callbacks from the first StrictMode mount
    // from updating state after that instance has been torn down.
    let cancelled = false;
    // resolvedInitialAuth: ensures only the first successful auth source
    // (getSession OR onAuthStateChange) wins the loading-gate race.
    let resolvedInitialAuth = false;

    // Called by whichever source resolves first. All subsequent calls are no-ops.
    function resolveInitialAuth(s, source) {
      if (cancelled || resolvedInitialAuth) return;
      resolvedInitialAuth = true;
      clearTimeout(timeout);
      setAuthTimedOut(false);
      setSession(s ?? null);
    }

    // 5 s safety net: unblocks the loading gate if Supabase is unreachable.
    // Does NOT force a null session — onAuthStateChange may still arrive later.
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setAuthTimedOut(true);
    }, 5000);

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (cancelled) return;
        resolveInitialAuth(s, "getSession");
      })
      .catch((err) => {
        if (cancelled) return;
        clearTimeout(timeout);
        logStep("getSession failed", { err });
        setAuthTimedOut(true);
      });

    // The callback is intentionally NOT async — Supabase warns that awaiting
    // other Supabase calls inside it can deadlock other auth operations.
    // Profile syncing is handled in the separate useEffect below.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) return;

      // For the initial bootstrap events, race against getSession to resolve
      // the loading gate. Only the first call to resolveInitialAuth takes effect.
      const isBootstrapEvent = [
        "INITIAL_SESSION",
        "SIGNED_IN",
        "SIGNED_OUT",
      ].includes(event);

      if (isBootstrapEvent && !resolvedInitialAuth) {
        resolveInitialAuth(s, event);
        return;
      }

      // All other events (TOKEN_REFRESHED, USER_UPDATED, and bootstrap events
      // after initial auth is already resolved): keep session state current.
      setSession(s ?? null);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // ── Profile sync ─────────────────────────────────────────────────────────────
  // Moved out of onAuthStateChange to avoid async Supabase calls in the auth
  // callback. Runs whenever the authenticated user ID changes.
  useEffect(() => {
    const user = session?.user;

    if (!user) {
      // Reset on sign-out so the next sign-in triggers a fresh upsert.
      syncedUserRef.current = null;
      return;
    }

    // Guard against duplicate upserts on re-renders and StrictMode double-mount.
    if (syncedUserRef.current === user.id) return;
    syncedUserRef.current = user.id;

    supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name:
            user.user_metadata?.display_name ??
            user.email?.split("@")[0] ??
            "User",
        },
        { onConflict: "id" },
      )
      .then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        authLoading: session === undefined && !authTimedOut,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
