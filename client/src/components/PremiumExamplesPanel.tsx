import { Crown, LockKeyhole, Sparkles } from "lucide-react";
import { premiumExampleCatalog } from "@shared/premiumExamples";
import { TemplateVisual } from "./TemplateVisual";
import { Link } from "wouter";
import "./premium-examples.css";

const labels = {
  ecommerce: { ar: "متجر إلكتروني", en: "E-commerce" }, education: { ar: "تطبيق تعليمي", en: "Education" }, games: { ar: "تطبيق ألعاب", en: "Games" }, music: { ar: "تطبيق موسيقى", en: "Music" }, podcasts: { ar: "تطبيق بودكاست", en: "Podcasts" }, movies: { ar: "أفلام ومسلسلات", en: "Movies & shows" }, services: { ar: "تطبيق خدمات", en: "Services" }, books: { ar: "تطبيق كتب", en: "Books App" },
};

export function PremiumExamplesPanel({ isArabic }: { isArabic: boolean }) {
  return <section className="premium-examples-panel" aria-labelledby="premium-examples-title"><div className="premium-examples-heading"><div><p className="section-kicker"><Crown />{isArabic ? "أمثلة النسخة المدفوعة" : "PAID APP EXAMPLES"}</p><h2 id="premium-examples-title">{isArabic ? "سبعة تطبيقات مكتملة كنقطة انطلاق" : "Seven complete apps to start from"}</h2><p>{isArabic ? "لكل فئة نموذج تطبيقي مدروس بالصفحات والمكونات المقترحة؛ افتح المعاينة لرؤية بنيته قبل تفعيل التصدير المدفوع." : "Each category includes a considered application example with recommended screens and components; open its preview before enabling paid export."}</p></div><span className="premium-lock"><LockKeyhole />{isArabic ? "حصرية للمدفوعة" : "Paid only"}</span></div><div className="premium-examples-grid">{premiumExampleCatalog.map(example => <Link href={`/examples/${example.slug}`} className="premium-example-card" key={example.slug}><div className="premium-example-top"><TemplateVisual iconName={example.iconName} color={example.accentColor} size="small" /><span style={{ color: example.accentColor, backgroundColor: `${example.accentColor}16` }}>{labels[example.category][isArabic ? "ar" : "en"]}</span></div><div><h3>{isArabic ? example.nameAr : example.nameEn}</h3><p>{isArabic ? example.descriptionAr : example.descriptionEn}</p></div><div className="premium-example-pages"><Sparkles /><span>{example.pages.length} {isArabic ? "شاشات نموذجية" : "sample screens"}</span><span>·</span><span>{example.components.length} {isArabic ? "مكونات أساسية" : "core components"}</span></div><span className="premium-example-open">{isArabic ? "فتح المعاينة" : "Open preview"}</span></Link>)}</div></section>;
}
