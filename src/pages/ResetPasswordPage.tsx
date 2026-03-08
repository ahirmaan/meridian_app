"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AuroraBackground } from "../components/ui/aurora-background";
import { supabase, supabaseEnabled } from "../lib/supabase";

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const isPasswordStrong = (pass: string) => {
        return pass.length >= 8 && /\d/.test(pass) && /[A-Z]/.test(pass);
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            setError("Please fill in both fields.");
            return;
        }

        if (!isPasswordStrong(newPassword)) {
            setError("Password must be at least 8 characters, include a number and an uppercase letter.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!supabaseEnabled || !supabase) {
            setError("Authentication is not configured.");
            return;
        }

        setLoading(true);
        setError("");

        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);

        // Redirect to chat after a brief delay
        setTimeout(() => {
            navigate("/chat", { replace: true });
        }, 2000);
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
                    <h1 className="text-4xl font-bold tracking-tight text-white text-center">
                        Reset Your Password
                    </h1>

                    <div className="w-full max-w-sm bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col gap-5">
                        {success ? (
                            <div className="flex flex-col items-center text-center py-4">
                                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                                    <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-white font-semibold text-xl mb-2">Password Updated!</h2>
                                <p className="text-neutral-400 text-sm leading-relaxed">
                                    Your password has been successfully reset. Redirecting you to the dashboard...
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-neutral-400 text-sm text-center">
                                    Enter your new password below.
                                </p>

                                {error && (
                                    <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</p>
                                )}

                                <div className="flex flex-col gap-1">
                                    <input
                                        type="password"
                                        placeholder="New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                                    />
                                    <p className="text-[10px] text-white/50 mt-1">
                                        Minimum 8 characters, at least 1 number, and 1 uppercase letter.
                                    </p>
                                </div>

                                <input
                                    type="password"
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                                />

                                <button
                                    onClick={handleResetPassword}
                                    disabled={loading}
                                    className="w-full bg-white text-black font-medium rounded-xl py-3 text-sm hover:bg-neutral-100 transition-colors disabled:opacity-50 mt-2"
                                >
                                    {loading ? "Updating..." : "Update Password"}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AuroraBackground>
    );
}
