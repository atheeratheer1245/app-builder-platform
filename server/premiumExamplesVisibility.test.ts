import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePages.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const publicSource = readFileSync(new URL("../client/src/pages/PublicPages.tsx", import.meta.url), "utf8");

describe("premium example visibility", () => {
  it("keeps the core template library while removing example cards and public preview routes", () => {
    expect(homeSource).not.toContain("PremiumExamplesPanel");
    expect(workspaceSource).not.toContain("PremiumExamplesPanel");
    expect(workspaceSource).toContain("template-library-grid");
    expect(appSource).not.toContain('/examples/:slug');
    expect(publicSource).not.toContain("PremiumExamplePreviewPage");
    expect(publicSource).not.toContain("أمثلة التطبيقات");
  });
});
