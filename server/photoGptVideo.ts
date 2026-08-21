const BASE_URL = "https://developer.photogptai.com/api";
const POLL_INTERVAL_MS = 8_000;
const MAX_POLLS = 45;

export type PhotoGptVideoFailure = "access" | "quota" | "safety" | "input" | "timeout" | "unavailable";

export class PhotoGptVideoError extends Error {
  constructor(public readonly reason: PhotoGptVideoFailure, cause?: unknown) {
    super(`PHOTOGPT_VIDEO_${reason.toUpperCase()}`);
    this.name = "PhotoGptVideoError";
    if (cause) this.cause = cause;
  }
}

function apiKey() {
  const value = process.env.PHOTOGPT_API_KEY?.trim();
  if (!value) throw new PhotoGptVideoError("access");
  return value;
}

function headers() { return { Authorization: `Bearer ${apiKey()}`, "API-Version": "1" }; }

function failureReason(status: number, detail: string): PhotoGptVideoFailure {
  const value = detail.toLowerCase();
  if (status === 429 || /quota|credit|rate.?limit|too many requests|insufficient/.test(value)) return "quota";
  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|api.?key|credential|permission/.test(value)) return "access";
  if (/safety|policy|content.?filter|blocked/.test(value)) return "safety";
  if (status === 400 || status === 422 || /invalid|unsupported|mime|image|reference/.test(value)) return "input";
  if (/timeout|timed out|deadline/.test(value)) return "timeout";
  return "unavailable";
}

async function responseDetail(response: Response) {
  const raw = await response.text();
  try { return String((JSON.parse(raw) as { message?: string; err?: string; error?: { message?: string } }).message ?? (JSON.parse(raw) as { err?: string }).err ?? (JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? raw); } catch { return raw; }
}

export async function generatePhotoGptVideoFromImage(input: { imageUrl: string; prompt: string }): Promise<Uint8Array> {
  if (!/^https:\/\//.test(input.imageUrl)) throw new PhotoGptVideoError("input");
  const authHeaders = headers();
  try {
    const createResponse = await fetch(`${BASE_URL}/videos/generation`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        modelID: "seedance-2.0",
        prompt: input.prompt,
        numVideos: 1,
        referenceImages: [{ url: input.imageUrl, role: "first_frame" }],
        options: { seedance: { duration: 6, ratio: "9:16", resolution: "720p", generateAudio: false } },
      }),
    });
    if (!createResponse.ok) throw new PhotoGptVideoError(failureReason(createResponse.status, await responseDetail(createResponse)));
    const created = await createResponse.json() as { result?: { jobId?: string } };
    const jobId = created.result?.jobId;
    if (!jobId) throw new PhotoGptVideoError("unavailable");

    let job: { status?: string; videos?: Array<{ url?: string }>; error?: string } | undefined;
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const pollResponse = await fetch(`${BASE_URL}/jobs/${jobId}`, { headers: authHeaders });
      if (!pollResponse.ok) throw new PhotoGptVideoError(failureReason(pollResponse.status, await responseDetail(pollResponse)));
      const body = await pollResponse.json() as { result?: typeof job };
      job = body.result;
      const status = String(job?.status ?? "").toLowerCase();
      if (status === "success") break;
      if (status === "failed") throw new PhotoGptVideoError(failureReason(422, job?.error ?? status));
    }
    const videoUrl = job?.videos?.[0]?.url;
    if (!videoUrl) throw new PhotoGptVideoError("timeout");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new PhotoGptVideoError(failureReason(videoResponse.status, await responseDetail(videoResponse)));
    return new Uint8Array(await videoResponse.arrayBuffer());
  } catch (error) {
    if (error instanceof PhotoGptVideoError) throw error;
    throw new PhotoGptVideoError("unavailable", error);
  }
}
