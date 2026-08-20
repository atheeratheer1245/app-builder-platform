import { AppShell } from "@/components/AppShell";
import { WorkspaceAccess } from "@/components/WorkspaceAccess";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CircleAlert, CreditCard, FileAudio, FileText, Heart, Image as ImageIcon, Layers3, Loader2, RotateCcw, Search, ShoppingBag, Trophy, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(properties: Record<string, unknown>, key: string, fallback = "") { const value = properties[key]; return typeof value === "string" && value.trim() ? value : fallback; }
function items(properties: Record<string, unknown>) { return Array.isArray(properties.items) ? properties.items.map(asRecord) : []; }
function numberValue(properties: Record<string, unknown>, key: string, fallback: number) { const value = properties[key]; return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function bounded(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

type RuntimeComponent = { id: number; componentType: string; labelAr: string; labelEn: string; properties: unknown };
type RuntimePage = { id: number; titleAr: string; titleEn: string; route: string; configuration: unknown };

function PlatformerRuntime({ components, pages, onNavigate, isArabic }: { components: RuntimeComponent[]; pages: RuntimePage[]; onNavigate: (pageId: number) => void; isArabic: boolean }) {
  const scene = asRecord(components.find(component => component.componentType === "GameScene")?.properties);
  const playerSettings = asRecord(components.find(component => component.componentType === "Player")?.properties);
  const backgroundSettings = asRecord(components.find(component => component.componentType === "Background")?.properties);
  const backgroundType = text(backgroundSettings, "mediaType", "image");
  const backgroundUrl = text(backgroundSettings, "assetUrl");
  const backgroundOverlay = bounded(numberValue(backgroundSettings, "overlayOpacity", 0.72), 0, 0.95);
  const playerImageUrl = text(playerSettings, "imageAssetUrl");
  const playerVideoUrl = text(playerSettings, "videoAssetUrl");
  const playerAudioUrl = text(playerSettings, "audioAssetUrl");
  const playerZIndex = bounded(Math.round(numberValue(playerSettings, "layer", 30)), 0, 100);
  const platformSettings = components.filter(component => component.componentType === "Platform").map(component => asRecord(component.properties));
  const hazardSettings = components.filter(component => component.componentType === "Hazard").map(component => asRecord(component.properties));
  const finishSettings = asRecord(components.find(component => component.componentType === "FinishGate")?.properties);
  const finishZIndex = bounded(Math.round(numberValue(finishSettings, "layer", 25)), 0, 100);
  const controls = asRecord(components.find(component => component.componentType === "TouchControls")?.properties);
  const scoreSettings = asRecord(components.find(component => component.componentType === "Score")?.properties);
  const animations = useMemo(() => components.filter(component => component.componentType === "ImageAnimation").map(component => asRecord(component.properties)), [components]);
  const maxAnimationFps = Math.max(1, ...animations.map(animation => bounded(Math.round(numberValue(animation, "fps", 8)), 1, 30)));
  const [animationTick, setAnimationTick] = useState(0);
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
    const zIndex = bounded(Math.round(numberValue(props, "layer", 20)), 0, 100);
    return Array.from({ length: amount }, (_, index) => ({ id: `${component.id}-${index}`, x: bounded(startX + index * 7, 2, 96), y, value, zIndex }));
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

  useEffect(() => {
    const timer = window.setInterval(() => setAnimationTick(value => value + 1), Math.round(1000 / maxAnimationFps));
    return () => window.clearInterval(timer);
  }, [maxAnimationFps]);

  useEffect(() => {
    const board = document.querySelector<HTMLElement>('[role="application"]');
    if (!board) return;
    const backgroundLayer = document.createElement("div");
    backgroundLayer.style.position = "absolute";
    backgroundLayer.style.inset = "0";
    backgroundLayer.style.zIndex = "0";
    backgroundLayer.style.pointerEvents = "none";
    if (backgroundType === "image" && backgroundUrl) {
      backgroundLayer.style.backgroundImage = `linear-gradient(rgb(255 255 255 / ${backgroundOverlay}), rgb(255 255 255 / ${backgroundOverlay})), url(${backgroundUrl})`;
      backgroundLayer.style.backgroundSize = "cover";
      backgroundLayer.style.backgroundPosition = "center";
    }
    if (backgroundType === "video" && backgroundUrl) {
      const video = document.createElement("video");
      video.src = backgroundUrl;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      backgroundLayer.appendChild(video);
      backgroundLayer.style.background = `rgb(255 255 255 / ${backgroundOverlay})`;
    }
    if (backgroundType === "audio" && backgroundUrl) {
      const audio = document.createElement("audio");
      audio.src = backgroundUrl;
      audio.autoplay = true;
      audio.loop = true;
      audio.style.display = "none";
      backgroundLayer.appendChild(audio);
    }
    const playerLayer = document.createElement("div");
    playerLayer.style.position = "absolute";
    playerLayer.style.left = `${playerX}%`;
    playerLayer.style.top = `${playerY}%`;
    playerLayer.style.width = "2rem";
    playerLayer.style.height = "2.5rem";
    playerLayer.style.zIndex = String(playerZIndex);
    playerLayer.style.overflow = "hidden";
    playerLayer.style.borderRadius = "0.5rem";
    playerLayer.style.pointerEvents = "none";
    if (playerVideoUrl) {
      const video = document.createElement("video");
      video.src = playerVideoUrl;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      playerLayer.appendChild(video);
    } else if (playerImageUrl) {
      playerLayer.style.backgroundImage = `url(${playerImageUrl})`;
      playerLayer.style.backgroundSize = "cover";
      playerLayer.style.backgroundPosition = "center";
    }
    if (playerAudioUrl) {
      const audio = document.createElement("audio");
      audio.src = playerAudioUrl;
      audio.autoplay = true;
      audio.loop = true;
      audio.style.display = "none";
      playerLayer.appendChild(audio);
    }
    if (backgroundUrl) board.prepend(backgroundLayer);
    if (playerVideoUrl || playerImageUrl || playerAudioUrl) board.appendChild(playerLayer);
    return () => { backgroundLayer.remove(); playerLayer.remove(); };
  }, [backgroundType, backgroundUrl, backgroundOverlay, playerImageUrl, playerVideoUrl, playerAudioUrl, playerZIndex, playerX, playerY]);

  useEffect(() => {
    const board = document.querySelector<HTMLElement>('[role="application"]');
    if (!board || !animations.length) return;
    const layer = document.createElement("div");
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    animations.filter(animation => text(animation, "assetUrl")).forEach((animation, index) => {
      const frameCount = bounded(Math.round(numberValue(animation, "frameCount", 1)), 1, 32);
      const frame = animationTick % frameCount;
      const targetPlayer = text(animation, "target", "player") === "player";
      const sprite = document.createElement("div");
      sprite.setAttribute("aria-hidden", "true");
      sprite.style.position = "absolute";
      sprite.style.left = `${targetPlayer ? playerX : bounded(numberValue(animation, "x", 12), 0, 100)}%`;
      sprite.style.top = `${targetPlayer ? playerY : bounded(numberValue(animation, "y", 20), 0, 100)}%`;
      sprite.style.width = targetPlayer ? "3.5rem" : `${bounded(numberValue(animation, "width", 18), 2, 100)}%`;
      sprite.style.height = targetPlayer ? "3.5rem" : `${bounded(numberValue(animation, "height", 18), 2, 100)}%`;
      sprite.style.backgroundImage = `url(${text(animation, "assetUrl")})`;
      sprite.style.backgroundRepeat = "no-repeat";
      sprite.style.backgroundSize = `${frameCount * 100}% 100%`;
      sprite.style.backgroundPosition = `${frameCount === 1 ? 0 : (frame / (frameCount - 1)) * 100}% 50%`;
      sprite.style.filter = "drop-shadow(0 4px 4px rgb(15 23 42 / 0.24))";
      sprite.style.transform = `translateY(${animationTick % 2 === 0 ? -3 : 3}px)`;
      sprite.style.transition = "transform 120ms linear";
      sprite.style.zIndex = String(bounded(Math.round(numberValue(animation, "layer", 40 + index)), 0, 100));
      layer.appendChild(sprite);
    });
    board.appendChild(layer);
    return () => layer.remove();
  }, [animations, animationTick, playerX, playerY]);

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

  return <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white"><span>{isArabic ? `النقاط: ${score}` : `Score: ${score}`}</span><span className="flex items-center gap-1 text-rose-200"><Heart className="h-3.5 w-3.5 fill-current" />{lives}</span><span>{isArabic ? `الوقت: ${secondsLeft}` : `Time: ${secondsLeft}`}</span></div><div className="relative h-80 overflow-hidden rounded-[1.6rem] border-4 border-indigo-950 bg-gradient-to-b from-sky-300 via-indigo-200 to-emerald-100 shadow-inner" role="application" aria-label={isArabic ? "لعبة منصات قابلة للعب" : "Playable platform game"}>{platformSettings.map((platform, index) => <div key={`platform-${index}`} className={cn("absolute rounded-xl border-b-4 border-emerald-800 bg-emerald-500 shadow", platform.moving === true && "animate-pulse")} style={{ left: `${bounded(numberValue(platform, "x", 8), 0, 100)}%`, top: `${bounded(numberValue(platform, "y", 78), 0, 96)}%`, width: `${bounded(numberValue(platform, "width", 84), 4, 100)}%`, height: `${bounded(numberValue(platform, "height", 10), 2, 40)}%`, zIndex: bounded(Math.round(numberValue(platform, "layer", 10)), 0, 100) }} />)}{collectiblePoints.map(item => !collected.includes(item.id) && <button key={item.id} type="button" onClick={() => move(item.x - playerX)} className="absolute grid h-7 w-7 place-items-center rounded-full border-2 border-amber-100 bg-amber-400 text-xs shadow-lg" style={{ left: `${item.x}%`, top: `${item.y}%`, zIndex: item.zIndex }} aria-label={isArabic ? "جمع عنصر" : "Collect item"}>◆</button>)}{hazardSettings.map((hazard, index) => <div key={`hazard-${index}`} className="absolute h-7 bg-gradient-to-t from-rose-700 to-rose-400 [clip-path:polygon(0_100%,25%_0,50%_100%,75%_0,100%_100%)]" style={{ left: `${bounded(numberValue(hazard, "x", 70), 0, 100)}%`, top: `${bounded(numberValue(hazard, "y", 70), 0, 90)}%`, width: `${bounded(numberValue(hazard, "width", 10), 2, 40)}%`, zIndex: bounded(Math.round(numberValue(hazard, "layer", 21)), 0, 100) }} />)}<div className={cn("absolute grid h-12 w-9 place-items-center rounded-t-xl border-2", score >= requiredScore ? "border-emerald-200 bg-emerald-600 text-white" : "border-slate-300 bg-slate-500 text-slate-200")} style={{ left: `${gateX}%`, top: `${gateY}%`, zIndex: finishZIndex }} title={score >= requiredScore ? (isArabic ? "البوابة مفتوحة" : "Gate open") : (isArabic ? `تحتاج ${requiredScore} نقطة` : `Need ${requiredScore} points`)}>▣</div><div className="absolute grid h-10 w-8 place-items-center rounded-xl border-2 border-white bg-indigo-700 text-sm font-black text-white shadow-lg transition-transform" style={{ left: `${playerX}%`, top: `${playerY}%`, zIndex: playerZIndex }}>▲</div>{status !== "playing" && <div className="absolute inset-0 z-[100] grid place-items-center bg-slate-950/70 p-5 text-center"><div className="w-full rounded-3xl bg-white p-5 shadow-2xl">{status === "won" ? <><Trophy className="mx-auto h-9 w-9 text-amber-500" /><strong className="mt-2 block text-lg text-slate-950">{isArabic ? "أكملت المرحلة" : "Level complete"}</strong><p className="mt-1 text-sm text-slate-600">{isArabic ? `النتيجة: ${score}` : `Score: ${score}`}</p>{successPageId && <Button className="mt-4 w-full" onClick={() => onNavigate(successPageId)}>{isArabic ? "تابع" : "Continue"}</Button>}</> : <><CircleAlert className="mx-auto h-9 w-9 text-rose-500" /><strong className="mt-2 block text-lg text-slate-950">{isArabic ? "انتهت المحاولة" : "Try again"}</strong><p className="mt-1 text-sm text-slate-600">{isArabic ? "انتهى الوقت أو نفدت المحاولات." : "Time expired or lives ran out."}</p></>}<Button variant="outline" className="mt-3 w-full" onClick={reset}><RotateCcw className="h-4 w-4" />{isArabic ? "إعادة المرحلة" : "Restart level"}</Button></div></div>}</div><div className="flex items-end justify-between gap-3 rounded-2xl bg-slate-100 p-3">{controls.showDirections !== false && <div className="flex gap-2"><Button type="button" size="icon" variant="outline" onClick={() => move(isArabic ? playerSpeed : -playerSpeed)} aria-label={isArabic ? "تحرك يمينًا" : "Move left"}>{isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}</Button><Button type="button" size="icon" variant="outline" onClick={() => move(isArabic ? -playerSpeed : playerSpeed)} aria-label={isArabic ? "تحرك يسارًا" : "Move right"}>{isArabic ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button></div>}{controls.showJump !== false && <Button type="button" onClick={jump} className="bg-violet-600 text-white hover:bg-violet-700">{isArabic ? "اقفز" : "Jump"}</Button>}</div><p className="text-center text-xs text-slate-500">{isArabic ? `اجمع ${requiredScore} نقطة ثم اقترب من البوابة. يمكنك استخدام اللمس أو مفاتيح الأسهم.` : `Collect ${requiredScore} points, then reach the gate. Use touch controls or arrow keys.`}</p></div>;
}

const gameModeCopy = {
  endless_runner: { ar: "تجاوز العوائق واجمع النقاط قبل أن تنفد المحاولات.", en: "Dodge obstacles and collect points before lives run out.", actionAr: "تجاوز", actionEn: "Dodge" },
  puzzle: { ar: "حرّك القطع حتى يكتمل نمط اللغز.", en: "Move pieces until the puzzle pattern is complete.", actionAr: "حرّك قطعة", actionEn: "Move tile" },
  quiz: { ar: "أجب عن السؤال التالي لتتقدم في المستوى.", en: "Answer the next question to advance the level.", actionAr: "إجابة صحيحة", actionEn: "Correct answer" },
  memory_cards: { ar: "طابق البطاقات المتشابهة قبل انتهاء الوقت.", en: "Match similar cards before time runs out.", actionAr: "قلب بطاقة", actionEn: "Flip card" },
  tower_defense: { ar: "أوقف موجات الخصوم قبل وصولها إلى الهدف.", en: "Stop incoming waves before they reach the target.", actionAr: "دافع", actionEn: "Defend" },
  simple_shooter: { ar: "أطلق على الأهداف المتحركة وحافظ على صحتك.", en: "Fire at moving targets and protect your health.", actionAr: "إطلاق", actionEn: "Fire" },
  racing: { ar: "حافظ على مسارك وتجاوز نقاط التحقق.", en: "Stay on track and pass checkpoints.", actionAr: "تسارع", actionEn: "Accelerate" },
  light_simulation: { ar: "وازن الموارد والطلبات لرفع مستوى المحاكاة.", en: "Balance resources and requests to raise the simulation level.", actionAr: "نفّذ دورة", actionEn: "Run cycle" },
} as const;

function GameModeRuntime({ components, pages, onNavigate, isArabic, mode }: { components: RuntimeComponent[]; pages: RuntimePage[]; onNavigate: (pageId: number) => void; isArabic: boolean; mode: keyof typeof gameModeCopy }) {
  const scene = asRecord(components.find(component => component.componentType === "GameScene")?.properties);
  const scoreSettings = asRecord(components.find(component => component.componentType === "Score")?.properties);
  const levelSettings = asRecord(components.find(component => component.componentType === "Level")?.properties);
  const playerSettings = asRecord(components.find(component => component.componentType === "Player")?.properties);
  const backgroundSettings = asRecord(components.find(component => component.componentType === "Background")?.properties);
  const backgroundType = text(backgroundSettings, "mediaType", "image");
  const backgroundUrl = text(backgroundSettings, "assetUrl");
  const playerImageUrl = text(playerSettings, "imageAssetUrl");
  const playerVideoUrl = text(playerSettings, "videoAssetUrl");
  const playerAudioUrl = text(playerSettings, "audioAssetUrl");
  const hazardCount = Math.max(1, components.filter(component => component.componentType === "Hazard").length);
  const collectibleCount = Math.max(1, components.filter(component => component.componentType === "Collectible").length);
  const pointsPerAction = Math.max(1, numberValue(scoreSettings, "pointsPerCollectible", 10));
  const targetScore = Math.max(pointsPerAction, numberValue(levelSettings, "targetScore", pointsPerAction * 5));
  const [score, setScore] = useState(numberValue(scoreSettings, "startScore", 0));
  const [lives, setLives] = useState(Math.max(1, numberValue(playerSettings, "lives", 3)));
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const info = gameModeCopy[mode];
  const colors: Record<keyof typeof gameModeCopy, string> = { endless_runner: "from-amber-400 via-orange-500 to-rose-500", puzzle: "from-violet-500 via-fuchsia-500 to-pink-500", quiz: "from-cyan-500 via-blue-600 to-indigo-700", memory_cards: "from-rose-400 via-fuchsia-500 to-violet-600", tower_defense: "from-emerald-500 via-teal-600 to-cyan-700", simple_shooter: "from-slate-700 via-indigo-700 to-violet-800", racing: "from-sky-500 via-blue-600 to-indigo-800", light_simulation: "from-lime-500 via-emerald-600 to-teal-700" };
  function playTurn() {
    if (complete || lives <= 0) return;
    const nextProgress = progress + 1;
    const nextScore = score + pointsPerAction;
    setProgress(nextProgress);
    setScore(nextScore);
    if ((mode === "endless_runner" || mode === "tower_defense" || mode === "simple_shooter" || mode === "racing") && nextProgress % Math.max(3, hazardCount + 1) === 0) setLives(current => Math.max(0, current - 1));
    if (nextScore >= targetScore || nextProgress >= Math.max(4, collectibleCount * 2)) setComplete(true);
  }
  const boardContent = mode === "quiz" ? <div className="grid gap-2"><p className="rounded-2xl bg-white/15 p-4 text-sm font-bold">{isArabic ? "ما الهدف الذي يحقق نقاط التقدم؟" : "What earns progress points?"}</p><div className="grid grid-cols-2 gap-2">{["A", "B", "C", "D"].map((answer, index) => <button key={answer} type="button" onClick={index === 0 ? playTurn : () => setLives(current => Math.max(0, current - 1))} className="rounded-xl bg-white/90 px-3 py-3 text-sm font-black text-slate-800 transition hover:bg-white">{answer}</button>)}</div></div> : mode === "memory_cards" ? <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, index) => <button key={index} type="button" onClick={playTurn} className="aspect-square rounded-xl bg-white/85 text-lg font-black text-violet-700 transition hover:scale-105">{progress > index / 2 ? "◆" : "?"}</button>)}</div> : mode === "puzzle" ? <div className="grid grid-cols-3 gap-2">{Array.from({ length: 9 }, (_, index) => <button key={index} type="button" onClick={playTurn} className="aspect-square rounded-xl bg-white/85 text-xl font-black text-fuchsia-700 transition hover:scale-105">{(index + progress) % 9 + 1}</button>)}</div> : <div className="relative h-48 overflow-hidden rounded-2xl bg-slate-950/25">{Array.from({ length: Math.max(3, collectibleCount + hazardCount) }, (_, index) => <button key={index} type="button" onClick={playTurn} className="absolute grid h-9 w-9 place-items-center rounded-full border-2 border-white/70 bg-white/90 text-xs font-black text-slate-900 shadow-lg" style={{ left: `${12 + (index * 19) % 72}%`, top: `${18 + (index * 23) % 58}%` }}>{mode === "racing" ? "▰" : mode === "tower_defense" ? "✦" : mode === "simple_shooter" ? "◎" : mode === "light_simulation" ? "▣" : "◆"}</button>)}</div>;
  return <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white"><span>{isArabic ? `النقاط: ${score}` : `Score: ${score}`}</span><span>{isArabic ? `الحياة: ${lives}` : `Lives: ${lives}`}</span><span>{isArabic ? `المستوى ${numberValue(levelSettings, "levelNumber", 1)}` : `Level ${numberValue(levelSettings, "levelNumber", 1)}`}</span></div><div className={cn("relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br p-5 text-white shadow-inner", colors[mode])}>{backgroundType === "image" && backgroundUrl ? <><div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${backgroundUrl})` }} /><div className="absolute inset-0 bg-slate-950/20" /></> : null}{backgroundType === "video" && backgroundUrl ? <><video className="absolute inset-0 h-full w-full object-cover opacity-30" autoPlay muted loop playsInline src={backgroundUrl} /><div className="absolute inset-0 bg-slate-950/20" /></> : null}{backgroundType === "audio" && backgroundUrl ? <audio className="sr-only" autoPlay loop src={backgroundUrl} /> : null}<div className="relative z-10"><p className="mb-4 text-sm leading-6 text-white/90">{isArabic ? info.ar : info.en}</p>{playerVideoUrl ? <video className="mb-4 h-20 w-20 rounded-xl object-cover shadow-lg" autoPlay muted loop playsInline src={playerVideoUrl} /> : playerImageUrl ? <img className="mb-4 h-20 w-20 rounded-xl object-cover shadow-lg" src={playerImageUrl} alt="" /> : null}{playerAudioUrl ? <audio className="mb-3 w-full" controls preload="metadata" src={playerAudioUrl} /> : null}{boardContent}<Button type="button" className="mt-4 w-full bg-white text-slate-900 hover:bg-white/90" onClick={playTurn} disabled={complete || lives <= 0}>{isArabic ? info.actionAr : info.actionEn}</Button>{complete ? <div className="mt-4 rounded-2xl bg-emerald-950/30 p-3 text-center text-sm font-bold">{isArabic ? "اكتمل الهدف — انتقل إلى المرحلة التالية من إعدادات البوابة." : "Goal complete — continue through the finish-gate configuration."}</div> : lives <= 0 ? <div className="mt-4 rounded-2xl bg-rose-950/30 p-3 text-center text-sm font-bold">{isArabic ? "انتهت المحاولات. أعد تشغيل المستوى من المحرر." : "Lives are exhausted. Restart the level from the editor."}</div> : null}</div></div></div>;
}

function ProjectScreen({ components, pages, activePageId, onNavigate, isArabic }: { components: RuntimeComponent[]; pages: RuntimePage[]; activePageId: number; onNavigate: (pageId: number) => void; isArabic: boolean }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<number | null>(null);
  const currentComponents = components.filter(component => component.componentType === "SearchBar" || !query.trim() || `${component.labelAr} ${component.labelEn} ${text(asRecord(component.properties), "titleAr")} ${text(asRecord(component.properties), "titleEn")} ${text(asRecord(component.properties), "nameAr")} ${text(asRecord(component.properties), "nameEn")} ${text(asRecord(component.properties), "descriptionAr")} ${text(asRecord(component.properties), "descriptionEn")}`.toLocaleLowerCase(isArabic ? "ar" : "en").includes(query.trim().toLocaleLowerCase(isArabic ? "ar" : "en")));
  const pageTitle = (id: unknown) => pages.find(page => page.id === id)?.[isArabic ? "titleAr" : "titleEn"];
  const searchConfiguration = components.find(component => component.componentType === "SearchBar");
  const searchProps = asRecord(searchConfiguration?.properties);
  const pageConfiguration = asRecord(pages.find(page => page.id === activePageId)?.configuration);
  const pageBackground = asRecord(pageConfiguration.background);
  const backgroundComponent = asRecord(components.find(component => component.componentType === "Background")?.properties);
  const componentBackgroundType = text(backgroundComponent, "mediaType", "");
  const hasComponentBackground = ["image", "video", "audio"].includes(componentBackgroundType) && Boolean(text(backgroundComponent, "assetUrl"));
  const backgroundType = hasComponentBackground ? componentBackgroundType as "image" | "video" | "audio" : ["color", "image", "video", "audio"].includes(typeof pageBackground.type === "string" ? pageBackground.type : "") ? pageBackground.type as "color" | "image" | "video" | "audio" : "none";
  const backgroundColor = /^#[0-9a-fA-F]{3,8}$/.test(typeof pageBackground.color === "string" ? pageBackground.color : "") ? String(pageBackground.color) : "#f8fafc";
  const backgroundUrl = hasComponentBackground ? text(backgroundComponent, "assetUrl") : text(pageBackground, "assetUrl");

  if (components.some(component => component.componentType === "GameScene") && components.some(component => component.componentType === "Player")) {
    const scene = asRecord(components.find(component => component.componentType === "GameScene")?.properties);
    const selectedMode = text(scene, "gameMode", text(scene, "preset", "platformer"));
    return selectedMode === "platformer" ? <PlatformerRuntime components={components} pages={pages} onNavigate={onNavigate} isArabic={isArabic} /> : <GameModeRuntime components={components} pages={pages} onNavigate={onNavigate} isArabic={isArabic} mode={(selectedMode in gameModeCopy ? selectedMode : "puzzle") as keyof typeof gameModeCopy} />;
  }

  if (!components.length) return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500"><Layers3 className="mx-auto mb-3 h-8 w-8 text-indigo-400" /><strong className="block text-slate-800">{isArabic ? "هذه الصفحة فارغة" : "This page is empty"}</strong><p className="mt-1 text-sm">{isArabic ? "ارجع إلى المحرر وأضف صورًا أو فيديو أو صوتًا أو أزرارًا أو قائمة." : "Return to the editor and add images, video, audio, buttons, or a list."}</p></div>;

  return <div className="relative min-h-[34rem] overflow-hidden rounded-3xl p-1" style={{ backgroundColor }}>{backgroundType === "image" && backgroundUrl ? <><div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backgroundUrl})` }} /><div className="absolute inset-0 bg-white/80" /></> : null}{backgroundType === "video" && backgroundUrl ? <><video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline src={backgroundUrl} /><div className="absolute inset-0 bg-white/80" /></> : null}{backgroundType === "audio" && backgroundUrl ? <audio className="sr-only" autoPlay loop src={backgroundUrl} /> : null}<div className="relative z-10 space-y-4">{currentComponents.map(component => {
    const props = asRecord(component.properties);
    const label = isArabic ? component.labelAr : component.labelEn;
    if (component.componentType === "SearchBar") return <div key={component.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><Search className="h-5 w-5 text-slate-400" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text(props, isArabic ? "placeholderAr" : "placeholderEn", isArabic ? "ابحث" : "Search")} />{query && <button type="button" onClick={() => setQuery("")} aria-label={isArabic ? "مسح البحث" : "Clear search"}><X className="h-4 w-4 text-slate-400" /></button>}</div>;
    if (component.componentType === "Image") { const caption = text(props, isArabic ? "altAr" : "altEn", ""); return text(props, "assetUrl") ? <figure key={component.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><img className="max-h-[28rem] w-full object-cover" src={text(props, "assetUrl")} alt={caption} />{caption ? <figcaption className="px-4 py-3 text-sm text-slate-600">{caption}</figcaption> : null}</figure> : null; }
    if (component.componentType === "Video") { const caption = text(props, isArabic ? "captionAr" : "captionEn", ""); return text(props, "assetUrl") ? <figure key={component.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><video className="w-full bg-black" autoPlay muted loop playsInline controls preload="metadata" src={text(props, "assetUrl")} />{caption ? <figcaption className="px-4 py-3 text-sm text-slate-600">{caption}</figcaption> : null}</figure> : null; }
    if (component.componentType === "Audio") { const caption = text(props, isArabic ? "captionAr" : "captionEn", ""); return text(props, "assetUrl") ? <figure key={component.id} className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">{caption ? <div className="mb-3 flex items-center gap-3"><span className="rounded-2xl bg-indigo-600 p-3 text-white"><FileAudio className="h-5 w-5" /></span><strong className="text-slate-900">{caption}</strong></div> : null}<audio className="w-full" controls preload="metadata" src={text(props, "assetUrl")} /></figure> : null; }
    if (component.componentType === "PDFDocument") { const pdfTitle = text(props, isArabic ? "titleAr" : "titleEn", label); const description = text(props, isArabic ? "descriptionAr" : "descriptionEn", ""); return text(props, "assetUrl") ? <article key={component.id} className="overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 shadow-sm">{pdfTitle || description ? <div className="flex items-center gap-3 px-5 py-4 text-amber-950"><span className="rounded-2xl bg-amber-600 p-3 text-white"><FileText className="h-5 w-5" /></span><div>{pdfTitle ? <strong>{pdfTitle}</strong> : null}{description ? <p className="mt-1 text-sm text-amber-900/80">{description}</p> : null}</div></div> : null}<iframe className="h-[32rem] w-full border-0 bg-white" src={text(props, "assetUrl")} title={pdfTitle || "PDF"} /></article> : null; }
    if (component.componentType === "PaymentPlatform") { const successPage = typeof props.successPageId === "number" ? props.successPageId : null; const amount = numberValue(props, "amount", 0); const currency = text(props, "currency", "SAR"); return <article key={component.id} className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-2xl bg-emerald-600 p-3 text-white"><CreditCard className="h-5 w-5" /></span><div><strong className="text-slate-900">{text(props, isArabic ? "titleAr" : "titleEn", label)}</strong><p className="mt-1 text-sm text-slate-600">{text(props, isArabic ? "descriptionAr" : "descriptionEn", isArabic ? "فاتورة دفع تاجر بعد التهيئة." : "Merchant invoice after setup.")}</p></div></div><Button type="button" disabled className="mt-4 w-full">{amount > 0 ? `${amount} ${currency}` : (isArabic ? "أدخل مبلغًا أولًا" : "Set an amount first")}</Button><p className="mt-2 text-xs text-emerald-800">{isArabic ? "تتطلب الفاتورة الحقيقية تهيئة حساب التاجر والتحقق الخادمي قبل تفعيل هذا الزر." : "A real invoice requires merchant-account setup and server verification before this button is enabled."}</p>{successPage ? <span className="mt-2 block text-xs font-semibold text-emerald-700">{isArabic ? `سيُتابع إلى: ${pageTitle(successPage) ?? "صفحة النجاح"}` : `Will continue to: ${pageTitle(successPage) ?? "Success page"}`}</span> : null}</article>; }
    if (component.componentType === "Button") { const target = typeof props.targetPageId === "number" ? props.targetPageId : null; return <button key={component.id} type="button" onClick={() => target && onNavigate(target)} disabled={!target} className={cn("flex w-full items-center justify-between rounded-2xl px-5 py-4 text-start font-bold shadow-sm transition active:scale-[0.98]", target ? "bg-gradient-to-l from-indigo-600 to-violet-600 text-white" : "cursor-not-allowed bg-slate-200 text-slate-500")}>{text(props, isArabic ? "textAr" : "textEn", label)}{target ? <span className="flex items-center gap-2 text-xs font-medium text-white/80">{pageTitle(target)}{isArabic ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</span> : <span className="text-xs">{isArabic ? "اختر صفحة الربط" : "Choose link page"}</span>}</button>; }
    if (component.componentType === "List") { const listItems = items(props); const title = text(props, isArabic ? "titleAr" : "titleEn", label); return <nav key={component.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{title && <div className="border-b border-slate-100 px-5 py-4"><strong className="text-slate-900">{title}</strong></div>}{listItems.length ? listItems.map((item, index) => { const target = typeof item.targetPageId === "number" ? item.targetPageId : null; return <button type="button" key={`${component.id}-${index}`} onClick={() => target && onNavigate(target)} disabled={!target} className="flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-start text-sm font-semibold text-slate-700 last:border-0 disabled:cursor-not-allowed disabled:text-slate-400">{text(item, isArabic ? "labelAr" : "labelEn", isArabic ? "زر قائمة" : "List button")}{isArabic ? <ChevronLeft className="h-4 w-4 text-indigo-500" /> : <ChevronRight className="h-4 w-4 text-indigo-500" />}</button>; }) : <p className="px-5 py-4 text-sm text-slate-500">{isArabic ? "لا توجد أزرار داخل هذه القائمة بعد." : "This list has no buttons yet."}</p>}</nav>; }
    if (component.componentType === "Product") { const price = typeof props.price === "number" ? props.price : 0; const salePrice = typeof props.salePrice === "number" ? props.salePrice : null; const currency = text(props, "currency", "SAR"); return <article key={component.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{text(props, "assetUrl") ? <img src={text(props, "assetUrl")} className="h-48 w-full object-cover" alt="" /> : <div className="flex h-40 items-center justify-center bg-slate-100 text-slate-400"><ShoppingBag /></div>}<div className="p-5"><strong className="text-lg text-slate-900">{text(props, isArabic ? "nameAr" : "nameEn", label)}</strong><p className="mt-1 text-sm leading-6 text-slate-600">{text(props, isArabic ? "descriptionAr" : "descriptionEn")}</p><div className="mt-4 flex items-end justify-between"><div>{salePrice !== null ? <><del className="mr-2 text-sm text-slate-400">{price} {currency}</del><strong className="text-indigo-700">{salePrice} {currency}</strong></> : <strong className="text-indigo-700">{price} {currency}</strong>}</div><span className="text-xs text-slate-500">{isArabic ? `المخزون: ${typeof props.stock === "number" ? props.stock : 0}` : `Stock: ${typeof props.stock === "number" ? props.stock : 0}`}</span></div></div></article>; }
    if (component.componentType === "Card") { const target = typeof props.actionPageId === "number" ? props.actionPageId : null; const cardTitle = text(props, isArabic ? "titleAr" : "titleEn", label); const cardDescription = text(props, isArabic ? "descriptionAr" : "descriptionEn", ""); return cardTitle || cardDescription ? <article key={component.id} onClick={() => target && onNavigate(target)} className={cn("rounded-3xl border border-slate-200 bg-white p-5 shadow-sm", target && "cursor-pointer transition hover:border-indigo-300")}>{cardTitle ? <strong className="block text-lg text-slate-900">{cardTitle}</strong> : null}{cardDescription ? <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{cardDescription}</p> : null}{target && <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">{isArabic ? "فتح الصفحة" : "Open page"}{isArabic ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}</span>}</article> : null; }
    if (component.componentType === "Form") return null;
    return null;
  })}{query.trim() && currentComponents.filter(component => component.componentType !== "SearchBar").length === 0 && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{text(searchProps, isArabic ? "emptyAr" : "emptyEn", isArabic ? "لا توجد نتائج مطابقة." : "No matching results.")}</div>}</div></div>;
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
  const appIconUrl = text(asRecord(workspace.data?.project.settings), "appIconUrl");
  const Arrow = isArabic ? ArrowRight : ArrowLeft;

  return <AppShell><WorkspaceAccess>{workspace.isLoading ? <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div> : !workspace.data || !activePage ? <div className="mx-auto max-w-xl py-20 text-center"><CircleAlert className="mx-auto mb-4 h-10 w-10 text-amber-500" /><h1 className="text-2xl font-bold text-slate-900">{copy("تعذر فتح التطبيق", "Unable to open app")}</h1><p className="mt-2 text-slate-600">{copy("تأكد من وجود المشروع في حسابك ثم أعد المحاولة.", "Confirm the project belongs to your account, then try again.")}</p></div> : <main className="mx-auto max-w-5xl px-4 py-7 md:px-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{appIconUrl ? <img className="h-12 w-12 rounded-2xl object-cover shadow-sm" src={appIconUrl} alt="" /> : null}<div><Link href={`/editor/${projectId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><Arrow className="h-4 w-4" />{copy("العودة إلى المحرر", "Back to editor")}</Link><p className="mt-3 text-xs font-bold tracking-[0.16em] text-indigo-500">{copy("وضع تشغيل التطبيق", "APP RUN MODE")}</p><h1 className="mt-1 text-2xl font-black text-slate-950">{workspace.data.project.name}</h1></div></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{copy("تفاعل حقيقي", "Live interactions")}</span></div><div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]"><aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"><p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">{copy("شاشات التطبيق", "App screens")}</p><nav className="space-y-1">{pages.map(page => <button type="button" key={page.id} onClick={() => setActivePageId(page.id)} className={cn("w-full rounded-2xl px-3 py-3 text-start text-sm font-semibold transition", page.id === activePage.id ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-50")}>{isArabic ? page.titleAr : page.titleEn}</button>)}</nav></aside><section className="min-w-0 rounded-[2rem] border border-slate-200 bg-slate-50 p-3 shadow-sm md:p-5"><div className="mx-auto max-w-md overflow-hidden rounded-[2.4rem] border-[8px] border-slate-900 bg-white shadow-2xl"><div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-xs text-white/80"><span className="flex items-center gap-2">{appIconUrl ? <img className="h-5 w-5 rounded-md object-cover" src={appIconUrl} alt="" /> : null}{workspace.data.project.name}</span><span>•••</span></div><div className="min-h-[36rem] bg-slate-50 p-4"><h2 className="mb-4 text-xl font-black text-slate-950">{isArabic ? activePage.titleAr : activePage.titleEn}</h2><ProjectScreen components={components as RuntimeComponent[]} pages={pages} activePageId={activePage.id} onNavigate={setActivePageId} isArabic={isArabic} /></div></div></section></div></main>}</WorkspaceAccess></AppShell>;
}
