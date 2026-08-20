import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { BookOpen, Clapperboard, Gamepad2, GraduationCap, Music2, Mic2, ShoppingBag, BriefcaseBusiness, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = { ShoppingBag, GraduationCap, Gamepad2, Music2, Mic2, Clapperboard, BriefcaseBusiness, BookOpen };

export function TemplateVisual({ iconName, color, size = "regular" }: { iconName: string; color: string; size?: "regular" | "small" }) {
  const Icon = icons[iconName] ?? ShoppingBag;
  return <div className={cn("template-visual", size === "small" && "template-visual-small")} style={{ background: `linear-gradient(145deg, ${color}18, ${color}43)`, color }}><div className="template-visual-orb" style={{ background: `${color}28` }} /><Icon className="relative z-10" /></div>;
}

export function TemplateText({ ar, en }: { ar: string; en: string }) {
  const { copy } = useLocale();
  return <>{copy(ar, en)}</>;
}
