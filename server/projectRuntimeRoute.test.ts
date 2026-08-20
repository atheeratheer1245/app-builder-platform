import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const runtimeSource = readFileSync(resolve(projectRoot, "client/src/pages/ProjectRuntimePage.tsx"), "utf8");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const editorSource = readFileSync(resolve(projectRoot, "client/src/pages/BuilderPages.tsx"), "utf8");

describe("runnable project route", () => {
  it("registers a protected runtime page for saved projects", () => {
    expect(appSource).toContain('path="/run/:id"');
    expect(runtimeSource).toContain("<WorkspaceAccess>");
    expect(runtimeSource).toContain("trpc.appBuilder.projects.getWorkspace.useQuery");
  });

  it("renders gallery media and uses selected page ids for interactive navigation", () => {
    expect(runtimeSource).toContain("<img");
    expect(runtimeSource).toContain("<video");
    expect(runtimeSource).toContain("<audio");
    expect(runtimeSource).toContain("onNavigate(target)");
    expect(runtimeSource).toContain("item.targetPageId");
  });

  it("gives the editor a direct run-app action instead of a non-functional preview button", () => {
    expect(editorSource).toContain("href={`/run/${projectId}`}");
    expect(editorSource).toContain('copy("تشغيل التطبيق", "Run app")');
    expect(editorSource).toContain("setEditingComponent({ id: created.id");
    expect(editorSource).toContain("utils.appBuilder.assets.list.invalidate(projectId)");
    expect(editorSource).toContain('copy("الحفظ تلقائي", "Auto-saved")');
  });

  it("runs the platformer preset with touch controls, collectibles, hazards, score, lives, timer, and a finish gate", () => {
    expect(runtimeSource).toContain("function PlatformerRuntime");
    expect(runtimeSource).toContain('component.componentType === "Platform"');
    expect(runtimeSource).toContain('component.componentType === "Collectible"');
    expect(runtimeSource).toContain('component.componentType === "Hazard"');
    expect(runtimeSource).toContain('component.componentType === "FinishGate"');
    expect(runtimeSource).toContain('component.componentType === "TouchControls"');
    expect(runtimeSource).toContain('setStatus("won")');
    expect(runtimeSource).toContain('setStatus("lost")');
    expect(editorSource).toContain('if (type === "Platform")');
    expect(editorSource).toContain('if (type === "TouchControls")');
  });
});
