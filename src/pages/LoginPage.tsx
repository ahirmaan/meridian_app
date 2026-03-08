"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "../components/ui/aurora-background";
import { supabase, supabaseEnabled } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (!supabaseEnabled || !supabase) {
      setError("Authentication is not configured.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (!supabaseEnabled || !supabase) {
      setError("Authentication is not configured.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/chat`,
      },
    });

    if (error) {
      console.error("Google login error:", error.message);
      setError(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    if (!supabaseEnabled || !supabase) {
      setResetError("Authentication is not configured.");
      return;
    }

    setResetLoading(true);
    setResetError("");

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setResetError(error.message);
    } else {
      setResetSent(true);
    }

    setResetLoading(false);
  };

  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center min-h-screen w-full px-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="flex flex-col items-center gap-8 w-full"
        >
          <h1 className="text-5xl font-bold tracking-tight text-white text-center">
            Welcome to Meridian
          </h1>

          <div className="w-full max-w-sm bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col gap-5">
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />

            <div className="flex flex-col gap-1">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
              <div className="flex justify-between mt-1">
                <button
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                  onClick={() => navigate("/signup")}
                >
                  Create account
                </button>
                <button
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                  onClick={() => {
                    setResetEmail(email);
                    setResetSent(false);
                    setResetError("");
                    setForgotOpen(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-white text-black font-medium rounded-xl py-3 text-sm hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-black border border-neutral-300 rounded-xl py-3 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center px-4"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setForgotOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-[400px] shadow-2xl"
            >
              {resetSent ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-white font-semibold text-xl mb-2">Check Your Email</h2>
                  <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                    We've sent a password reset link to <span className="text-white font-medium">{resetEmail}</span>. Check your inbox and follow the link to reset your password.
                  </p>
                  <button
                    onClick={() => setForgotOpen(false)}
                    className="w-full py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-white font-semibold text-xl mb-2">Reset Password</h2>
                  <p className="text-neutral-400 text-sm mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>

                  {resetError && (
                    <p className="text-red-400 text-sm mb-4 text-center">{resetError}</p>
                  )}

                  <input
                    type="email"
                    placeholder="Email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                    autoFocus
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 mb-6"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setForgotOpen(false)}
                      className="flex-1 py-3 rounded-xl border border-neutral-800 text-sm text-neutral-400 hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {resetLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuroraBackground>
  );
}
