const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  flac: "audio/flac",
  weba: "audio/webm",
  webm: "audio/webm",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  ttf: "font/ttf",
  otf: "font/otf",
};

export const projectAssetAccept = "image/*,video/*,audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.weba,.webm,.ttf,.otf,.pdf";

function extensionOf(filename: string) {
  const clean = filename.trim().toLowerCase().split(/[?#]/, 1)[0] ?? "";
  const extension = clean.slice(clean.lastIndexOf(".") + 1);
  return extension === clean ? "" : extension;
}

/** Normalizes browser MIME quirks while preserving a concrete supplied media type. */
export function normalizeProjectAssetMimeType(filename: string, suppliedMimeType?: string) {
  const supplied = suppliedMimeType?.trim().toLowerCase() ?? "";
  const fallback = MIME_BY_EXTENSION[extensionOf(filename)];
  if (!supplied || supplied === "application/octet-stream" || supplied === "binary/octet-stream") return fallback ?? "application/octet-stream";
  return supplied;
}

export function isSupportedProjectAssetMimeType(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType.startsWith("audio/") || mimeType === "application/pdf" || mimeType === "font/ttf" || mimeType === "font/otf";
}

export function projectAssetKindForMimeType(mimeType: string): "icon" | "image" | "font" | "document" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "font/ttf" || mimeType === "font/otf") return "font";
  if (mimeType === "application/pdf") return "document";
  return "other";
}
