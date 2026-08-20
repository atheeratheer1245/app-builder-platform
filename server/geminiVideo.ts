import { GoogleGenAI } from "@google/genai";

const VEO_MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 18;

function geminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini video generation is not configured");
  return new GoogleGenAI({ apiKey });
}

export async function generateVideoFromImage(input: {
  image: Uint8Array;
  mimeType: string;
  prompt: string;
}): Promise<Uint8Array> {
  const ai = geminiClient();
  let operation = await ai.models.generateVideos({
    model: VEO_MODEL,
    prompt: input.prompt,
    image: {
      imageBytes: Buffer.from(input.image).toString("base64"),
      mimeType: input.mimeType,
    },
    config: { numberOfVideos: 1, aspectRatio: "9:16" },
  });

  for (let attempt = 0; !operation.done && attempt < MAX_POLLS; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (!operation.done) throw new Error("Video generation timed out; please try again");
  if (operation.error) throw new Error("Gemini could not generate this video");
  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Gemini returned no video result");
  const download = await fetch(videoUri, {
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY! },
  });
  if (!download.ok) throw new Error("Could not download the generated video");
  return new Uint8Array(await download.arrayBuffer());
}
