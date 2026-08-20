import { BrandMark } from "@/components/BrandMark";
import { ExportPlansPanel } from "@/components/ExportPlansPanel";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PremiumExamplesPanel } from "@/components/PremiumExamplesPanel";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Box, CheckCircle2, Layers3, PlayCircle, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Link } from "wouter";

const LOGO_URL = "/manus-storage/appbuilder-app-icon_ff77e513.png";

export default function Home() {
  const { copy, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const headline = isArabic ? <>من فكرتك إلى <em>تطبيق موبايل</em> احترافي.</> : <>From your idea to a <em>professional mobile app</em>.</>;
  const features: Array<[LucideIcon, string, string]> = [
    [Layers3, copy("قوالب منظمة", "Structured templates"), copy("ثماني فئات محسّنة لبداية أسرع.", "Eight focused categories for a faster start.")],
    [Box, copy("محرر بصري", "Visual editor"), copy("أدر الصفحات والمكونات من لوحة واحدة.", "Manage pages and components in one place.")],
    [ShieldCheck, copy("تصدير واضح", "Clear export flow"), copy("تابع حالة APK وAAB وIPA قبل التنزيل.", "Track APK, AAB, and IPA status before download.")],
  ];
  return <div className="landing-page">
    <header className="landing-header container"><Link href="/"><BrandMark /></Link><div className="flex items-center gap-3"><Link href="/guide" className="landing-login">{copy("الدليل", "Guide")}</Link><PwaInstallPrompt isArabic={isArabic} /><LanguageToggle /><Link href="/auth"><Button variant="outline" className="landing-login">{copy("تسجيل الدخول", "Sign in")}</Button></Link><Link href="/app"><Button className="landing-cta">{copy("ابدأ الآن", "Get started")}</Button></Link></div></header>
    <main>
      <section className="hero container">
        <div className="hero-copy"><div className="eyebrow"><Sparkles className="h-3.5 w-3.5" />{copy("ابنِ. صمّم. أطلق.", "Build. Design. Deploy.")}</div><h1>{headline}</h1><p>{copy("منصة عمل مرنة لتصميم تطبيقات الموبايل عبر قوالب متخصصة، مع محرر واضح ومسار تصدير منظم.", "A focused workspace for creating mobile apps with specialized templates, a clear editor, and an organized export flow.")}</p><div className="hero-actions"><Link href="/app"><Button className="hero-primary">{copy("إنشاء مشروع جديد", "Create a new project")}<Arrow className="h-4 w-4" /></Button></Link><a href="#how-it-works" className="hero-secondary"><PlayCircle className="h-5 w-5" />{copy("استكشف المنصة", "Explore the platform")}</a></div><div className="hero-trust"><CheckCircle2 />{copy("واجهة عربية كاملة مع دعم RTL", "Full Arabic interface with RTL support")}</div></div>
        <div className="hero-visual"><div className="visual-grid" /><div className="hero-glow glow-top" /><div className="hero-glow glow-bottom" /><div className="app-orbit orbit-a" /><div className="app-orbit orbit-b" /><div className="hero-logo-disc"><img src={LOGO_URL} alt="App Builder" /></div><div className="floating-panel project-panel"><span className="panel-label">01</span><strong>{copy("مشروعك القادم", "Your next project")}</strong><p>{copy("اختر قالبًا وابدأ التخصيص", "Choose a template and start tailoring")}</p><div className="mini-progress"><i /></div></div><div className="floating-panel export-panel"><div className="export-indicator"><CheckCircle2 /></div><div><strong>APK / AAB / IPA</strong><p>{copy("مسار تصدير واحد", "One export flow")}</p></div></div></div>
      </section>
      <section id="how-it-works" className="feature-section container"><div className="section-heading"><p className="section-kicker">{copy("كل ما تحتاجه", "Everything you need")}</p><h2>{copy("أدوات واضحة لبداية أسرع.", "Clear tools for a faster start.")}</h2></div><div className="feature-grid">{features.map(([Icon, title, description]) => <article className="feature-card" key={String(title)}><div className="feature-icon"><Icon className="h-5 w-5" /></div><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <div className="container"><PremiumExamplesPanel isArabic={isArabic} /></div>
      <div className="container"><ExportPlansPanel isArabic={isArabic} /></div>
    </main>
    <footer className="container flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 py-8 text-sm text-slate-500"><span>{copy("استخدم المنصة بمسؤولية واحترم الحقوق والتراخيص.", "Use the platform responsibly and respect rights and licenses.")}</span><div className="flex items-center gap-4 font-semibold text-slate-600"><Link href="/terms">{copy("سياسة الاستخدام", "Terms of Use")}</Link><Link href="/privacy">{copy("سياسة الخصوصية", "Privacy Policy")}</Link></div></footer>
  </div>;
}
