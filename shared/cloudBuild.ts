export const cloudBuildFormats = ["apk", "aab", "ipa"] as const;
export type CloudBuildFormat = (typeof cloudBuildFormats)[number];

export type CloudBuildRequest = {
  exportJobId: number;
  projectId: number;
  format: CloudBuildFormat;
  appName: string;
  packageName: string | null;
  versionName: string;
  language: "ar" | "en" | "both";
  sourceArchiveUrl: string;
  callbackUrl: string;
};

export type CloudBuildCallback = {
  providerBuildId: string;
  exportJobId: number;
  status: "queued" | "building" | "ready" | "failed";
  artifactUrl?: string;
  artifactKey?: string;
  failureReason?: string;
};

export interface CloudBuildProvider {
  createBuild(request: CloudBuildRequest): Promise<{ providerBuildId: string; status: "queued" | "building" }>;
  verifyCallback(payload: CloudBuildCallback, signature: string | undefined): Promise<boolean>;
}
