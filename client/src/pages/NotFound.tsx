import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { Link } from "wouter";

export default function NotFound() {
  const { copy } = useLocale();
  return <div className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="text-center"><p className="section-kicker">404</p><h1 className="mt-2 text-3xl font-extrabold text-slate-950">{copy("الصفحة غير موجودة", "Page not found")}</h1><Link href="/"><Button className="mt-6">{copy("العودة للرئيسية", "Back home")}</Button></Link></div></div>;
}
