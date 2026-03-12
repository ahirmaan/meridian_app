import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// --- HELPERS ---
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

function getPromptHash(prompt: string, context: any[]): string {
    const data = JSON.stringify({ prompt, context });
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function summarizeHistory(messages: any[], apiKey: string): Promise<string> {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash:free",
                messages: [
                    { role: "system", content: "Summarize the following conversation history concisely in 50-80 tokens. Focus on user intent, key facts, and previous conclusions." },
                    { role: "user", content: JSON.stringify(messages) }
                ],
                max_tokens: 100
            })
        });
        if (!response.ok) return "Summarization failed.";
        const data = await response.json() as any;
        return data.choices?.[0]?.message?.content || "Summarization failed.";
    } catch (e) {
        console.error("Summarization error:", e);
        return "Summarization error.";
    }
}

function getOptimalModel(prompt: string, requestedModel: string): string {
    const lower = prompt.toLowerCase();
    const isSimple = lower.length < 50 && (
        lower.includes("hello") ||
        lower.includes("hi ") ||
        lower.includes("who are you") ||
        lower.includes("what is") ||
        lower.match(/^\d+ [\+\-\*\/] \d+$/)
    );

    if (isSimple) {
        console.log("[Router] Routing simple prompt to cheap model.");
        return "google/gemini-2.0-flash:free";
    }
    return requestedModel;
}
// --- END HELPERS ---

export async function createApp() {
    const app = express();

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
        console.error("CRITICAL: Supabase credentials missing during initialization!");
    }

    const supabase = createClient(supabaseUrl || "https://dummy.supabase.co", supabaseKey || "dummy_key");

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

    // ✅ Infrastructure Test
    app.get("/api/test", (req, res) => {
        res.json({
            status: "ok",
            message: "Express App is Running on Vercel",
            env: {
                has_supabase_url: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
                has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.VITE_SUPABASE_ANON_KEY,
                has_openrouter_key: !!process.env.OPENROUTER_API_KEY
            }
        });
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

            let { model, messages } = req.body;

            // --- OPTIMIZATION LAYER ---
            console.log("[Optimizer] History length:", messages.length);

            // 1. Cheap Model Routing
            const lastMessage = messages[messages.length - 1]?.content || "";
            model = getOptimalModel(lastMessage, model);

            // 2. Budget Protection & Truncation
            let totalTokens = messages.reduce((acc: number, m: any) => acc + estimateTokens(m.content || ""), 0);
            console.log("[Optimizer] Estimated total prompt tokens:", totalTokens);

            // 3. Conversation Summarization
            if (messages.length > 15 || totalTokens > 2000) {
                console.log("[Optimizer] Triggering auto-summarization...");
                const toSummarize = messages.slice(0, messages.length - 8);
                const summary = await summarizeHistory(toSummarize, process.env.OPENROUTER_API_KEY || "");
                const remaining = messages.slice(messages.length - 8);
                messages = [
                    { role: "system", content: `Conversation summary: ${summary}\n\nStrictly keep your response under 250 words to ensure you can fully finish your thought. Be concise but complete.` },
                    ...remaining
                ];
            } else {
                // Ensure concise instruction is always present if not summarizing
                if (messages[0]?.role !== 'system') {
                    messages.unshift({ role: "system", content: "Strictly keep your response under 250 words to ensure you can fully finish your thought. Be concise but complete." });
                }
            }

            // 4. Response Caching
            const cacheKey = getPromptHash(lastMessage, messages);
            const { data: cachedResponse } = await supabase
                .from("prompt_cache")
                .select("response")
                .eq("id", cacheKey)
                .single();

            if (cachedResponse) {
                console.log("[Optimizer] Cache HIT!");
                res.setHeader("Content-Type", "text/event-stream");
                res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: cachedResponse.response } }] })}\n\n`);
                res.write("data: [DONE]\n\n");
                res.end();
                return;
            }
            // --- END OPTIMIZATION LAYER ---

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

            console.log("DEBUG: Calling OpenRouter for model", model);

            const payload: any = {
                model,
                messages,
                stream: true,
                include_usage: true,
                max_tokens: 800
            };

            console.log(`[Optimizer] Sending prompt to ${model}. Full Messages:`, JSON.stringify(messages, null, 2));

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
            let fullText = "";

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
                                if (parsed.choices?.[0]?.delta?.content) {
                                    fullText += parsed.choices[0].delta.content;
                                }
                                if (parsed.usage) {
                                    lastChunkTokens = parsed.usage.total_tokens || 0;
                                }
                            } catch (e) { }
                        }
                    }
                }
            }

            res.end();

            // Save to Cache after stream completes
            if (fullText.trim()) {
                await supabase.from("prompt_cache").upsert({
                    id: cacheKey,
                    prompt: lastMessage,
                    response: fullText
                });
            }

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

            res.end();

        } catch (error: any) {
            console.error("CRITICAL DEBUG: Streaming error occurred!");
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);

            if (!res.headersSent) {
                res.status(500).json({
                    error: "Streaming failed",
                    details: error.message,
                    stack: error.stack
                });
            } else {
                console.error("Headers already sent, cannot send 500 error JSON.");
                res.end();
            }
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

    // ✅ Global Error Handler (Temporary: exposing details for debugging)
    app.use((err: any, req: any, res: any, next: any) => {
        console.error("GLOBAL SERVER ERROR:", err);
        res.status(500).json({
            error: "Internal Server Error",
            message: err.message,
            details: err.toString(),
            stack: err.stack
        });
    });

    return app;
}

// VERCEL HANDLER
let cachedApp: any = null;

export default async function handler(req: any, res: any) {
    try {
        if (!cachedApp) {
            cachedApp = await createApp();
        }
        return cachedApp(req, res);
    } catch (error: any) {
        console.error("VERCEL HANDLER CRASH:", error);
        res.status(500).json({
            error: "Server initialization failed",
            details: error.message,
            stack: error.stack
        });
    }
}
