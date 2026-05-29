import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        const data = await signUp(email, password);
        // If Supabase requires email confirmation, session is null
        if (!data.session) {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      }
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-primary-800 px-6">
      <div className="w-full max-w-xs">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src="/logo.svg" alt="Fashion Flipper" className="w-8 h-8" />
          <h1 className="text-2xl font-bold text-primary-100 tracking-tight">
            Fashion Flipper
          </h1>
        </div>

        <div className="bg-primary-700 rounded-3xl p-6 border border-primary-600 shadow-lg">
          <h2 className="text-primary-100 font-semibold text-lg mb-5">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-primary-300 text-xs mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-primary-800 border border-primary-600 rounded-2xl px-4 py-2.5 text-primary-100 text-sm placeholder:text-primary-500 focus:outline-none focus:border-secondary-300"
              />
            </div>

            <div>
              <label className="block text-primary-300 text-xs mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-primary-800 border border-primary-600 rounded-2xl px-4 py-2.5 text-primary-100 text-sm placeholder:text-primary-500 focus:outline-none focus:border-secondary-300"
              />
            </div>

            {error && (
              <p className="text-rose-400 text-xs leading-snug">{error}</p>
            )}
            {message && (
              <p className="text-secondary-300 text-xs leading-snug">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-secondary-300 text-secondary-900 font-bold text-sm py-3 rounded-full shadow-sm active:scale-95 transition-transform disabled:opacity-60"
            >
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "login" ? "signup" : "login"));
              setError(null);
              setMessage(null);
            }}
            className="mt-4 w-full text-center text-primary-300 text-xs"
          >
            {mode === "login"
              ? "No account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
