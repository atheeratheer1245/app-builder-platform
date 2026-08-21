import type { CloudBuildFormat } from "../shared/cloudBuild";

const CODEMAGIC_API = "https://api.codemagic.io";
const CODEMAGIC_V3_API = "https://codemagic.io/api/v3";

export type CodemagicArtifact = {
  name: string;
  sizeBytes: number;
  downloadUrl: string;
  type: CloudBuildFormat | "unknown";
};

export type CodemagicBuildSnapshot = {
  id: string;
  status: string;
  artifacts: CodemagicArtifact[];
};

export type CodemagicBuildConfig = {
  appId: string;
  workflowId: string;
  branch: string;
  token: string;
};

export type CodemagicStartInput = {
  exportJobId: number;
  environment: Record<string, string>;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseJson(value: string): unknown {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

export function codemagicExportLabel(exportJobId: number) {
  return `app-builder-export-${exportJobId}`;
}

export function normalizeCodemagicAppId(value: string | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && url.hostname === "api.codemagic.io") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length === 2 && parts[0] === "hooks" && /^[a-zA-Z0-9_-]{12,160}$/.test(parts[1]!)) return parts[1]!;
    }
  } catch {
    // The normal App ID format is not a URL.
  }
  return raw;
}

export function getCodemagicBuildConfig(environment: NodeJS.ProcessEnv = process.env): CodemagicBuildConfig {
  const token = environment.CODEMAGIC_API_TOKEN?.trim();
  const appId = normalizeCodemagicAppId(environment.CODEMAGIC_APP_ID);
  const workflowId = environment.CODEMAGIC_ANDROID_WORKFLOW_ID?.trim();
  const branch = environment.CODEMAGIC_BRANCH?.trim() || "main";
  if (!token || !appId || !workflowId) {
    throw new Error("Codemagic Android build configuration is incomplete");
  }
  return { token, appId, workflowId, branch };
}

export function createCodemagicBuildRequest(config: CodemagicBuildConfig, input: CodemagicStartInput) {
  return {
    appId: config.appId,
    workflowId: config.workflowId,
    branch: config.branch,
    labels: [codemagicExportLabel(input.exportJobId)],
    environment: { variables: input.environment },
  };
}

async function getBuildIdByLabel(config: CodemagicBuildConfig, label: string): Promise<string | null> {
  const response = await fetch(`${CODEMAGIC_API}/builds`, { headers: { "x-auth-token": config.token } });
  if (!response.ok) return null;
  const payload = readRecord(await response.json());
  const builds = Array.isArray(payload.builds) ? payload.builds : [];
  for (const candidate of builds) {
    const build = readRecord(candidate);
    const labels = Array.isArray(build.labels) ? build.labels.filter((item): item is string => typeof item === "string") : [];
    if (build.appId === config.appId && labels.includes(label)) {
      return optionalString(build._id) ?? optionalString(build.id);
    }
  }
  return null;
}

export async function startCodemagicAndroidBuild(input: CodemagicStartInput): Promise<{ providerBuildId: string }> {
  const config = getCodemagicBuildConfig();
  const response = await fetch(`${CODEMAGIC_API}/builds`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-token": config.token },
    body: JSON.stringify(createCodemagicBuildRequest(config, input)),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Codemagic build request failed (${response.status})`);
  const payload = readRecord(parseJson(body));
  const providerBuildId = optionalString(payload.buildId) ?? optionalString(payload.id) ?? optionalString(payload._id);
  if (providerBuildId) return { providerBuildId };

  const recoveredBuildId = await getBuildIdByLabel(config, codemagicExportLabel(input.exportJobId));
  if (recoveredBuildId) return { providerBuildId: recoveredBuildId };
  throw new Error("Codemagic did not return a build identifier");
}

function readArtifactType(value: unknown, name: string): CodemagicArtifact["type"] {
  const type = optionalString(value)?.toLowerCase();
  if (type === "apk" || type === "aab" || type === "ipa") return type;
  const extension = name.split(".").pop()?.toLowerCase();
  return extension === "apk" || extension === "aab" || extension === "ipa" ? extension : "unknown";
}

export function normalizeCodemagicBuild(payload: unknown): CodemagicBuildSnapshot {
  const root = readRecord(payload);
  const build = readRecord(root.data ?? root);
  const id = optionalString(build._id) ?? optionalString(build.id);
  const status = optionalString(build.status);
  if (!id || !status) throw new Error("Codemagic returned an invalid build response");
  const rawArtifacts = Array.isArray(build.artefacts) ? build.artefacts : Array.isArray(build.artifacts) ? build.artifacts : [];
  const artifacts = rawArtifacts.flatMap(rawArtifact => {
    const artifact = readRecord(rawArtifact);
    const name = optionalString(artifact.name);
    const downloadUrl = optionalString(artifact.short_lived_download_url) ?? optionalString(artifact.downloadUrl) ?? optionalString(artifact.url);
    if (!name || !downloadUrl) return [];
    const sizeCandidate = artifact.size_in_bytes ?? artifact.sizeBytes ?? artifact.size;
    const sizeBytes = typeof sizeCandidate === "number" && Number.isFinite(sizeCandidate) && sizeCandidate >= 0 ? sizeCandidate : 0;
    return [{ name, downloadUrl, sizeBytes, type: readArtifactType(artifact.type, name) }];
  });
  return { id, status, artifacts };
}

export async function getCodemagicBuild(providerBuildId: string): Promise<CodemagicBuildSnapshot> {
  const { token } = getCodemagicBuildConfig();
  const response = await fetch(`${CODEMAGIC_V3_API}/builds/${encodeURIComponent(providerBuildId)}`, {
    headers: { "x-auth-token": token },
  });
  if (!response.ok) throw new Error(`Codemagic build lookup failed (${response.status})`);
  return normalizeCodemagicBuild(await response.json());
}

export function isCodemagicBuildInProgress(status: string) {
  return ["initializing", "queued", "preparing", "fetching", "testing", "building", "publishing", "finishing"].includes(status);
}

export function selectArtifactForFormat(artifacts: CodemagicArtifact[], format: CloudBuildFormat) {
  return artifacts.find(artifact => artifact.type === format || artifact.name.toLowerCase().endsWith(`.${format}`)) ?? null;
}

export async function downloadCodemagicArtifact(artifactUrl: string): Promise<{ bytes: Buffer; contentType: string }> {
  const { token } = getCodemagicBuildConfig();
  const response = await fetch(artifactUrl, { headers: { "x-auth-token": token } });
  if (!response.ok) throw new Error(`Codemagic artifact download failed (${response.status})`);
  const maxArtifactBytes = 250 * 1024 * 1024;
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxArtifactBytes) throw new Error("Codemagic artifact exceeds the safe intake size");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maxArtifactBytes) throw new Error("Codemagic artifact has an invalid size");
  return { bytes, contentType: response.headers.get("content-type") ?? "application/octet-stream" };
}
