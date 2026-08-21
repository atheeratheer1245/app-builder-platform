import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Play, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type MotionEffect = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "fade" | "shake" | "pulse";

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

function drawMotionFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, progress: number, effect: MotionEffect) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const bounded = Math.max(0, Math.min(1, progress));
  const eased = bounded * bounded * (3 - 2 * bounded);
  let scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  let translateX = 0;
  let translateY = 0;
  let opacity = 1;
  if (effect === "zoom-in") scale *= 1 + (0.18 * eased);
  if (effect === "zoom-out") scale *= 1.18 - (0.18 * eased);
  if (effect === "pan-left") { scale *= 1.13; translateX = -width * 0.12 * eased; }
  if (effect === "pan-right") { scale *= 1.13; translateX = width * 0.12 * eased; }
  if (effect === "fade") { scale *= 1.05; opacity = Math.min(1, bounded * 3); }
  if (effect === "shake") { scale *= 1.08; translateX = Math.sin(bounded * Math.PI * 20) * width * 0.012 * (1 - bounded); translateY = Math.cos(bounded * Math.PI * 16) * height * 0.008 * (1 - bounded); }
  if (effect === "pulse") scale *= 1.06 + (Math.sin(bounded * Math.PI * 4) * 0.025);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  context.save();
  context.fillStyle = "#080b16";
  context.fillRect(0, 0, width, height);
  context.globalAlpha = opacity;
  context.drawImage(image, (width - renderedWidth) / 2 + translateX, (height - renderedHeight) / 2 + translateY, renderedWidth, renderedHeight);
  context.globalAlpha = 1;
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

export function LocalMotionStudio({ imageUrl, sourceFilename, isArabic, disabled = false, onExport }: LocalMotionStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [effect, setEffect] = useState<MotionEffect>("zoom-in");
  const [duration, setDuration] = useState<3 | 5>(3);
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
        drawMotionFrame(context, image, progress, effect);
        frameRef.current = requestAnimationFrame(animate);
      };
      frameRef.current = requestAnimationFrame(animate);
    } catch {
      setError(copy("تعذر تحميل الصورة للمعاينة. تأكد من أن الصورة ما زالت متاحة في المعرض.", "The image could not be loaded for preview. Confirm it is still available in the gallery."));
      setIsPreviewing(false);
    }
  }, [copy, duration, effect, imageUrl, stopFrame]);

  useEffect(() => {
    void renderPreview();
    return stopFrame;
  }, [renderPreview, stopFrame]);

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
        drawMotionFrame(context, image, progress, effect);
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
    <div><h4 className="font-semibold text-emerald-950">{copy("استوديو الحركة المحلي", "Local Motion Studio")}</h4><p className="mt-1 text-xs leading-5 text-emerald-900">{copy("ينشئ هذا المحرّك مقطع حركة من صورتك داخل المتصفح فقط، من دون إرسالها إلى مزود توليد فيديو خارجي.", "This studio creates a motion clip from your image entirely in the browser without sending it to an external video-generation provider.")}</p></div>
    <canvas ref={canvasRef} width={outputWidth} height={outputHeight} className="aspect-[9/16] w-full max-w-[220px] rounded-lg border border-emerald-200 bg-slate-950 object-cover shadow-sm" />
    <div className="space-y-2"><Label>{copy("نمط الحركة", "Motion effect")}</Label><div className="grid grid-cols-2 gap-2">{effects.map(option => <Button type="button" key={option.id} size="sm" variant={effect === option.id ? "default" : "outline"} className={cn("justify-start text-xs", effect === option.id && "bg-emerald-700 hover:bg-emerald-800")} onClick={() => setEffect(option.id)}>{isArabic ? option.ar : option.en}</Button>)}</div></div>
    <div className="flex flex-wrap items-center gap-2"><Label>{copy("المدة", "Duration")}</Label><Button type="button" size="sm" variant={duration === 3 ? "default" : "outline"} onClick={() => setDuration(3)}>3s</Button><Button type="button" size="sm" variant={duration === 5 ? "default" : "outline"} onClick={() => setDuration(5)}>5s</Button><Button type="button" size="sm" variant="ghost" onClick={() => void renderPreview()}><Play className="h-4 w-4" />{copy("إعادة المعاينة", "Restart preview")}</Button></div>
    <Button type="button" size="sm" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={disabled || isRendering} onClick={() => void exportVideo()}>{isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}{isRendering ? copy("يُصدّر المقطع محليًا…", "Exporting locally…") : copy("تصدير وحفظ فيديو الحركة", "Export and save motion video")}</Button>
    {isPreviewing ? <p className="text-[11px] text-emerald-800">{copy("معاينة الحركة تعمل الآن.", "Motion preview is playing.")}</p> : null}
    {error ? <p role="alert" className="text-xs text-rose-700">{error}</p> : null}
  </section>;
}
