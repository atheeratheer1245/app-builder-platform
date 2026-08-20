import { BrandMark } from "@/components/BrandMark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { AlertTriangle, ArrowLeft, ArrowRight, FileCheck2, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type LegalKind = "terms" | "privacy";

const termsSections = {
  ar: [
    ["قبول الاستخدام", "باستخدام App Builder، يوافق المستخدم على هذه الشروط وعلى القوانين واللوائح التي تنطبق عليه. يتعين أن يملك المستخدم الأهلية والصلاحية اللازمة لإنشاء المشروع ورفع المحتوى وتشغيله."],
    ["المحتوى وحقوق النشر", "يتحمل المستخدم وحده مسؤولية امتلاك أو الحصول على كل التراخيص والأذونات اللازمة للصور والفيديو والصوت وملفات PDF والعلامات التجارية والبرامج والبيانات التي يرفعها أو يوزعها. لا يجوز رفع أو نسخ أو بيع أو نشر محتوى ينتهك حقوق الغير."],
    ["المحتوى المحظور", "يُحظر استخدام المنصة لإنشاء أو استضافة أو توزيع محتوى غير قانوني أو احتيالي أو منتهك للملكية الفكرية أو خصوصية الآخرين، أو محتوى يتضمن برمجيات ضارة أو انتحالًا أو تشهيرًا أو استغلالًا أو تحريضًا على العنف أو الكراهية، أو أي محتوى يخالف شروط مزودي الخدمات أو أنظمة الدولة المعمول بها."],
    ["الإبلاغ والمراجعة والإزالة", "يمكن لصاحب الحق أو المتضرر الإبلاغ عن المحتوى المخالف عبر قناة الدعم المعتمدة للمشغل مع تقديم رابط المحتوى وشرح المطالبة وإثبات الصفة عند توفره. يجوز للمشغل تقييد الوصول أو إزالة المحتوى أو تعليق المشروع أو الحساب أثناء المراجعة أو عند وجود مخالفة موثوقة."],
    ["المدفوعات", "لا تُفعّل أي مدفوعات أو اشتراكات إلا من خلال تكامل دفع خادمي موثق وحساب تاجر مهيأ. يلتزم صاحب التطبيق بالأنظمة التجارية والضريبية وسياسات الاسترداد والإفصاح عن السعر الخاصة به. لا يتم اعتبار أي زر معاينة تحصيلًا حقيقيًا ما لم يعُد التحقق الخادمي بنتيجة دفع موثقة."],
    ["الإنفاذ", "قد يؤدي تكرار المخالفات أو التحايل على الضوابط أو تقديم معلومات مضللة إلى تعليق أو إنهاء الوصول. يحتفظ المشغل بالحق في اتخاذ الإجراءات اللازمة لحماية المستخدمين والمنصة والامتثال للطلبات النظامية الصحيحة."],
  ],
  en: [
    ["Acceptance of use", "By using App Builder, you agree to these terms and to laws that apply to you. You must have the authority and capacity to create projects, upload content, and operate your application."],
    ["Content and intellectual property", "You are solely responsible for owning or obtaining every license and permission needed for uploaded images, video, audio, PDFs, brands, software, and data. You may not upload, copy, sell, or publish material that infringes third-party rights."],
    ["Prohibited content", "You may not use the platform to create, host, or distribute unlawful, fraudulent, infringing, privacy-violating, malicious, impersonating, defamatory, exploitative, violent, hateful, or otherwise prohibited content, including content that violates provider terms or applicable law."],
    ["Reporting, review, and removal", "A rights holder or affected person may report suspected violations through the operator's approved support channel with the content link, a description of the claim, and available authority evidence. The operator may restrict access, remove content, or suspend a project or account while reviewing a credible violation."],
    ["Payments", "Payments and subscriptions are activated only through a verified server-side payment integration and a configured merchant account. Each app owner is responsible for commercial, tax, refund, pricing, and disclosure requirements. A preview button is not a real charge unless server verification returns a confirmed payment."],
    ["Enforcement", "Repeated violations, control evasion, or misleading information may result in suspension or termination. The operator may take necessary measures to protect users, the service, and compliance with valid legal requests."],
  ],
};

const privacySections = {
  ar: [
    ["البيانات التي نعالجها", "تعالج المنصة بيانات الحساب الأساسية وبيانات المشروع والصفحات والمكونات والملفات التي يرفعها المستخدم، إضافة إلى سجلات تقنية ضرورية للأمن ومنع إساءة الاستخدام وتشغيل الخدمة."],
    ["أغراض المعالجة", "تُستخدم البيانات لتقديم الحساب ومساحة العمل والتخزين والتصدير والدعم والأمن، وللتحقق من المدفوعات عند تفعيلها. لا ينبغي رفع بيانات شخصية حساسة إلى مشروع إلا عند وجود أساس نظامي مناسب وإشعار واضح للمستخدمين النهائيين."],
    ["الملفات والمحتوى", "تبقى الملفات مرتبطة بالمشروع والحساب اللذين رفعاها. ينبغي للمستخدم عدم رفع محتوى يخص أشخاصًا آخرين دون إذن، وأن يتأكد من وجود سياسة خصوصية مستقلة في التطبيق الذي ينشره عندما يجمع هذا التطبيق بيانات مستخدميه."],
    ["المشاركة والاحتفاظ", "تُشارك البيانات بالقدر اللازم مع مزودي البنية التحتية والتخزين والدفع أو الذكاء الاصطناعي الذين يتم تفعيلهم لتنفيذ الخدمة. تُحتفَظ البيانات للمدة اللازمة لتشغيل الحساب والوفاء بالالتزامات والأمن وتسوية النزاعات، وفق إعدادات الخدمة والقانون الواجب التطبيق."],
    ["الحقوق والطلبات", "يجوز للمستخدم طلب الوصول إلى بياناته أو تصحيحها أو حذفها أو تصديرها ضمن الحدود النظامية والتشغيلية. كما يجوز له الإبلاغ عن محتوى أو طلب خصوصية عبر قناة الدعم المعتمدة للمشغل."],
    ["الأمان", "تُطبق ضوابط وصول وتحقق خادمي لحماية المشاريع والملفات. ومع ذلك، يظل المستخدم مسؤولًا عن كلمات المرور وأذونات الفريق ومفاتيح الخدمات الخارجية التي يضيفها، ولا ينبغي وضع مفاتيح حساسة في واجهة العميل أو داخل الملفات العامة."],
  ],
  en: [
    ["Data we process", "The platform processes core account data, project pages and components, uploaded files, and technical logs needed for security, abuse prevention, and operation."],
    ["Processing purposes", "Data is used to provide the account, workspace, storage, exports, support, security, and—when enabled—payment verification. Sensitive personal data should not be uploaded without an appropriate legal basis and clear notice to end users."],
    ["Files and content", "Files remain associated with the project and account that uploaded them. Do not upload content about other people without permission. Publish a separate privacy policy in any app that collects its end users' data."],
    ["Sharing and retention", "Data is shared only as needed with enabled infrastructure, storage, payment, or AI providers to deliver the service. It is retained for account operation, security, legal obligations, and dispute handling as required by service settings and applicable law."],
    ["Rights and requests", "Subject to legal and operational limits, you may request access, correction, deletion, or export of your data. You may also report content or raise a privacy request through the operator's approved support channel."],
    ["Security", "Server-side access controls and verification protect projects and files. You remain responsible for passwords, team permissions, and external-service keys; never place sensitive keys in the client UI or public files."],
  ],
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { isArabic } = useLocale();
  const language = isArabic ? "ar" : "en";
  const sections = kind === "terms" ? termsSections[language] : privacySections[language];
  const title = kind === "terms" ? (isArabic ? "سياسة الاستخدام" : "Terms of Use") : (isArabic ? "سياسة الخصوصية" : "Privacy Policy");
  const subtitle = kind === "terms" ? (isArabic ? "قواعد واضحة لاستخدام المنصة وحماية الحقوق والمحتوى." : "Clear platform rules that protect rights and content.") : (isArabic ? "كيف تتعامل المنصة مع البيانات والملفات وطلبات الخصوصية." : "How the platform handles data, files, and privacy requests.");
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="container flex items-center justify-between gap-4 py-6"><Link href="/"><BrandMark /></Link><LanguageToggle /></header><main className="container max-w-4xl pb-16"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><BackArrow className="h-4 w-4" />{isArabic ? "العودة للرئيسية" : "Back to home"}</Link><section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"><div className="bg-gradient-to-l from-indigo-700 to-violet-700 p-7 text-white"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white/15 p-3">{kind === "terms" ? <FileCheck2 className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}</span><div><p className="text-xs font-bold tracking-[0.18em] text-white/75">APP BUILDER</p><h1 className="mt-1 text-3xl font-black">{title}</h1></div></div><p className="mt-4 max-w-2xl text-sm leading-7 text-white/90">{subtitle}</p></div><div className="space-y-8 p-7 md:p-9">{kind === "terms" && <aside className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>{isArabic ? "هذه مسودة تشغيلية. ينبغي أن يراجعها مختص قانوني قبل اعتمادها النهائي، خصوصًا عند جمع بيانات شخصية أو بيع محتوى أو تشغيل اشتراكات." : "This is an operational draft. Have qualified counsel review it before final adoption, especially when collecting personal data, selling content, or operating subscriptions."}</p></aside>}{sections.map(([heading, body]) => <section key={heading}><h2 className="text-xl font-black text-slate-950">{heading}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-slate-600">{body}</p></section>)}<div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6"><Link href={kind === "terms" ? "/privacy" : "/terms"}><Button variant="outline">{kind === "terms" ? (isArabic ? "سياسة الخصوصية" : "Privacy Policy") : (isArabic ? "سياسة الاستخدام" : "Terms of Use")}</Button></Link><Link href="/auth"><Button>{isArabic ? "الانتقال إلى الحساب" : "Go to account"}</Button></Link></div></div></section></main></div>;
}
