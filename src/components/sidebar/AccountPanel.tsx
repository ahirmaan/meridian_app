"use client";

import { motion } from "framer-motion";
import { X, User, Mail, Calendar, LogOut } from "lucide-react";
import React, { useState, useEffect } from "react";
import { supabase, supabaseEnabled } from "../../lib/supabase";

interface AccountPanelProps {
    onClose: () => void;
}

export function AccountPanel({ onClose }: AccountPanelProps) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            if (!supabaseEnabled || !supabase) {
                setLoading(false);
                return;
            }
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Logout failed:", error.message);
            return;
        }
        window.location.href = "/";
    };

    const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "User";

    const email = user?.email || "—";

    const avatarUrl = user?.user_metadata?.avatar_url || null;

    const provider =
        user?.app_metadata?.provider === "google"
            ? "Google"
            : user?.app_metadata?.provider === "email"
                ? "Email & Password"
                : user?.app_metadata?.provider || "—";

    const createdAt = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "—";

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150]"
                onClick={onClose}
            />

            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.25 }}
                className="fixed right-0 top-0 h-full w-96 bg-neutral-950 border-l border-neutral-800 z-[160] flex flex-col p-8 overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-white font-semibold text-lg tracking-tight">
                        Account
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
                    </div>
                ) : !user ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <User className="w-10 h-10 text-neutral-600 mb-3" />
                        <p className="text-neutral-400 text-sm">
                            No account information available.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {/* Avatar & Name */}
                        <div className="flex flex-col items-center text-center">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-neutral-800 mb-4"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-white">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <h3 className="text-white font-semibold text-lg">
                                {displayName}
                            </h3>
                            <p className="text-neutral-500 text-sm">{email}</p>
                        </div>

                        {/* Info rows */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-xs uppercase tracking-widest text-neutral-400 mb-1 font-medium">
                                Account Details
                            </h4>

                            <InfoRow
                                icon={<Mail className="w-4 h-4" />}
                                label="Email"
                                value={email}
                            />
                            <InfoRow
                                icon={<User className="w-4 h-4" />}
                                label="Sign-in Method"
                                value={provider}
                            />
                            <InfoRow
                                icon={<Calendar className="w-4 h-4" />}
                                label="Member Since"
                                value={createdAt}
                            />
                        </div>

                        {/* Logout */}
                        <div className="mt-4">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </>
    );
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <div className="text-neutral-400">{icon}</div>
            <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-medium">
                    {label}
                </span>
                <span className="text-sm text-white truncate">{value}</span>
            </div>
        </div>
    );
}
