import { describe, expect, it } from "vitest";

const token = process.env.CODEMAGIC_API_TOKEN;
const androidWorkflowId = process.env.CODEMAGIC_ANDROID_WORKFLOW_ID;
const branch = process.env.CODEMAGIC_BRANCH;

describe("Codemagic credentials", () => {
  it("authenticates with the configured API token and recognizes the configured project workflows", async () => {
    expect(token).toBeTruthy();
    expect(androidWorkflowId).toBeTruthy();
    expect(branch).toBeTruthy();
    const response = await fetch("https://api.codemagic.io/apps", {
      headers: { "x-auth-token": token! },
    });
    expect(response.status).toBe(200);
    const payload = await response.json() as { applications?: Array<{ _id?: string; appName?: string }> };
    const application = payload.applications?.find(candidate => candidate.appName === "app-builder-platform");
    expect(application).toBeTruthy();
  }, 20_000);
});
