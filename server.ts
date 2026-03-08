import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

console.log("OPENROUTER KEY EXISTS:", !!process.env.OPENROUTER_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl || "https://dummy.supabase.co", supabaseKey || "dummy_key");

async function startServer() {
  const app = express();
  const PORT = 3000;

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
        return res.status(401).json({ error: "Missing Authorization header" });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Check daily token limit (50,000)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: usageData, error: usageError } = await supabase
        .from("usage_logs")
        .select("tokens_used")
        .eq("user_id", user.id)
        .gte("created_at", startOfDay.toISOString());

      if (usageError) {
        console.error("Usage fetch error:", usageError);
        return res.status(500).json({ error: "Failed to verify token quota" });
      }

      const totalUsedToday = usageData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;

      console.log(`User ${user.id} has used ${totalUsedToday} tokens today.`);

      if (totalUsedToday >= 50000) {
        return res.status(429).json({ error: "Daily token limit reached" });
      }

      const { model, messages } = req.body;

      console.log("------------------ NEW REQUEST ------------------");
      console.log(`Requested Model: ${model}`);
      console.log("Messages Payload Length:", messages.length);
      console.log("-------------------------------------------------");

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
        console.error("OpenRouter error:", errorText);
        return res.status(500).json({
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

      let fullResponseRaw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponseRaw += chunk;
        res.write(chunk); // 🔥 Send chunk to frontend immediately

        // Extract usage tokens from final chunk events if available
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr && dataStr !== "[DONE]") {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.usage) {
                  console.log("📊 Token Usage:", JSON.stringify(parsed.usage));
                  lastChunkTokens = parsed.usage.total_tokens || 0;
                }
              } catch (e) {
                // ignore unparseable chunks
              }
            }
          }
        }
      }

      res.end();

      // Log usage to Supabase if tokens were consumed
      if (lastChunkTokens > 0) {
        console.log(`✅ Logging ${lastChunkTokens} tokens for model: ${model}, user: ${user.id}`);
        const { error: insertError } = await supabase.from("usage_logs").insert({
          user_id: user.id,
          model,
          tokens_used: lastChunkTokens,
        });

        if (insertError) {
          console.error("❌ Failed to insert usage log:", insertError);
        } else {
          console.log(`✅ Successfully logged ${lastChunkTokens} tokens for user ${user.id}`);
        }
      }

    } catch (error: any) {
      console.error("CRITICAL Streaming error:", error);
      res.status(500).json({
        error: "Streaming failed",
        details: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  });

  // ✅ Generate Chat Title (non-streaming)
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
        const errorText = await response.text();
        console.error("Title generation error:", errorText);
        return res.status(500).json({ error: "Failed to generate title" });
      }

      const data = await response.json() as any;
      const title = data.choices?.[0]?.message?.content?.trim() || "New Chat";
      res.json({ title });
    } catch (error: any) {
      console.error("Title generation error:", error);
      res.status(500).json({ error: "Failed to generate title" });
    }
  });

  // ✅ Get Daily Token Usage (for progress bar)
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
      console.error("Fetch usage error:", error);
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  // 🔥 Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // In production (e.g. Vercel), use process.cwd() which is more reliable for serverless functions
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only start the server if we're not running as a Vercel serverless function
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

// Export the startServer function to be used by Vercel
export default startServer;

// If this file is run directly (not imported), start the server
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  startServer().catch(err => {
    console.error("Failed to start server:", err);
  });
}