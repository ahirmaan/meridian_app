/**
 * Returns the public path to the official logo for a given model ID or label.
 */
export function getModelLogoSrc(identifier: string): string | null {
    const id = identifier.toLowerCase();

    if (id.includes("gpt") || id.includes("openai")) return "/openai-logo.png";
    if (id.includes("claude") || id.includes("anthropic")) return "/claude-logo.png";
    if (id.includes("llama") || id.includes("meta")) return "/meta-logo.png";
    if (id.includes("nvidia") || id.includes("nemotron")) return "/nvidia-logo.png";
    if (id.includes("qwen")) return "/qwen-logo.png";
    if (id.includes("google") || id.includes("gemini") || id.includes("gemma")) return "/google-logo.png";
    if (id.includes("stepfun")) return "/stepfun-logo.png";

    return null; // No logo available
}
