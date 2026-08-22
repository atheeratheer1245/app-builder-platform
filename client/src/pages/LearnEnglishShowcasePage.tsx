import { BrandMark } from "@/components/BrandMark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, CirclePlay, Ear, Headphones, Layers3, ListChecks, LockKeyhole, Mic2, Play, RotateCcw, Search, Sparkles, SpellCheck2, Volume2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import "./learn-english-showcase.css";

const levels = [
  { code: "A1", ar: "البداية", en: "Foundation", lessons: 18, color: "blue" },
  { code: "A2", ar: "المبتدئ", en: "Elementary", lessons: 22, color: "sky" },
  { code: "B1", ar: "المتوسط", en: "Intermediate", lessons: 26, color: "violet" },
  { code: "B2", ar: "فوق المتوسط", en: "Upper-intermediate", lessons: 28, color: "indigo" },
  { code: "C1", ar: "المتقدم", en: "Advanced", lessons: 24, color: "navy" },
  { code: "C2", ar: "المتمكن", en: "Proficient", lessons: 20, color: "slate" },
] as const;

const words = [
  { word: "curious", ar: "فضولي", sentence: "She is curious about new ideas." },
  { word: "journey", ar: "رحلة", sentence: "Learning a language is a journey." },
  { word: "practice", ar: "يتدرّب", sentence: "Practice a little every day." },
  { word: "confident", ar: "واثق", sentence: "Speak with a confident voice." },
] as const;

const readingText = "Maya starts her day with a short English podcast. She writes down three new words, reads a small article, and then practises speaking for five minutes. Small, repeated steps help her feel more comfortable using English.";
const dictationAnswer = "Good morning";

export function LearnEnglishShowcasePage() {
  const { copy, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const [selectedLevel, setSelectedLevel] = useState("A1");
  const [wordIndex, setWordIndex] = useState(0);
  const [translation, setTranslation] = useState(false);
  const [dictation, setDictation] = useState("");
  const [dictationState, setDictationState] = useState<"idle" | "correct" | "retry">("idle");
  const [notice, setNotice] = useState("");
  const word = words[wordIndex];
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setNotice(copy("النطق غير متاح في هذا المتصفح.", "Pronunciation is not available in this browser.")); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  };
  const checkDictation = () => setDictationState(dictation.trim().toLocaleLowerCase() === dictationAnswer.toLowerCase() ? "correct" : "retry");
  return <div className="learn-showcase" dir={isArabic ? "rtl" : "ltr"}>
    <header className="learn-nav"><Link href="/"><BrandMark /></Link><nav><Link href="/templates">{copy("القوالب", "Templates")}</Link><a href="#levels">{copy("المستويات", "Levels")}</a><a href="#practice">{copy("التدريب", "Practice")}</a></nav><div className="learn-nav-actions"><LanguageToggle /><Link href="/templates"><Button variant="outline">{copy("ابدأ بالقالب", "Use template")}</Button></Link></div></header>
    <main>
      <section className="learn-hero"><div className="learn-hero-copy"><p className="learn-eyebrow"><Sparkles />{copy("نموذج استكشافي لقالب التطبيق التعليمي", "EDUCATION TEMPLATE EXPLORATION")}</p><h1>{copy("تعلّم الإنجليزية", "Learn English")}</h1><p>{copy("نموذج عملي يوضّح كيف يمكن أن تجمع القراءة والنطق والإملاء والاستماع والكلمات ومسارات المستويات في تطبيق تعليمي واحد قابل للتخصيص.", "A practical model showing how reading, pronunciation, spelling, listening, vocabulary, and level paths can live together in one editable educational app.")}</p><div className="learn-hero-actions"><a href="#practice"><Button className="learn-primary">{copy("ابدأ التدريب", "Start practising")}<Arrow /></Button></a><a className="learn-secondary" href="#levels"><Layers3 />{copy("استكشف المستويات", "Explore levels")}</a></div><div className="learn-hero-stat"><div><strong>6</strong><span>{copy("مسارات مستوى", "level paths")}</span></div><div><strong>5</strong><span>{copy("مهارات تفاعلية", "interactive skills")}</span></div><div><strong>100%</strong><span>{copy("قابل للتخصيص", "customizable")}</span></div></div></div><div className="learn-hero-art"><img src="/manus-storage/learn-english-hero_183d856a.jpg" alt="" /><div className="learn-float-card"><Headphones /><div><small>{copy("درس اليوم", "TODAY'S LESSON")}</small><strong>{copy("استمع ثم تكلّم", "Listen, then speak")}</strong></div><Play /></div><div className="learn-word-pop"><span>new word</span><strong>curious</strong><small>{copy("فضولي", "curious")}</small></div></div></section>

      <section id="levels" className="learn-section"><div className="learn-section-head"><div><p className="learn-eyebrow"><Layers3 />{copy("مسار المستوى", "LEVEL PATH")}</p><h2>{copy("تعلم خطوةً خطوة", "Learn, one step at a time")}</h2><p>{copy("اعرض المراحل والدروس والتمارين بالطريقة التي تناسب محتوى تطبيقك.", "Present stages, lessons, and practice activities in the structure that fits your app content.")}</p></div><span className="learn-badge">{copy("قائمة تنقل + بطاقات + أزرار", "List + cards + buttons")}</span></div><div className="learn-level-grid">{levels.map(level => <button type="button" key={level.code} className={`learn-level-card ${selectedLevel === level.code ? "active" : ""} ${level.color}`} onClick={() => { setSelectedLevel(level.code); setNotice(copy(`تم اختيار مستوى ${level.code} للعرض.`, `${level.code} is selected for preview.`)); }}><span>{level.code}</span><strong>{isArabic ? level.ar : level.en}</strong><small>{level.lessons} {copy("درسًا", "lessons")}</small>{selectedLevel === level.code && <Check />}</button>)}</div><div className="learn-level-preview"><div><span>{copy("المستوى المحدد", "SELECTED LEVEL")}</span><strong>{selectedLevel} · {isArabic ? levels.find(level => level.code === selectedLevel)?.ar : levels.find(level => level.code === selectedLevel)?.en}</strong></div><div className="learn-progress"><span style={{ width: selectedLevel === "A1" ? "68%" : "35%" }} /></div><small>{copy("يُستخدم شريط التقدم لعرض إنجاز المتعلم داخل المشروع.", "Use a progress bar to show learner completion inside your project.")}</small></div></section>

      <section id="practice" className="learn-section learn-practice"><div className="learn-section-head"><div><p className="learn-eyebrow"><BookOpenCheck />{copy("مختبر المهارات", "SKILLS LAB")}</p><h2>{copy("كل مهارة في تجربة واضحة", "Each skill in a clear experience")}</h2><p>{copy("هذه تمارين توضيحية قابلة للتفاعل، تبيّن كيف تُستخدم النصوص والأزرار والقوائم والصوت والصورة والخلفيات في القالب التعليمي.", "These are interactive illustrative activities showing how text, buttons, lists, audio, images, and backgrounds work in the education template.")}</p></div><span className="learn-badge">{copy("مكونات قابلة للتحرير", "Editable components")}</span></div><div className="learn-practice-grid">
        <article className="learn-reading-card"><div className="learn-card-icon"><BookOpenCheck /></div><p className="learn-card-label">{copy("قراءة", "READING")}</p><h3>{copy("روتين مايا الصباحي", "Maya's morning routine")}</h3><blockquote>{readingText}</blockquote>{translation && <p className="learn-translation">{copy("تبدأ مايا يومها ببودكاست إنجليزي قصير. تكتب ثلاث كلمات جديدة، وتقرأ مقالة صغيرة، ثم تتدرّب على التحدث لخمس دقائق.", "Maya begins with a short English podcast, notes three new words, reads an article, then practises speaking for five minutes.")}</p>}<button type="button" onClick={() => setTranslation(value => !value)}>{translation ? copy("إخفاء المعنى", "Hide meaning") : copy("إظهار المعنى", "Show meaning")}</button></article>
        <article className="learn-speaking-card"><div className="learn-card-icon"><Mic2 /></div><p className="learn-card-label">{copy("نطق واستماع", "PRONUNCIATION & LISTENING")}</p><h3>“{copy("Good morning, how are you?", "Good morning, how are you?")}”</h3><p>{copy("اضغط لتشغيل نطقٍ إنجليزي من المتصفح، ثم كرّر العبارة بصوتك.", "Tap to play browser-based English pronunciation, then repeat the sentence aloud.")}</p><button type="button" onClick={() => speak("Good morning, how are you?")}><Volume2 />{copy("استمع إلى العبارة", "Listen to sentence")}</button><div className="learn-wave"><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
        <article className="learn-dictation-card"><div className="learn-card-icon"><SpellCheck2 /></div><p className="learn-card-label">{copy("إملاء", "DICTATION")}</p><h3>{copy("اكتب ما تسمعه", "Type what you hear")}</h3><p>{copy("استمع إلى العبارة، ثم اكتبها في الحقل.", "Listen to the phrase, then type it in the field.")}</p><div className="learn-dictation-controls"><button type="button" aria-label={copy("تشغيل الإملاء", "Play dictation")} onClick={() => speak(dictationAnswer)}><Volume2 /></button><input value={dictation} onChange={event => { setDictation(event.target.value); setDictationState("idle"); }} placeholder={copy("اكتب بالإنجليزية", "Type in English")} /><button type="button" onClick={checkDictation}>{copy("تحقق", "Check")}</button></div>{dictationState !== "idle" && <p className={`learn-feedback ${dictationState}`}>{dictationState === "correct" ? copy("إجابة صحيحة. أحسنت!", "Correct answer. Well done!") : copy("حاول مرة أخرى؛ الاستماع البطيء متاح من زر الصوت.", "Try again; slow listening is available from the audio button.")}</p>}</article>
        <article className="learn-vocabulary-card"><div className="learn-card-icon"><Sparkles /></div><p className="learn-card-label">{copy("كلمات", "VOCABULARY")}</p><div className="learn-flashcard"><span>{copy("الكلمة", "WORD")}</span><h3>{word.word}</h3><strong>{word.ar}</strong><p>{word.sentence}</p><button type="button" onClick={() => speak(word.word)}><Volume2 />{copy("اسمع الكلمة", "Hear word")}</button></div><div className="learn-flash-actions"><button type="button" onClick={() => setWordIndex(index => (index + words.length - 1) % words.length)}><ArrowLeft /></button><span>{wordIndex + 1} / {words.length}</span><button type="button" onClick={() => setWordIndex(index => (index + 1) % words.length)}><ArrowRight /></button></div></article>
      </div><div className="learn-skill-footer"><span><Ear />{copy("الاستماع", "Listening")}</span><span><CirclePlay />{copy("فيديو درس", "Lesson video")}</span><span><Headphones />{copy("صوت الدرس", "Lesson audio")}</span><span><Search />{copy("بحث في الدروس", "Lesson search")}</span><span><ListChecks />{copy("قائمة واجبات", "Task list")}</span></div></section>

      <section className="learn-section learn-components"><div><p className="learn-eyebrow"><Layers3 />{copy("خريطة القالب", "TEMPLATE MAP")}</p><h2>{copy("كل العناصر التي يحتاجها تطبيق تعليمي", "Every element an education app needs")}</h2><p>{copy("استخدم الصفحات والبطاقات والقوائم والأزرار والوسائط والخلفيات ومنصة الدفع الاختيارية لبناء تجربة تعليمية تناسب فكرتك.", "Use pages, cards, lists, buttons, media, backgrounds, and an optional payment platform to build the learning experience that fits your idea.")}</p><div className="learn-component-chips">{["Background", "Card", "Button", "List", "Image", "Video", "Audio", "ImageAnimation", "PaymentPlatform"].map(component => <span key={component}><Check />{component}</span>)}</div></div><aside className="learn-premium-card"><LockKeyhole /><span>{copy("مسار اختياري مدفوع", "OPTIONAL PAID PATH")}</span><h3>{copy("دروس ومحتوى خاص", "Premium lessons & content")}</h3><p>{copy("يوضّح هذا المكان أين يمكن ربط اشتراك أو منتج مدفوع داخل مشروعك الحقيقي.", "This area shows where an optional subscription or paid product can be connected in your real project.")}</p><button type="button" onClick={() => setNotice(copy("هذه بطاقة توضيحية لمنصة الدفع الاختيارية داخل القالب.", "This is an illustrative card for the optional payment platform in the template."))}>{copy("عرض مسار الدفع", "View payment path")}<Arrow /></button></aside></section>
      {notice && <div className="learn-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")}><RotateCcw /></button></div>}
    </main><footer className="learn-footer"><div><BrandMark /><p>{copy("نموذج تعلّم الإنجليزية لتوضيح إمكانات قالب التطبيق التعليمي.", "Learn English is a capability showcase for the education app template.")}</p></div><Link href="/templates">{copy("استكشف القوالب", "Explore templates")}<Arrow /></Link></footer>
  </div>;
}
