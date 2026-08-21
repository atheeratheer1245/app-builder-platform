import { GoogleGenAI } from "@google/genai";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VEO_MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 18;

export type VideoGenerationFailure = "access" | "quota" | "safety" | "input" | "timeout" | "unavailable";

export class VideoGenerationError extends Error {
  constructor(public readonly reason: VideoGenerationFailure, cause?: unknown) {
    super(`VIDEO_GENERATION_${reason.toUpperCase()}`);
    this.name = "VideoGenerationError";
    if (cause) this.cause = cause;
  }
}

function geminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new VideoGenerationError("access");
  return new GoogleGenAI({ apiKey });
}

function failureReason(error: unknown): VideoGenerationFailure {
  const detail = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error ?? "");
  const value = detail.toLowerCase();
  if (/quota|resource.?exhausted|rate.?limit|too many requests|\b429\b/.test(value)) return "quota";
  if (/permission|forbidden|unauth|api.?key|billing|not enabled|not available.*account/.test(value)) return "access";
  if (/safety|policy|blocked|responsible ai/.test(value)) return "safety";
  if (/mime|image|invalid.?argument|unsupported.*format|\b400\b/.test(value)) return "input";
  if (/timeout|timed out|deadline/.test(value)) return "timeout";
  return "unavailable";
}

export async function generateVideoFromImage(input: {
  image: Uint8Array;
  mimeType: string;
  prompt: string;
}): Promise<Uint8Array> {
  try {
    if (!input.mimeType.startsWith("image/")) throw new VideoGenerationError("input");
    const ai = geminiClient();
    let operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      source: {
        prompt: input.prompt,
        image: {
          imageBytes: Buffer.from(input.image).toString("base64"),
          mimeType: input.mimeType,
        },
      },
      config: { numberOfVideos: 1, aspectRatio: "9:16" },
    });

    for (let attempt = 0; !operation.done && attempt < MAX_POLLS; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (!operation.done) throw new VideoGenerationError("timeout");
    if (operation.error) throw new Error(JSON.stringify(operation.error));
    const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
    if (!generatedVideo) throw new VideoGenerationError("unavailable");
    const downloadDirectory = await mkdtemp(join(tmpdir(), "app-builder-veo-"));
    const downloadPath = join(downloadDirectory, "generated.mp4");
    try {
      await ai.files.download({ file: generatedVideo, downloadPath });
      return new Uint8Array(await readFile(downloadPath));
    } finally {
      await rm(downloadDirectory, { recursive: true, force: true });
    }
  } catch (error) {
    if (error instanceof VideoGenerationError) throw error;
    throw new VideoGenerationError(failureReason(error), error);
  }
}
