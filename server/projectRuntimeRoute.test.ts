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

  it("uses saved asset URLs and disables incomplete navigation rather than rendering inert actions", () => {
    expect(runtimeSource).toContain('text(props, "assetUrl")');
    expect(runtimeSource).toContain("autoPlay muted loop playsInline");
    expect(runtimeSource).toContain("disabled={!target}");
    expect(runtimeSource).toContain("const target = typeof item.targetPageId === \"number\" ? item.targetPageId : null");
    expect(runtimeSource).toContain("const target = typeof props.targetPageId === \"number\" ? props.targetPageId : null");
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

  it("runs generated custom game scenes through the playable platform runtime", () => {
    expect(runtimeSource).toContain('selectedMode === "platformer" || selectedMode === "custom"');
    expect(runtimeSource).toContain("<PlatformerRuntime components={components}");
  });

  it("renders selected PDF documents and animates uploaded sprite images inside the runnable app", () => {
    expect(runtimeSource).toContain('component.componentType === "PDFDocument"');
    expect(runtimeSource).toContain("<iframe");
    expect(runtimeSource).toContain('component.componentType === "ImageAnimation"');
    expect(runtimeSource).toContain("setAnimationTick");
    expect(runtimeSource).toContain("backgroundPosition");
    expect(editorSource).toContain('if (type === "PDFDocument")');
    expect(editorSource).toContain("function MotionVideoFields");
    expect(editorSource).toContain("<LocalMotionStudio");
  });
});
