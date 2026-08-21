import { randomUUID } from "node:crypto";

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 36;

export type AzureSoraFailure = "access" | "quota" | "safety" | "input" | "timeout" | "unavailable";

export class AzureSoraVideoError extends Error {
  constructor(public readonly reason: AzureSoraFailure, cause?: unknown) {
    super(`AZURE_SORA_VIDEO_${reason.toUpperCase()}`);
    this.name = "AzureSoraVideoError";
    if (cause) this.cause = cause;
  }
}

function environment() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, "");
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!endpoint || !deploymentName || !apiKey) throw new AzureSoraVideoError("access");
  return { endpoint, deploymentName, apiKey };
}

function failureReason(status: number, detail: string): AzureSoraFailure {
  const value = detail.toLowerCase();
  if (status === 429 || /quota|rate.?limit|too many requests|resource.?exhausted/.test(value)) return "quota";
  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|api.?key|credential|permission/.test(value)) return "access";
  if (/safety|policy|content.?filter|blocked/.test(value)) return "safety";
  if (status === 400 || status === 422 || /invalid|unsupported|mime|image|dimension/.test(value)) return "input";
  if (/timeout|timed out|deadline/.test(value)) return "timeout";
  return "unavailable";
}

async function failureDetail(response: Response) {
  const raw = await response.text();
  try { return String((JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? raw); } catch { return raw; }
}

export async function generateAzureSoraVideoFromImage(input: { image: Uint8Array; mimeType: string; prompt: string }): Promise<Uint8Array> {
  if (!input.mimeType.startsWith("image/")) throw new AzureSoraVideoError("input");
  const { endpoint, deploymentName, apiKey } = environment();
  const requestId = randomUUID();
  const baseUrl = `${endpoint}/openai/v1/video/generations`;
  const headers = { "api-key": apiKey, "x-ms-client-request-id": requestId };
  const fileName = input.mimeType === "image/png" ? "source.png" : "source.jpg";
  const form = new FormData();
  form.set("prompt", input.prompt);
  form.set("height", "1280");
  form.set("width", "720");
  form.set("n_seconds", "5");
  form.set("n_variants", "1");
  form.set("model", deploymentName);
  form.set("inpaint_items", JSON.stringify([{ frame_index: 0, type: "image", file_name: fileName, crop_bounds: { left_fraction: 0, top_fraction: 0, right_fraction: 1, bottom_fraction: 1 } }]));
  form.append("files", new Blob([new Uint8Array(input.image).buffer], { type: input.mimeType }), fileName);

  try {
    const createResponse = await fetch(`${baseUrl}/jobs?api-version=preview`, { method: "POST", headers, body: form });
    if (!createResponse.ok) throw new AzureSoraVideoError(failureReason(createResponse.status, await failureDetail(createResponse)));
    const created = await createResponse.json() as { id?: string };
    if (!created.id) throw new AzureSoraVideoError("unavailable");

    let status: { status?: string; generations?: Array<{ id?: string }>; failure_reason?: string } | undefined;
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const pollResponse = await fetch(`${baseUrl}/jobs/${created.id}?api-version=preview`, { headers });
      if (!pollResponse.ok) throw new AzureSoraVideoError(failureReason(pollResponse.status, await failureDetail(pollResponse)));
      status = await pollResponse.json() as typeof status;
      if (status?.status === "succeeded") break;
      if (status?.status === "failed" || status?.status === "cancelled") throw new AzureSoraVideoError(failureReason(422, status.failure_reason ?? status.status));
    }

    const generationId = status?.generations?.[0]?.id;
    if (!generationId) throw new AzureSoraVideoError("timeout");
    const videoResponse = await fetch(`${baseUrl}/${generationId}/content/video?api-version=preview`, { headers });
    if (!videoResponse.ok) throw new AzureSoraVideoError(failureReason(videoResponse.status, await failureDetail(videoResponse)));
    return new Uint8Array(await videoResponse.arrayBuffer());
  } catch (error) {
    if (error instanceof AzureSoraVideoError) throw error;
    throw new AzureSoraVideoError("unavailable", error);
  }
}
