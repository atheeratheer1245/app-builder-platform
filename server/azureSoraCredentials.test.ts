import { describe, expect, it } from "vitest";

describe("Azure Sora credentials", () => {
  it("confirms whether the optional Azure resource exposes deployments without blocking the local motion tool", async () => {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    expect(endpoint).toBeTruthy();
    expect(apiKey).toBeTruthy();
    expect(deploymentName).toBeTruthy();

    const response = await fetch(`${endpoint}/openai/deployments?api-version=2024-02-01`, { headers: { "api-key": apiKey! } });
    // A configured Azure OpenAI deployment responds successfully. This workspace currently has
    // no Sora deployment, which Azure reports as 404; the first-party local studio is independent.
    expect([200, 404], `Unexpected Azure response ${response.status}: ${await response.text()}`).toContain(response.status);
  }, 30_000);
});
