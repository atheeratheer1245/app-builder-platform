const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 36;

export type OpenAISoraFailure = "access" | "quota" | "safety" | "input" | "timeout" | "unavailable";

export class OpenAISoraVideoError extends Error {
  constructor(public readonly reason: OpenAISoraFailure, cause?: unknown) {
    super(`OPENAI_SORA_VIDEO_${reason.toUpperCase()}`);
    this.name = "OpenAISoraVideoError";
    if (cause) this.cause = cause;
  }
}

function apiKey() {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) throw new OpenAISoraVideoError("access");
  return value;
}

function failureReason(status: number, detail: string): OpenAISoraFailure {
  const value = detail.toLowerCase();
  if (status === 429 || /quota|rate.?limit|too many requests|insufficient_quota/.test(value)) return "quota";
  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|api.?key|credential|permission/.test(value)) return "access";
  if (/safety|policy|content.?filter|real people|human likeness|face|blocked/.test(value)) return "safety";
  if (status === 400 || status === 422 || /invalid|unsupported|mime|image|dimension|input_reference/.test(value)) return "input";
  if (/timeout|timed out|deadline/.test(value)) return "timeout";
  return "unavailable";
}

async function responseDetail(response: Response) {
  const raw = await response.text();
  try { return String((JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? raw); } catch { return raw; }
}

export async function generateOpenAISoraVideoFromImage(input: { image: Uint8Array; mimeType: string; prompt: string }): Promise<Uint8Array> {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(input.mimeType)) throw new OpenAISoraVideoError("input");
  const token = apiKey();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const imageUrl = `data:${input.mimeType};base64,${Buffer.from(input.image).toString("base64")}`;

  try {
    const createResponse = await fetch("https://api.openai.com/v1/videos", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "sora-2",
        prompt: input.prompt,
        seconds: "4",
        input_reference: { image_url: imageUrl },
      }),
    });
    if (!createResponse.ok) throw new OpenAISoraVideoError(failureReason(createResponse.status, await responseDetail(createResponse)));
    let video = await createResponse.json() as { id?: string; status?: string; error?: { message?: string } };
    if (!video.id) throw new OpenAISoraVideoError("unavailable");

    for (let attempt = 0; attempt < MAX_POLLS && ["queued", "in_progress"].includes(video.status ?? ""); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const pollResponse = await fetch(`https://api.openai.com/v1/videos/${video.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!pollResponse.ok) throw new OpenAISoraVideoError(failureReason(pollResponse.status, await responseDetail(pollResponse)));
      video = await pollResponse.json() as typeof video;
    }
    if (video.status === "failed") throw new OpenAISoraVideoError(failureReason(422, video.error?.message ?? "video generation failed"));
    if (video.status !== "completed") throw new OpenAISoraVideoError("timeout");

    const contentResponse = await fetch(`https://api.openai.com/v1/videos/${video.id}/content`, { headers: { Authorization: `Bearer ${token}` } });
    if (!contentResponse.ok) throw new OpenAISoraVideoError(failureReason(contentResponse.status, await responseDetail(contentResponse)));
    return new Uint8Array(await contentResponse.arrayBuffer());
  } catch (error) {
    if (error instanceof OpenAISoraVideoError) throw error;
    throw new OpenAISoraVideoError("unavailable", error);
  }
}
