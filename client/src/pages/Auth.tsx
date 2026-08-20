import { BrandMark } from "@/components/BrandMark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import "./auth-overrides.css";

type AuthMode = "sign-in" | "sign-up" | "forgot" | "reset";

export default function Auth() {
  const { copy, isArabic } = useLocale();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const signIn = trpc.localAuth.signIn.useMutation({ onSuccess: () => setLocation("/app"), onError: () => setErrorMessage(copy("تحقق من البريد الإلكتروني وكلمة المرور.", "Check your email address and password.")) });
  const signUp = trpc.localAuth.signUp.useMutation({ onSuccess: () => setLocation("/app"), onError: error => setErrorMessage(error.message.includes("already exists") ? copy("يوجد حساب مسجل بهذا البريد الإلكتروني.", "An account already exists for this email.") : copy("تعذر إنشاء الحساب. أعد المحاولة.", "Could not create your account. Try again.")) });
  const requestReset = trpc.localAuth.requestPasswordReset.useMutation({ onSuccess: () => setNotice(copy("إذا كان البريد مسجلاً، ستصلك رسالة استعادة صالحة لمدة 30 دقيقة.", "If the email is registered, you will receive a recovery email valid for 30 minutes.")), onError: () => setErrorMessage(copy("تعذر إرسال طلب الاستعادة.", "Could not send the recovery request.")) });
  const resetPassword = trpc.localAuth.resetPassword.useMutation({ onSuccess: () => { setMode("sign-in"); setPassword(""); setPasswordConfirmation(""); setNotice(copy("تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.", "Your password was changed. You can sign in now.")); }, onError: () => setErrorMessage(copy("رابط الاستعادة غير صالح أو انتهت صلاحيته.", "The reset link is invalid or has expired.")) });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "reset") setMode("reset");
    const googleStatus = params.get("google");
    if (googleStatus === "configuration_error") setErrorMessage(copy("لا يمكن بدء تسجيل الدخول عبر Google قبل ضبط رابط إعادة التوجيه في إعدادات Google Cloud.", "Google sign-in needs a valid redirect URI in Google Cloud before it can start."));
    if (googleStatus === "state_error") setErrorMessage(copy("انتهت جلسة Google أو حظر المتصفح ملف التحقق. أعد المحاولة من نافذة عادية من دون حظر ملفات تعريف الارتباط.", "The Google session expired or the browser blocked the verification cookie. Try again in a regular window with cookies enabled."));
    if (googleStatus === "native_error") setErrorMessage(copy("تعذر بدء اختيار حساب Google في التطبيق. تأكد من تثبيت خدمات Google Play وإعداد عميل Android OAuth ثم أعد المحاولة.", "Google account selection could not start in the app. Confirm Google Play services and the Android OAuth client are configured, then try again."));
    if (googleStatus === "exchange_error") setErrorMessage(copy("تعذر استبدال رمز Google. أعد المحاولة، وإذا استمر الخطأ تواصل مع دعم المنصة.", "Google authorization could not be exchanged. Try again; if it continues, contact platform support."));
    if (googleStatus === "identity_error") setErrorMessage(copy("تعذر التحقق من هوية Google أو البريد الإلكتروني. استخدم حساب Google ببريد إلكتروني مؤكد.", "Google identity or email verification failed. Use a Google account with a verified email address."));
    if (googleStatus === "audience_error") setErrorMessage(copy("رفض Google الحساب المختار لأن إعداد جمهور تطبيق Google لا يسمح له بعد. يجب أن يكون نوع الجمهور External/In production أو أن يُضاف الحساب إلى قائمة المستخدمين التجريبيين في Google Auth Platform.", "Google rejected the selected account because the OAuth app audience does not allow it yet. Set the audience to External/In production or add the account as a test user in Google Auth Platform."));
    if (googleStatus === "provider_error") setErrorMessage(copy("أوقف Google عملية تسجيل الدخول أو لم يسمح بها للحساب المختار. جرّب حساب Google آخر أو أكمل الإذن.", "Google stopped the sign-in or did not allow the selected account. Try another Google account or complete consent."));
    if (googleStatus === "account_error") setErrorMessage(copy("تم التحقق من حساب Google، لكن تعذر ربطه بحساب المنصة. أعد المحاولة.", "Your Google account was verified, but it could not be linked to your platform account. Try again."));
    if (googleStatus === "session_error") setErrorMessage(copy("تم التحقق من حساب Google، لكن تعذر حفظ جلسة الدخول. أعد المحاولة من نافذة عادية تسمح بملفات تعريف الارتباط.", "Your Google account was verified, but the sign-in session could not be saved. Try again in a regular browser window that allows cookies."));
  }, [copy]);

  const title = mode === "sign-in" ? copy("مرحبًا بعودتك", "Welcome back") : mode === "sign-up" ? copy("ابدأ رحلتك الإبداعية", "Start your creative journey") : mode === "forgot" ? copy("استعادة الوصول", "Restore access") : copy("كلمة مرور جديدة", "New password");
  const description = mode === "sign-in" ? copy("ادخل إلى مساحة عملك وأنشئ تطبيقك القادم.", "Enter your workspace and create your next app.") : mode === "sign-up" ? copy("أنشئ حسابك لتبدأ بناء تطبيقك الاحترافي.", "Create your account to build your professional app.") : mode === "forgot" ? copy("سنرسل رابط إعادة التعيين إلى بريدك الإلكتروني.", "We’ll send a reset link to your email address.") : copy("اختر كلمة مرور جديدة لا تقل عن 8 أحرف لحماية حسابك.", "Choose a new password of at least 8 characters to protect your account.");

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    if (mode === "sign-in") signIn.mutate({ email, password });
    if (mode === "sign-up") signUp.mutate({ name, email, password });
    if (mode === "forgot") requestReset.mutate({ email });
    if (mode === "reset") {
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) { setErrorMessage(copy("رابط الاستعادة لا يحتوي رمزًا صالحًا.", "The recovery link does not include a valid token.")); return; }
      if (password !== passwordConfirmation) { setErrorMessage(copy("كلمتا المرور غير متطابقتين.", "The passwords do not match.")); return; }
      resetPassword.mutate({ token, password });
    }
  }

  return <div className="auth-page">
    <div className="auth-nav"><Link href="/"><BrandMark /></Link><LanguageToggle /></div>
    <div className={`auth-grid${isArabic ? " auth-grid-rtl" : ""}`} dir="ltr">
      <section className="auth-showcase" dir={isArabic ? "rtl" : "ltr"}>
        <div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" />
        <div className="relative z-10 mx-auto w-full max-w-md text-start">
          <div className="eyebrow-light"><Sparkles className="h-3.5 w-3.5" />{copy("منصة البناء الاحترافية", "Professional app building platform")}</div>
          <h1>{copy("حوّل فكرتك إلى تطبيق موبايل متكامل.", "Turn your idea into a complete mobile app.")}</h1>
          <p>{copy("اختر قالبًا، حرر الشاشات، ثم جهّز ملف التصدير من مساحة واحدة منظمة.", "Choose a template, edit screens, and prepare your export from one focused workspace.")}</p>
          <div className="auth-stat-row"><div><strong>7</strong><span>{copy("فئات جاهزة", "ready categories")}</span></div><div><strong>RTL</strong><span>{copy("دعم عربي كامل", "Arabic ready")}</span></div><div><strong>3</strong><span>{copy("صيغ تصدير", "export formats")}</span></div></div>
        </div>
      </section>
      <section className="auth-card-wrap" dir={isArabic ? "rtl" : "ltr"}>
        <div className="auth-card">
          <div className="mb-8"><p className="section-kicker">APP BUILDER</p><h2>{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>
          {notice && <div className="form-notice" role="status">{notice}</div>}
          {errorMessage && <div className="form-error" role="alert">{errorMessage}</div>}
          <form onSubmit={submit} className="space-y-4">
            {mode === "sign-up" && <div className="space-y-2"><Label>{copy("الاسم الكامل", "Full name")}</Label><Input value={name} onChange={event => setName(event.target.value)} required minLength={2} placeholder={copy("اكتب اسمك", "Enter your name")} /></div>}
            {mode !== "reset" && <div className="space-y-2"><Label>{copy("البريد الإلكتروني", "Email address")}</Label><div className="input-icon-wrap"><Mail /><Input value={email} onChange={event => setEmail(event.target.value)} required type="email" placeholder="name@example.com" /></div></div>}
            {mode !== "forgot" && <div className="space-y-2"><div className="flex items-center justify-between"><Label>{copy("كلمة المرور", "Password")}</Label>{mode === "sign-in" && <button type="button" onClick={() => { setMode("forgot"); setNotice(""); setErrorMessage(""); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">{copy("نسيت كلمة المرور؟", "Forgot password?")}</button>}</div><div className="input-icon-wrap"><LockKeyhole /><Input value={password} onChange={event => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} placeholder="••••••••" minLength={8} /><button type="button" onClick={() => setShowPassword(value => !value)} className="password-visibility">{showPassword ? <EyeOff /> : <Eye />}</button></div></div>}
            {mode === "reset" && <div className="space-y-2"><Label>{copy("تأكيد كلمة المرور الجديدة", "Confirm new password")}</Label><div className="input-icon-wrap"><LockKeyhole /><Input value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} required type={showPassword ? "text" : "password"} placeholder="••••••••" minLength={8} /></div></div>}
            <Button className="primary-action w-full" type="submit" disabled={signIn.isPending || signUp.isPending || requestReset.isPending || resetPassword.isPending}>{(signIn.isPending || signUp.isPending || requestReset.isPending || resetPassword.isPending) && <Loader2 className="animate-spin" />}{mode === "sign-in" ? copy("تسجيل الدخول", "Sign in") : mode === "sign-up" ? copy("إنشاء حساب", "Create account") : mode === "forgot" ? copy("إرسال رابط الاستعادة", "Send reset link") : copy("حفظ كلمة المرور الجديدة", "Save new password")}</Button>
          </form>
          {mode !== "forgot" && mode !== "reset" && <><div className="auth-divider"><span>{copy("أو", "or")}</span></div><Button type="button" variant="outline" className="google-button w-full" onClick={() => window.location.assign("/api/auth/google")}><span className="google-g">G</span>{copy("المتابعة عبر Google", "Continue with Google")}</Button></>}
          <p className="auth-switch">{mode === "sign-in" ? copy("ليس لديك حساب؟", "New to App Builder?") : mode === "forgot" || mode === "reset" ? copy("تذكرت كلمة المرور؟", "Remembered your password?") : copy("لديك حساب بالفعل؟", "Already have an account?")} <button onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setNotice(""); setErrorMessage(""); }} className="font-bold text-indigo-600">{mode === "sign-in" ? copy("إنشاء حساب", "Create account") : copy("تسجيل الدخول", "Sign in")}</button></p>
        </div>
      </section>
    </div>
  </div>;
}
