import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Layers3, Loader2, MousePointer2, Play, Plus, Trash2, Video } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

type MotionEffect = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "fade" | "shake" | "pulse";
type Selection = { x: number; y: number; width: number; height: number };
type MotionLayer = Selection & { id: string; name: string; effect: MotionEffect };

type LocalMotionStudioProps = {
  imageUrl: string;
  sourceFilename: string;
  isArabic: boolean;
  disabled?: boolean;
  onExport: (file: File) => Promise<void> | void;
};

const effects: Array<{ id: MotionEffect; ar: string; en: string }> = [
  { id: "zoom-in", ar: "تقريب ناعم", en: "Smooth zoom in" },
  { id: "zoom-out", ar: "إبعاد ناعم", en: "Smooth zoom out" },
  { id: "pan-left", ar: "تحريك إلى اليسار", en: "Pan left" },
  { id: "pan-right", ar: "تحريك إلى اليمين", en: "Pan right" },
  { id: "fade", ar: "ظهور متدرّج", en: "Gentle fade" },
  { id: "shake", ar: "اهتزاز خفيف", en: "Subtle shake" },
  { id: "pulse", ar: "نبض سينمائي", en: "Cinematic pulse" },
];

const outputWidth = 540;
const outputHeight = 960;

function bounded(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function easedProgress(progress: number) {
  const boundedProgress = bounded(progress, 0, 1);
  return boundedProgress * boundedProgress * (3 - 2 * boundedProgress);
}

function effectTransform(progress: number, effect: MotionEffect, width: number, height: number) {
  const boundedProgress = bounded(progress, 0, 1);
  const eased = easedProgress(boundedProgress);
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let opacity = 1;
  let rotation = 0;
  if (effect === "zoom-in") scale = 1 + (0.18 * eased);
  if (effect === "zoom-out") scale = 1.18 - (0.18 * eased);
  if (effect === "pan-left") { scale = 1.13; translateX = -width * 0.12 * eased; }
  if (effect === "pan-right") { scale = 1.13; translateX = width * 0.12 * eased; }
  if (effect === "fade") { scale = 1.05; opacity = Math.min(1, boundedProgress * 3); }
  if (effect === "shake") { scale = 1.08; translateX = Math.sin(boundedProgress * Math.PI * 20) * width * 0.012 * (1 - boundedProgress); translateY = Math.cos(boundedProgress * Math.PI * 16) * height * 0.008 * (1 - boundedProgress); rotation = Math.sin(boundedProgress * Math.PI * 12) * 0.018 * (1 - boundedProgress); }
  if (effect === "pulse") scale = 1.06 + (Math.sin(boundedProgress * Math.PI * 4) * 0.025);
  return { scale, translateX, translateY, opacity, rotation };
}

function drawMotionFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, progress: number, effect: MotionEffect, layers: MotionLayer[]) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const base = effectTransform(progress, effect, width, height);
  const renderedWidth = image.naturalWidth * baseScale * base.scale;
  const renderedHeight = image.naturalHeight * baseScale * base.scale;
  const baseX = (width - renderedWidth) / 2 + base.translateX;
  const baseY = (height - renderedHeight) / 2 + base.translateY;
  const imageScale = baseScale * base.scale;

  context.save();
  context.fillStyle = "#080b16";
  context.fillRect(0, 0, width, height);
  context.globalAlpha = base.opacity;
  context.drawImage(image, baseX, baseY, renderedWidth, renderedHeight);
  context.globalAlpha = 1;

  // Every layer re-renders the user-selected crop over the base image with its own transform.
  // This is intentionally local and browser-only: it does not upload or analyze the image remotely.
  layers.forEach(layer => {
    const sourceX = bounded(layer.x, 0, 1) * image.naturalWidth;
    const sourceY = bounded(layer.y, 0, 1) * image.naturalHeight;
    const sourceWidth = bounded(layer.width, 0.02, 1) * image.naturalWidth;
    const sourceHeight = bounded(layer.height, 0.02, 1) * image.naturalHeight;
    const destinationWidth = sourceWidth * imageScale;
    const destinationHeight = sourceHeight * imageScale;
    const destinationX = baseX + (sourceX * imageScale);
    const destinationY = baseY + (sourceY * imageScale);
    const local = effectTransform(progress, layer.effect, destinationWidth, destinationHeight);
    context.save();
    context.globalAlpha = local.opacity;
    context.translate(destinationX + (destinationWidth / 2) + local.translateX, destinationY + (destinationHeight / 2) + local.translateY);
    context.rotate(local.rotation);
    context.scale(local.scale, local.scale);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, -destinationWidth / 2, -destinationHeight / 2, destinationWidth, destinationHeight);
    context.restore();
  });

  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, "rgba(7, 10, 25, 0.08)");
  shade.addColorStop(0.7, "rgba(7, 10, 25, 0)");
  shade.addColorStop(1, "rgba(7, 10, 25, 0.32)");
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = url;
  });
}

function selectionFromPoints(start: { x: number; y: number }, end: { x: number; y: number }): Selection {
  const x = bounded(Math.min(start.x, end.x), 0, 1);
  const y = bounded(Math.min(start.y, end.y), 0, 1);
  return { x, y, width: bounded(Math.abs(end.x - start.x), 0, 1 - x), height: bounded(Math.abs(end.y - start.y), 0, 1 - y) };
}

export function LocalMotionStudio({ imageUrl, sourceFilename, isArabic, disabled = false, onExport }: LocalMotionStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [effect, setEffect] = useState<MotionEffect>("zoom-in");
  const [duration, setDuration] = useState<3 | 5>(3);
  const [layers, setLayers] = useState<MotionLayer[]>([]);
  const [draftSelection, setDraftSelection] = useState<Selection | null>(null);
  const [draftEffect, setDraftEffect] = useState<MotionEffect>("pulse");
  const [draftName, setDraftName] = useState("");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState("");
  const copy = useCallback((ar: string, en: string) => isArabic ? ar : en, [isArabic]);

  const stopFrame = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const renderPreview = useCallback(async () => {
    stopFrame();
    setError("");
    try {
      const image = await loadImage(imageUrl);
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const start = performance.now();
      setIsPreviewing(true);
      const animate = (now: number) => {
        const progress = ((now - start) % (duration * 1000)) / (duration * 1000);
        drawMotionFrame(context, image, progress, effect, layers);
        frameRef.current = requestAnimationFrame(animate);
      };
      frameRef.current = requestAnimationFrame(animate);
    } catch {
      setError(copy("تعذر تحميل الصورة للمعاينة. تأكد من أن الصورة ما زالت متاحة في المعرض.", "The image could not be loaded for preview. Confirm it is still available in the gallery."));
      setIsPreviewing(false);
    }
  }, [copy, duration, effect, imageUrl, layers, stopFrame]);

  useEffect(() => {
    void renderPreview();
    return stopFrame;
  }, [renderPreview, stopFrame]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: bounded((event.clientX - bounds.left) / bounds.width, 0, 1), y: bounded((event.clientY - bounds.top) / bounds.height, 0, 1) };
  };

  const beginSelection = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (isRendering) return;
    const point = pointFromEvent(event);
    dragStartRef.current = point;
    setDraftSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateSelection = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current) return;
    setDraftSelection(selectionFromPoints(dragStartRef.current, pointFromEvent(event)));
  };

  const finishSelection = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current) return;
    const selection = selectionFromPoints(dragStartRef.current, pointFromEvent(event));
    dragStartRef.current = null;
    if (selection.width < 0.04 || selection.height < 0.04) {
      setDraftSelection(null);
      setError(copy("ارسم إطارًا أكبر قليلًا حول العنصر الذي تريد تحريكه.", "Draw a slightly larger frame around the element you want to animate."));
      return;
    }
    setDraftSelection(selection);
    setDraftName(copy(`عنصر ${layers.length + 1}`, `Element ${layers.length + 1}`));
  };

  const addLayer = () => {
    if (!draftSelection) return;
    const id = `motion-layer-${Date.now()}-${layers.length}`;
    setLayers(current => [...current, { ...draftSelection, id, name: draftName.trim() || copy(`عنصر ${current.length + 1}`, `Element ${current.length + 1}`), effect: draftEffect }]);
    setSelectedLayerId(id);
    setDraftSelection(null);
    setDraftName("");
    setError("");
  };

  const updateLayer = (id: string, update: Partial<Pick<MotionLayer, "name" | "effect">>) => {
    setLayers(current => current.map(layer => layer.id === id ? { ...layer, ...update } : layer));
  };

  const exportVideo = async () => {
    setError("");
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      setError(copy("متصفحك لا يدعم تصدير فيديو محليًا. افتح الأداة بمتصفح حديث مثل Chrome أو Edge.", "Your browser cannot export a local video. Open this tool in a current Chrome or Edge browser."));
      return;
    }
    setIsRendering(true);
    stopFrame();
    try {
      const image = await loadImage(imageUrl);
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) throw new Error("Canvas unavailable");
      const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(candidate => MediaRecorder.isTypeSupported(candidate)) ?? "video/webm";
      const chunks: BlobPart[] = [];
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000 });
      const finished = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error("Recorder failed"));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      const startedAt = performance.now();
      const renderExportFrame = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / (duration * 1000));
        drawMotionFrame(context, image, progress, effect, layers);
        if (progress < 1) frameRef.current = requestAnimationFrame(renderExportFrame);
        else recorder.stop();
      };
      recorder.start(250);
      frameRef.current = requestAnimationFrame(renderExportFrame);
      const blob = await finished;
      stream.getTracks().forEach(track => track.stop());
      if (!blob.size) throw new Error("Empty video");
      const safeStem = sourceFilename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "motion";
      await onExport(new File([blob], `${safeStem}-motion.webm`, { type: mimeType }));
      void renderPreview();
    } catch {
      setError(copy("تعذر تصدير مقطع الحركة محليًا. جرّب صورة أخرى أو أعد المحاولة بمتصفح حديث.", "The motion clip could not be exported locally. Try another image or retry in a current browser."));
      void renderPreview();
    } finally {
      setIsRendering(false);
    }
  };

  return <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3" aria-label={copy("استوديو الحركة المحلي", "Local motion studio")}>
    <div><h4 className="font-semibold text-emerald-950">{copy("استوديو حركة العناصر", "Element Motion Studio")}</h4><p className="mt-1 text-xs leading-5 text-emerald-900">{copy("ارسم إطارًا حول أي عنصر ظاهر في الصورة، ثم اختر حركة مستقلة له. تُركّب الطبقات وتُصدّر داخل المتصفح فقط من دون رفع الصورة إلى خدمة فيديو خارجية.", "Draw a frame around any visible image element, assign it an independent motion, and export the layered result entirely in the browser without uploading the image to an external video service.")}</p></div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
      <div className="relative mx-auto w-full max-w-[220px]">
        <canvas ref={canvasRef} width={outputWidth} height={outputHeight} className="aspect-[9/16] w-full touch-none rounded-lg border border-emerald-200 bg-slate-950 object-cover shadow-sm" onPointerDown={beginSelection} onPointerMove={updateSelection} onPointerUp={finishSelection} onPointerCancel={finishSelection} />
        <div className="pointer-events-none absolute inset-0">
          {layers.map((layer, index) => <div key={layer.id} className={cn("absolute border-2 border-amber-300 bg-amber-300/10", selectedLayerId === layer.id && "border-violet-400 bg-violet-400/15")} style={{ left: `${layer.x * 100}%`, top: `${layer.y * 100}%`, width: `${layer.width * 100}%`, height: `${layer.height * 100}%` }}><span className="absolute -top-5 start-0 rounded bg-slate-950/85 px-1 text-[9px] font-semibold text-white">{index + 1}</span></div>)}
          {draftSelection ? <div className="absolute border-2 border-dashed border-white bg-white/10" style={{ left: `${draftSelection.x * 100}%`, top: `${draftSelection.y * 100}%`, width: `${draftSelection.width * 100}%`, height: `${draftSelection.height * 100}%` }} /> : null}
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-white/70 p-3">
        <div className="flex items-start gap-2 text-xs text-emerald-950"><MousePointer2 className="mt-0.5 h-4 w-4 shrink-0" /><p>{copy("حدد العنصر: اضغط واسحب فوق العنصر داخل المعاينة. بعد رسم الإطار أضفه كطبقة واختر حركة له.", "Select an element: press and drag over it in the preview. Then add it as a layer and choose its motion.")}</p></div>
        {draftSelection ? <div className="space-y-2 rounded-md border border-violet-200 bg-violet-50 p-2"><Label>{copy("العنصر المحدد", "Selected element")}</Label><Input value={draftName} onChange={event => setDraftName(event.target.value)} placeholder={copy("مثال: الشخصية الرئيسية", "Example: Main character")} /><select className="editor-select" value={draftEffect} onChange={event => setDraftEffect(event.target.value as MotionEffect)}>{effects.map(option => <option key={option.id} value={option.id}>{isArabic ? option.ar : option.en}</option>)}</select><Button type="button" size="sm" className="w-full bg-violet-700 hover:bg-violet-800" onClick={addLayer}><Plus className="h-4 w-4" />{copy("إضافة طبقة حركة", "Add motion layer")}</Button></div> : null}
        <div className="space-y-2"><div className="flex items-center justify-between"><Label>{copy("طبقات العناصر", "Element layers")}</Label><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{layers.length}</span></div>{layers.length ? <div className="max-h-44 space-y-2 overflow-y-auto pe-1">{layers.map((layer, index) => <div key={layer.id} className={cn("rounded-md border p-2", selectedLayerId === layer.id ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white")}><div className="mb-2 flex items-center justify-between gap-2"><button type="button" className="min-w-0 truncate text-start text-xs font-semibold text-slate-800" onClick={() => setSelectedLayerId(layer.id)}>{index + 1}. {layer.name}</button><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-rose-700" onClick={() => { setLayers(current => current.filter(item => item.id !== layer.id)); if (selectedLayerId === layer.id) setSelectedLayerId(null); }} aria-label={copy("حذف طبقة الحركة", "Delete motion layer")}><Trash2 className="h-3.5 w-3.5" /></Button></div><select className="editor-select text-xs" value={layer.effect} onChange={event => updateLayer(layer.id, { effect: event.target.value as MotionEffect })}>{effects.map(option => <option key={option.id} value={option.id}>{isArabic ? option.ar : option.en}</option>)}</select></div>)}</div> : <p className="text-xs text-slate-500">{copy("لم تُضف طبقات بعد. يمكنك تصدير حركة الكاميرا فقط أو تحديد عنصر الآن.", "No layers yet. You can export camera-only motion or select an element now.")}</p>}</div>
      </div>
    </div>
    <div className="space-y-2"><Label>{copy("حركة الكاميرا والخلفية", "Camera and background motion")}</Label><div className="grid grid-cols-2 gap-2">{effects.map(option => <Button type="button" key={option.id} size="sm" variant={effect === option.id ? "default" : "outline"} className={cn("justify-start text-xs", effect === option.id && "bg-emerald-700 hover:bg-emerald-800")} onClick={() => setEffect(option.id)}>{isArabic ? option.ar : option.en}</Button>)}</div></div>
    <div className="flex flex-wrap items-center gap-2"><Label>{copy("المدة", "Duration")}</Label><Button type="button" size="sm" variant={duration === 3 ? "default" : "outline"} onClick={() => setDuration(3)}>3s</Button><Button type="button" size="sm" variant={duration === 5 ? "default" : "outline"} onClick={() => setDuration(5)}>5s</Button><Button type="button" size="sm" variant="ghost" onClick={() => void renderPreview()}><Play className="h-4 w-4" />{copy("إعادة المعاينة", "Restart preview")}</Button></div>
    <Button type="button" size="sm" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={disabled || isRendering} onClick={() => void exportVideo()}>{isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}{isRendering ? copy("يُصدّر المقطع محليًا…", "Exporting locally…") : copy("تصدير وحفظ فيديو الحركة", "Export and save motion video")}</Button>
    {isPreviewing ? <p className="flex items-center gap-1 text-[11px] text-emerald-800"><Layers3 className="h-3 w-3" />{copy("معاينة الحركة والطبقات تعمل الآن.", "The motion and layers preview is playing.")}</p> : null}
    {error ? <p role="alert" className="text-xs text-rose-700">{error}</p> : null}
  </section>;
}
