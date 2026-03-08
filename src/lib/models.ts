export type ModelConfig = {
  id: string;          // OpenRouter model ID
  label: string;       // Display name
  provider: string;    // For grouping
  cheap?: boolean;     // For testing filter
};

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "Nemotron",
    provider: "NVIDIA",
    cheap: true,
  },
  {
    id: "stepfun/step-3.5-flash:free",
    label: "Stepfun",
    provider: "Stepfun",
    cheap: true,
  },
];