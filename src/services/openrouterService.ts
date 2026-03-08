import axios from "axios";

export async function callOpenRouter(
  model: string,
  messages: { role: string; content: string }[]
) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      messages,
      ...(model.includes("flux") || model.includes("riverflow") || model.includes("dall-e")
        ? { modalities: ["image"] }
        : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}