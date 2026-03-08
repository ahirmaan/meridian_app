import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

async function test() {
    const payload = {
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: "A beautiful glowing cyberpunk city at sunset" }],
        stream: true,
        modalities: ["image"]
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Body:", text);
}

test();
