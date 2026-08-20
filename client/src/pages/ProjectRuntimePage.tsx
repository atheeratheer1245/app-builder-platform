import { AppShell } from "@/components/AppShell";
import { WorkspaceAccess } from "@/components/WorkspaceAccess";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CircleAlert, FileAudio, Heart, Image as ImageIcon, Layers3, Loader2, RotateCcw, Search, ShoppingBag, Trophy, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(properties: Record<string, unknown>, key: string, fallback = "") { const value = properties[key]; return typeof value === "string" && value.trim() ? value : fallback; }
function items(properties: Record<string, unknown>) { return Array.isArray(properties.items) ? properties.items.map(asRecord) : []; }
function numberValue(properties: Record<string, unknown>, key: string, fallback: number) { const value = properties[key]; return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function bounded(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

type RuntimeComponent = { id: number; componentType: string; labelAr: string; labelEn: string; properties: unknown };
type RuntimePage = { id: number; titleAr: string; titleEn: string; route: string };

function PlatformerRuntime({ components, pages, onNavigate, isArabic }: { components: RuntimeComponent[]; pages: RuntimePage[]; onNavigate: (pageId: number) => void; isArabic: boolean }) {
  const scene = asRecord(components.find(component => component.componentType === "GameScene")?.properties);
  const playerSettings = asRecord(components.find(component => component.componentType === "Player")?.properties);
  const platformSettings = components.filter(component => component.componentType === "Platform").map(component => asRecord(component.properties));
  const hazardSettings = components.filter(component => component.componentType === "Hazard").map(component => asRecord(component.properties));
  const finishSettings = asRecord(components.find(component => component.componentType === "FinishGate")?.properties);
  const controls = asRecord(components.find(component => component.componentType === "TouchControls")?.properties);
  const scoreSettings = asRecord(components.find(component => component.componentType === "Score")?.properties);
  const duration = Math.max(10, numberValue(scene, "durationSeconds", 90));
  const startingX = bounded(numberValue(playerSettings, "startX", 8), 0, 96);
  const playerSpeed = Math.max(2, numberValue(playerSettings, "speed", 6));
  const initialLives = Math.max(1, Math.round(numberValue(playerSettings, "lives", 3)));
  const initialScore = numberValue(scoreSettings, "startScore", 0);
  const requiredScore = Math.max(0, numberValue(finishSettings, "requiredScore", 30));
  const gateX = bounded(numberValue(finishSettings, "x", 88), 0, 96);
  const gateY = bounded(numberValue(finishSettings, "y", 58), 0, 90);
  const collectiblePoints = useMemo(() => components.filter(component => component.componentType === "Collectible").flatMap(component => {
    const props = asRecord(component.properties);
    const amount = bounded(Math.round(numberValue(props, "amount", 3)), 1, 50);
    const startX = bounded(numberValue(props, "x", 48), 2, 96);
    const y = bounded(numberValue(props, "y", 58), 4, 90);
    const value = Math.max(1, numberValue(props, "value", numberValue(scoreSettings, "pointsPerCollectible", 10)));
    return Array.from({ length: amount }, (_, index) => ({ id: `${component.id}-${index}`, x: bounded(startX + index * 7, 2, 96), y, value }));
  }), [components, scoreSettings]);
  const [playerX, setPlayerX] = useState(startingX);
  const [playerY, setPlayerY] = useState(bounded(numberValue(playerSettings, "startY", 64), 4, 90));
  const [lives, setLives] = useState(initialLives);
  const [score, setScore] = useState(initialScore);
  const [collected, setCollected] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const successPageId = typeof finishSettings.successPageId === "number" ? finishSettings.successPageId : null;
  const reset = () => { setPlayerX(startingX); setPlayerY(bounded(numberValue(playerSettings, "startY", 64), 4, 90)); setLives(initialLives); setScore(initialScore); setCollected([]); setSecondsLeft(duration); setStatus("playing"); };

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => setSecondsLeft(current => {
      if (current <= 1) { setStatus("lost"); return 0; }
      return current - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  function move(delta: number) {
    if (status !== "playing") return;
    const nextX = bounded(playerX + delta, 2, 96);
    const hit = hazardSettings.some(hazard => {
      const hazardX = bounded(numberValue(hazard, "x", 70), 0, 100);
      const hazardWidth = Math.max(2, numberValue(hazard, "width", 10));
      return nextX >= hazardX - 4 && nextX <= hazardX + hazardWidth;
    });
    if (hit) {
      const damage = Math.max(1, ...hazardSettings.map(hazard => numberValue(hazard, "damage", 1)));
      const nextLives = lives - damage;
      setLives(nextLives);
      if (nextLives <= 0) { setStatus("lost"); return; }
      setPlayerX(startingX);
      return;
    }
    const newlyCollected = collectiblePoints.filter(item => !collected.includes(item.id) && Math.abs(nextX - item.x) < 5 && Math.abs(playerY - item.y) < 20);
    const nextScore = score + newlyCollected.reduce((sum, item) => sum + item.value, 0);
    if (newlyCollected.length) { setCollected(previous => [...previous, ...newlyCollected.map(item => item.id)]); setScore(nextScore); }
    setPlayerX(nextX);
    if (nextX >= gateX - 5 && nextScore >= requiredScore) setStatus("won");
  }

  function jump() {
    if (status !== "playing") return;
    setPlayerY(42);
    window.setTimeout(() => setPlayerY(bounded(numberValue(playerSettings, "startY", 64), 4, 90)), 430);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "a", "A"].includes(event.key)) { event.preventDefault(); move(-playerSpeed); }
      if (["ArrowRight", "d", "D"].includes(event.key)) { event.preventDefault(); move(playerSpeed); }
      if (["ArrowUp", " "].includes(event.key)) { event.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white"><span>{isArabic ? `النقاط: ${score}` : `Score: ${score}`}</span><span className="flex items-center gap-1 text-rose-200"><Heart className="h-3.5 w-3.5 fill-current" />{lives}</span><span>{isArabic ? `الوقت: ${secondsLeft}` : `Time: ${secondsLeft}`}</span></div><div className="relative h-80 overflow-hidden rounded-[1.6rem] border-4 border-indigo-950 bg-gradient-to-b from-sky-300 via-indigo-200 to-emerald-100 shadow-inner" role="application" aria-label={isArabic ? "لعبة منصات قابلة للعب" : "Playable platform game"}>{platformSettings.map((platform, index) => <div key={`platform-${index}`} className={cn("absolute rounded-xl border-b-4 border-emerald-800 bg-emerald-500 shadow", platform.moving === true && "animate-pulse")} style={{ left: `${bounded(numberValue(platform, "x", 8), 0, 100)}%`, top: `${bounded(numberValue(platform, "y", 78), 0, 96)}%`, width: `${bounded(numberValue(platform, "width", 84), 4, 100)}%`, height: `${bounded(numberValue(platform, "height", 10), 2, 40)}%` }} />)}{collectiblePoints.map(item => !collected.includes(item.id) && <button key={item.id} type="button" onClick={() => move(item.x - playerX)} className="absolute grid h-7 w-7 place-items-center rounded-full border-2 border-amber-100 bg-amber-400 text-xs shadow-lg" style={{ left: `${item.x}%`, top: `${item.y}%` }} aria-label={isArabic ? "جمع عنصر" : "Collect item"}>◆</button>)}{hazardSettings.map((hazard, index) => <div key={`hazard-${index}`} className="absolute h-7 bg-gradient-to-t from-rose-700 to-rose-400 [clip-path:polygon(0_100%,25%_0,50%_100%,75%_0,100%_100%)]" style={{ left: `${bounded(numberValue(hazard, "x", 70), 0, 100)}%`, top: `${bounded(numberValue(hazard, "y", 70), 0, 90)}%`, width: `${bounded(numberValue(hazard, "width", 10), 2, 40)}%` }} />)}<div className={cn("absolute grid h-12 w-9 place-items-center rounded-t-xl border-2", score >= requiredScore ? "border-emerald-200 bg-emerald-600 text-white" : "border-slate-300 bg-slate-500 text-slate-200")} style={{ left: `${gateX}%`, top: `${gateY}%` }} title={score >= requiredScore ? (isArabic ? "البوابة مفتوحة" : "Gate open") : (isArabic ? `تحتاج ${requiredScore} نقطة` : `Need ${requiredScore} points`)}>▣</div><div className="absolute grid h-10 w-8 place-items-center rounded-xl border-2 border-white bg-indigo-700 text-sm font-black text-white shadow-lg transition-transform" style={{ left: `${playerX}%`, top: `${playerY}%` }}>▲</div>{status !== "playing" && <div className="absolute inset-0 grid place-items-center bg-slate-950/70 p-5 text-center"><div className="w-full rounded-3xl bg-white p-5 shadow-2xl">{status === "won" ? <><Trophy className="mx-auto h-9 w-9 text-amber-500" /><strong className="mt-2 block text-lg text-slate-950">{isArabic ? "أكملت المرحلة" : "Level complete"}</strong><p className="mt-1 text-sm text-slate-600">{isArabic ? `النتيجة: ${score}` : `Score: ${score}`}</p>{successPageId && <Button className="mt-4 w-full" onClick={() => onNavigate(successPageId)}>{isArabic ? "تابع" : "Continue"}</Button>}</> : <><CircleAlert className="mx-auto h-9 w-9 text-rose-500" /><strong className="mt-2 block text-lg text-slate-950">{isArabic ? "انتهت المحاولة" : "Try again"}</strong><p className="mt-1 text-sm text-slate-600">{isArabic ? "انتهى الوقت أو نفدت المحاولات." : "Time expired or lives ran out."}</p></>}<Button variant="outline" className="mt-3 w-full" onClick={reset}><RotateCcw className="h-4 w-4" />{isArabic ? "إعادة المرحلة" : "Restart level"}</Button></div></div>}</div><div className="flex items-end justify-between gap-3 rounded-2xl bg-slate-100 p-3">{controls.showDirections !== false && <div className="flex gap-2"><Button type="button" size="icon" variant="outline" onClick={() => move(isArabic ? playerSpeed : -playerSpeed)} aria-label={isArabic ? "تحرك يمينًا" : "Move left"}>{isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}</Button><Button type="button" size="icon" variant="outline" onClick={() => move(isArabic ? -playerSpeed : playerSpeed)} aria-label={isArabic ? "تحرك يسارًا" : "Move right"}>{isArabic ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button></div>}{controls.showJump !== false && <Button type="button" onClick={jump} className="bg-violet-600 text-white hover:bg-violet-700">{isArabic ? "اقفز" : "Jump"}</Button>}</div><p className="text-center text-xs text-slate-500">{isArabic ? `اجمع ${requiredScore} نقطة ثم اقترب من البوابة. يمكنك استخدام اللمس أو مفاتيح الأسهم.` : `Collect ${requiredScore} points, then reach the gate. Use touch controls or arrow keys.`}</p></div>;
}

function ProjectScreen({ components, pages, activePageId, onNavigate, isArabic }: { components: RuntimeComponent[]; pages: RuntimePage[]; activePageId: number; onNavigate: (pageId: number) => void; isArabic: boolean }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<number | null>(null);
  const currentComponents = components.filter(component => component.componentType === "SearchBar" || !query.trim() || `${component.labelAr} ${component.labelEn} ${text(asRecord(component.properties), "titleAr")} ${text(asRecord(component.properties), "titleEn")} ${text(asRecord(component.properties), "nameAr")} ${text(asRecord(component.properties), "nameEn")} ${text(asRecord(component.properties), "descriptionAr")} ${text(asRecord(component.properties), "descriptionEn")}`.toLocaleLowerCase(isArabic ? "ar" : "en").includes(query.trim().toLocaleLowerCase(isArabic ? "ar" : "en")));
  const pageTitle = (id: unknown) => pages.find(page => page.id === id)?.[isArabic ? "titleAr" : "titleEn"];
  const searchConfiguration = components.find(component => component.componentType === "SearchBar");
  const searchProps = asRecord(searchConfiguration?.properties);

  if (components.some(component => component.componentType === "GameScene") && components.some(component => component.componentType === "Player")) return <PlatformerRuntime components={components} pages={pages} onNavigate={onNavigate} isArabic={isArabic} />;

  if (!components.length) return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500"><Layers3 className="mx-auto mb-3 h-8 w-8 text-indigo-400" /><strong className="block text-slate-800">{isArabic ? "هذه الصفحة فارغة" : "This page is empty"}</strong><p className="mt-1 text-sm">{isArabic ? "ارجع إلى المحرر وأضف صورًا أو فيديو أو صوتًا أو أزرارًا أو قائمة." : "Return to the editor and add images, video, audio, buttons, or a list."}</p></div>;

  return <div className="space-y-4">{currentComponents.map(component => {
    const props = asRecord(component.properties);
    const label = (isArabic ? component.labelAr : component.labelEn) || component.componentType;
    if (component.componentType === "SearchBar") return <div key={component.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><Search className="h-5 w-5 text-slate-400" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text(props, isArabic ? "placeholderAr" : "placeholderEn", isArabic ? "ابحث" : "Search")} />{query && <button type="button" onClick={() => setQuery("")} aria-label={isArabic ? "مسح البحث" : "Clear search"}><X className="h-4 w-4 text-slate-400" /></button>}</div>;
    if (component.componentType === "Image") return <figure key={component.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{text(props, "assetUrl") ? <img className="max-h-[28rem] w-full object-cover" src={text(props, "assetUrl")} alt={text(props, isArabic ? "altAr" : "altEn", label)} /> : <div className="flex aspect-[16/8] items-center justify-center bg-slate-100 text-slate-400"><ImageIcon /></div>}<figcaption className="px-4 py-3 text-sm text-slate-600">{text(props, isArabic ? "altAr" : "altEn", label)}</figcaption></figure>;
    if (component.componentType === "Video") return <figure key={component.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{text(props, "assetUrl") ? <video className="w-full bg-black" controls preload="metadata" src={text(props, "assetUrl")} /> : <div className="flex aspect-video items-center justify-center bg-slate-900 text-slate-300"><Video /></div>}<figcaption className="px-4 py-3 text-sm text-slate-600">{text(props, isArabic ? "captionAr" : "captionEn", label)}</figcaption></figure>;
    if (component.componentType === "Audio") return <figure key={component.id} className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5"><div className="mb-3 flex items-center gap-3"><span className="rounded-2xl bg-indigo-600 p-3 text-white"><FileAudio className="h-5 w-5" /></span><strong className="text-slate-900">{text(props, isArabic ? "captionAr" : "captionEn", label)}</strong></div>{text(props, "assetUrl") ? <audio className="w-full" controls preload="metadata" src={text(props, "assetUrl")} /> : <p className="text-sm text-slate-500">{isArabic ? "لم يُحدد ملف صوتي بعد." : "No audio attachment selected yet."}</p>}</figure>;
    if (component.componentType === "Button") { const target = typeof props.targetPageId === "number" ? props.targetPageId : null; return <button key={component.id} type="button" onClick={() => target && onNavigate(target)} disabled={!target} className={cn("flex w-full items-center justify-between rounded-2xl px-5 py-4 text-start font-bold shadow-sm transition active:scale-[0.98]", target ? "bg-gradient-to-l from-indigo-600 to-violet-600 text-white" : "cursor-not-allowed bg-slate-200 text-slate-500")}>{text(props, isArabic ? "textAr" : "textEn", label)}{target ? <span className="flex items-center gap-2 text-xs font-medium text-white/80">{pageTitle(target)}{isArabic ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</span> : <span className="text-xs">{isArabic ? "اختر صفحة الربط" : "Choose link page"}</span>}</button>; }
    if (component.componentType === "List") { const listItems = items(props); const title = text(props, isArabic ? "titleAr" : "titleEn", label); return <nav key={component.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{title && <div className="border-b border-slate-100 px-5 py-4"><strong className="text-slate-900">{title}</strong></div>}{listItems.length ? listItems.map((item, index) => { const target = typeof item.targetPageId === "number" ? item.targetPageId : null; return <button type="button" key={`${component.id}-${index}`} onClick={() => target && onNavigate(target)} disabled={!target} className="flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-start text-sm font-semibold text-slate-700 last:border-0 disabled:cursor-not-allowed disabled:text-slate-400">{text(item, isArabic ? "labelAr" : "labelEn", isArabic ? "زر قائمة" : "List button")}{isArabic ? <ChevronLeft className="h-4 w-4 text-indigo-500" /> : <ChevronRight className="h-4 w-4 text-indigo-500" />}</button>; }) : <p className="px-5 py-4 text-sm text-slate-500">{isArabic ? "لا توجد أزرار داخل هذه القائمة بعد." : "This list has no buttons yet."}</p>}</nav>; }
    if (component.componentType === "Product") { const price = typeof props.price === "number" ? props.price : 0; const salePrice = typeof props.salePrice === "number" ? props.salePrice : null; const currency = text(props, "currency", "SAR"); return <article key={component.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{text(props, "assetUrl") ? <img src={text(props, "assetUrl")} className="h-48 w-full object-cover" alt="" /> : <div className="flex h-40 items-center justify-center bg-slate-100 text-slate-400"><ShoppingBag /></div>}<div className="p-5"><strong className="text-lg text-slate-900">{text(props, isArabic ? "nameAr" : "nameEn", label)}</strong><p className="mt-1 text-sm leading-6 text-slate-600">{text(props, isArabic ? "descriptionAr" : "descriptionEn")}</p><div className="mt-4 flex items-end justify-between"><div>{salePrice !== null ? <><del className="mr-2 text-sm text-slate-400">{price} {currency}</del><strong className="text-indigo-700">{salePrice} {currency}</strong></> : <strong className="text-indigo-700">{price} {currency}</strong>}</div><span className="text-xs text-slate-500">{isArabic ? `المخزون: ${typeof props.stock === "number" ? props.stock : 0}` : `Stock: ${typeof props.stock === "number" ? props.stock : 0}`}</span></div></div></article>; }
    if (component.componentType === "Card") { const target = typeof props.actionPageId === "number" ? props.actionPageId : null; return <article key={component.id} onClick={() => target && onNavigate(target)} className={cn("rounded-3xl border border-slate-200 bg-white p-5 shadow-sm", target && "cursor-pointer transition hover:border-indigo-300")}>{text(props, isArabic ? "titleAr" : "titleEn", label) && <strong className="block text-lg text-slate-900">{text(props, isArabic ? "titleAr" : "titleEn", label)}</strong>}<p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{text(props, isArabic ? "descriptionAr" : "descriptionEn", isArabic ? "أضف المحتوى من المحرر." : "Add content from the editor.")}</p>{target && <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">{isArabic ? "فتح الصفحة" : "Open page"}{isArabic ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}</span>}</article>; }
    if (component.componentType === "Form") { const fields = Array.isArray(props.fields) ? props.fields.map(asRecord) : []; return <form key={component.id} onSubmit={event => { event.preventDefault(); setSubmitted(component.id); }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><strong className="text-slate-900">{label}</strong><p className="mt-1 text-sm text-slate-500">{isArabic ? "نموذج مخصص لهذه الصفحة" : "A form tailored to this page"}</p></div><div className="space-y-3">{fields.map((field, index) => <input key={`${component.id}-${index}`} required={field.required === true} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder={text(field, isArabic ? "ar" : "en", isArabic ? "حقل" : "Field")} type={text(field, "type", "text")} />)}</div><Button type="submit" className="mt-4 w-full">{text(props, isArabic ? "submitLabelAr" : "submitLabelEn", isArabic ? "إرسال" : "Submit")}</Button>{submitted === component.id && <p className="mt-3 text-sm font-medium text-emerald-700">{isArabic ? "تم تسجيل النموذج في المعاينة." : "The form was recorded in this preview."}</p>}</form>; }
    return <div key={component.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><strong className="block text-slate-900">{label}</strong><span className="mt-1 block">{isArabic ? "يظهر هذا المكون في التطبيق بعد إعداد خصائصه." : "This component appears in the app after its properties are configured."}</span></div>;
  })}{query.trim() && currentComponents.filter(component => component.componentType !== "SearchBar").length === 0 && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{text(searchProps, isArabic ? "emptyAr" : "emptyEn", isArabic ? "لا توجد نتائج مطابقة." : "No matching results.")}</div>}</div>;
}

export default function ProjectRuntimePage() {
  const { copy, isArabic } = useLocale();
  const [, params] = useRoute("/run/:id");
  const projectId = Number(params?.id);
  const workspace = trpc.appBuilder.projects.getWorkspace.useQuery(projectId, { enabled: Number.isFinite(projectId), retry: false });
  const [activePageId, setActivePageId] = useState<number | null>(null);
  const pages = workspace.data?.pages ?? [];
  useEffect(() => { if (!activePageId && pages[0]) setActivePageId(pages[0].id); }, [activePageId, pages]);
  const activePage = useMemo(() => pages.find(page => page.id === activePageId) ?? pages[0], [pages, activePageId]);
  const components = workspace.data?.components.filter(component => component.pageId === activePage?.id) ?? [];
  const Arrow = isArabic ? ArrowRight : ArrowLeft;

  return <AppShell><WorkspaceAccess>{workspace.isLoading ? <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div> : !workspace.data || !activePage ? <div className="mx-auto max-w-xl py-20 text-center"><CircleAlert className="mx-auto mb-4 h-10 w-10 text-amber-500" /><h1 className="text-2xl font-bold text-slate-900">{copy("تعذر فتح التطبيق", "Unable to open app")}</h1><p className="mt-2 text-slate-600">{copy("تأكد من وجود المشروع في حسابك ثم أعد المحاولة.", "Confirm the project belongs to your account, then try again.")}</p></div> : <main className="mx-auto max-w-5xl px-4 py-7 md:px-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><Link href={`/editor/${projectId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><Arrow className="h-4 w-4" />{copy("العودة إلى المحرر", "Back to editor")}</Link><p className="mt-3 text-xs font-bold tracking-[0.16em] text-indigo-500">{copy("وضع تشغيل التطبيق", "APP RUN MODE")}</p><h1 className="mt-1 text-2xl font-black text-slate-950">{workspace.data.project.name}</h1></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{copy("تفاعل حقيقي", "Live interactions")}</span></div><div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]"><aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"><p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">{copy("شاشات التطبيق", "App screens")}</p><nav className="space-y-1">{pages.map(page => <button type="button" key={page.id} onClick={() => setActivePageId(page.id)} className={cn("w-full rounded-2xl px-3 py-3 text-start text-sm font-semibold transition", page.id === activePage.id ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-50")}>{isArabic ? page.titleAr : page.titleEn}</button>)}</nav></aside><section className="min-w-0 rounded-[2rem] border border-slate-200 bg-slate-50 p-3 shadow-sm md:p-5"><div className="mx-auto max-w-md overflow-hidden rounded-[2.4rem] border-[8px] border-slate-900 bg-white shadow-2xl"><div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-xs text-white/80"><span>{workspace.data.project.name}</span><span>•••</span></div><div className="min-h-[36rem] bg-slate-50 p-4"><h2 className="mb-4 text-xl font-black text-slate-950">{isArabic ? activePage.titleAr : activePage.titleEn}</h2><ProjectScreen components={components as RuntimeComponent[]} pages={pages} activePageId={activePage.id} onNavigate={setActivePageId} isArabic={isArabic} /></div></div></section></div></main>}</WorkspaceAccess></AppShell>;
}
