import { Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import "./pwa-install-prompt.css";

type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PwaInstallPrompt({ isArabic }: { isArabic: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const receivePrompt = (event: Event) => { event.preventDefault(); setDeferredPrompt(event as DeferredInstallPrompt); };
    window.addEventListener("beforeinstallprompt", receivePrompt);
    return () => window.removeEventListener("beforeinstallprompt", receivePrompt);
  }, []);
  if (isStandalone) return null;
  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setDeferredPrompt(null);
  }
  if (deferredPrompt) return <Button type="button" variant="outline" className="pwa-install-button" onClick={install}><Download />{isArabic ? "تثبيت التطبيق" : "Install app"}</Button>;
  return <span className="pwa-install-hint"><Smartphone />{isArabic ? "ثبّت التطبيق من قائمة المتصفح" : "Install from your browser menu"}</span>;
}
