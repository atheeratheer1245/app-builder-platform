import { BrandMark } from "@/components/BrandMark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { ArrowLeft, ArrowRight, CircleHelp, FileBox, Layers3, LockKeyhole, MonitorSmartphone, Sparkles } from "lucide-react";
import { Link } from "wouter";
import "./public-pages.css";

function PublicHeader() { const { copy } = useLocale(); return <header className="public-header container"><Link href="/"><BrandMark /></Link><div><Link href="/guide" className="public-header-link"><CircleHelp />{copy("الدليل", "Guide")}</Link><LanguageToggle /><Link href="/auth"><Button variant="outline">{copy("تسجيل الدخول", "Sign in")}</Button></Link></div></header>; }

export function GuidePage() {
  const { copy, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const steps = [{ icon: Layers3, title: copy("ابدأ بالقوالب", "Start with templates"), text: copy("اختر قالبًا أساسيًا يناسب فكرتك، ثم عدّل صفحاته ومكوّناته حسب احتياج تطبيقك.", "Choose a base template that fits your idea, then tailor its pages and components to your app.") }, { icon: FileBox, title: copy("راجع سعر التصدير", "Review export pricing"), text: copy("كل القوالب تستخدم التصدير المدفوع، ويُحسب السعر بحسب الفئة ولكل 10 ميغابايت قبل إنشاء الفاتورة.", "Every template uses paid export, priced by category and each 10 MB before an invoice is created.") }, { icon: MonitorSmartphone, title: copy("تابع حالة البناء", "Track build status"), text: copy("تظهر حالة APK وAAB وIPA في مركز التصدير. يبدأ البناء بعد تحقق الدفع ويتطلب إنتاج الملفات النهائية ربط خدمة البناء السحابية.", "APK, AAB, and IPA status appears in Export Center. Builds begin after payment verification and final artifacts require the cloud-build service connection.") }];
  return <div className="public-page"><PublicHeader /><main className="container public-main"><section className="guide-hero"><div><p className="section-kicker"><CircleHelp />{copy("دليل App Builder", "APP BUILDER GUIDE")}</p><h1>{copy("دليلك من الفكرة إلى طلب التصدير", "Your guide from idea to export request")}</h1><p>{copy("استخدم هذا الدليل لفهم مسارات التصدير وخطوات بناء تطبيقك من القوالب الأساسية.", "Use this guide to understand export paths and the steps for building your app from core templates.")}</p><Link href="/templates"><Button className="workspace-primary">{copy("استعرض القوالب", "Browse templates")}<Arrow /></Button></Link></div><div className="guide-hero-mark"><Sparkles /><strong>{copy("عربي وإنجليزي", "Arabic & English")}</strong><span>{copy("دعم RTL وLTR", "RTL & LTR ready")}</span></div></section><section className="guide-steps">{steps.map(step => <article key={step.title}><span><step.icon /></span><h2>{step.title}</h2><p>{step.text}</p></article>)}</section><section className="guide-note"><LockKeyhole /><div><h2>{copy("كيف أبدأ؟", "How do I get started?")}</h2><p>{copy("ابدأ من مكتبة القوالب، واختر الفئة المناسبة، ثم أنشئ نسخة قابلة للتحرير لحسابك.", "Start from the template library, choose the appropriate category, then create an editable copy for your account.")}</p></div></section></main></div>;
}
