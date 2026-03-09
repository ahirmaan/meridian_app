import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl || "https://dummy.supabase.co", supabaseKey || "dummy_key");

export async function createApp() {
    const app = express();

    // ✅ Validate Environment Variables at start
    const requiredEnv = [
        { key: "SUPABASE_URL", fallback: "VITE_SUPABASE_URL" },
        { key: "SUPABASE_SERVICE_ROLE_KEY", fallback: "VITE_SUPABASE_ANON_KEY" },
        { key: "OPENROUTER_API_KEY" }
    ];

    const missingEnv = requiredEnv.filter(env => !process.env[env.key] && (!env.fallback || !process.env[env.fallback]));

    if (missingEnv.length > 0 && process.env.VERCEL === '1') {
        console.error("CRITICAL: Missing environment variables on Vercel:", missingEnv.map(e => e.key).join(", "));
    }

    // 🔥 IMPORTANT (Increased limit to 50mb for base64 file uploads)
    app.use(express.json({ limit: "50mb" }));

    // ✅ Health check
    app.get("/api/health", (req, res) => {
        res.json({ status: "ok" });
    });

    // ✅ OpenRouter Chat Endpoint (Streaming)
    app.post("/api/chat", async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                console.error("DEBUG: Missing Authorization header");
                return res.status(401).json({ error: "Missing Authorization header" });
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                console.error("DEBUG: Auth error or no user", authError);
                return res.status(401).json({ error: "Invalid or expired token", details: authError?.message });
            }

            // Check daily token limit (50,000)
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            console.log("DEBUG: Fetching usage for user", user.id);
            const { data: usageData, error: usageError } = await supabase
                .from("usage_logs")
                .select("tokens_used")
                .eq("user_id", user.id)
                .gte("created_at", startOfDay.toISOString());

            if (usageError) {
                console.error("DEBUG: Usage fetch error:", usageError);
                return res.status(500).json({ error: "Failed to verify token quota", details: usageError.message });
            }

            const totalUsedToday = usageData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;

            if (totalUsedToday >= 50000) {
                console.warn("DEBUG: Token limit reached for", user.id);
                return res.status(429).json({ error: "Daily token limit reached" });
            }

            const { model, messages } = req.body;
            console.log("DEBUG: Calling OpenRouter for model", model);

            const payload: any = {
                model,
                messages,
                stream: true,
                include_usage: true,
            };

            const response = await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "Meridian",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok || !response.body) {
                const errorText = await response.text();
                console.error("DEBUG: OpenRouter error:", errorText, "Status:", response.status);
                return res.status(response.status || 500).json({
                    error: "OpenRouter call failed",
                    details: errorText,
                    status: response.status
                });
            }

            let lastChunkTokens = 0;

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                res.write(chunk);

                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.replace("data: ", "").trim();
                        if (dataStr && dataStr !== "[DONE]") {
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.usage) {
                                    lastChunkTokens = parsed.usage.total_tokens || 0;
                                }
                            } catch (e) { }
                        }
                    }
                }
            }

            res.end();

            if (lastChunkTokens > 0) {
                console.log("DEBUG: Attempting to log usage tokens:", lastChunkTokens);
                const { error: logError } = await supabase.from("usage_logs").insert({
                    user_id: user.id,
                    model,
                    tokens_used: lastChunkTokens,
                });

                if (logError) {
                    console.error("DEBUG: Supabase Logging Error:", logError);
                } else {
                    console.log("DEBUG: Successfully logged usage tokens.");
                }
            }

        } catch (error: any) {
            console.error("CRITICAL DEBUG: Streaming error:", error);
            res.status(500).json({
                error: "Streaming failed",
                details: error.message,
            });
        }
    });

    // ✅ Generate Chat Title
    app.post("/api/generate-title", async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ error: "Missing Authorization header" });
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                return res.status(401).json({ error: "Invalid or expired token" });
            }

            const { message } = req.body;

            const response = await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "Meridian",
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.5-flash:free",
                        messages: [
                            {
                                role: "system",
                                content:
                                    "Generate a short chat title (3-4 words max) for this conversation based on the user's first message. Return ONLY the title text, no quotes, no punctuation at the end, no explanation.",
                            },
                            { role: "user", content: message },
                        ],
                        max_tokens: 20,
                    }),
                }
            );

            if (!response.ok) {
                return res.status(500).json({ error: "Failed to generate title" });
            }

            const data = await response.json() as any;
            const title = data.choices?.[0]?.message?.content?.trim() || "New Chat";
            res.json({ title });
        } catch (error: any) {
            res.status(500).json({ error: "Failed to generate title" });
        }
    });

    // ✅ Get Daily Token Usage
    app.get("/api/usage", async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ error: "Missing Authorization header" });
            }

            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                return res.status(401).json({ error: "Invalid or expired token" });
            }

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from("usage_logs")
                .select("tokens_used")
                .eq("user_id", user.id)
                .gte("created_at", startOfDay.toISOString());

            if (error) {
                return res.status(500).json({ error: "Failed to fetch usage" });
            }

            const tokensUsed = data?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;
            res.json({ tokensUsed });
        } catch (error: any) {
            res.status(500).json({ error: "Failed to fetch usage" });
        }
    });

    // ✅ Global Error Handler
    app.use((err: any, req: any, res: any, next: any) => {
        console.error("GLOBAL SERVER ERROR:", err);
        res.status(500).json({
            error: "Internal Server Error",
            message: err.message,
            stack: process.env.VERCEL === '1' ? undefined : err.stack
        });
    });

    return app;
}
