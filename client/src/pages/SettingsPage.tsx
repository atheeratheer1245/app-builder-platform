import { AppShell } from "@/components/AppShell";
import { WorkspaceAccess } from "@/components/WorkspaceAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { Loader2, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export default function SettingsPage() {
  const { copy, isArabic } = useLocale();
  const profile = trpc.localAuth.profile.useQuery(undefined, { retry: false });
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [notice, setNotice] = useState("");
  const update = trpc.localAuth.updateProfile.useMutation({ onSuccess: () => { profile.refetch(); setNotice(copy("تم حفظ بيانات الحساب.", "Account details saved.")); }, onError: () => setNotice(copy("تعذر حفظ بيانات الحساب.", "Could not save account details.")) });
  const accounts = trpc.localAuth.admin.listAccounts.useQuery(undefined, { enabled: profile.data?.role === "admin", retry: false });
  useEffect(() => { if (profile.data?.name) setName(profile.data.name); if (profile.data?.mobile) setMobile(profile.data.mobile); }, [profile.data?.name, profile.data?.mobile]);
  function submit(event: FormEvent) { event.preventDefault(); update.mutate({ name, mobile }); }
  return <AppShell><WorkspaceAccess><div className="page-heading"><div><p className="section-kicker">{copy("الحساب", "ACCOUNT")}</p><h1>{copy("الإعدادات والملف الشخصي", "Settings and profile")}</h1><p>{copy("أدر بيانات حسابك وتحقق من مستوى صلاحيتك في المنصة.", "Manage your account details and review your access level.")}</p></div></div><div className="settings-layout"><section className="workspace-panel settings-card"><div className="settings-card-heading"><span><UserRound /></span><div><h2>{copy("بيانات الحساب", "Account details")}</h2><p>{copy("حدّث اسمك ورقم جوالك الاختياري لمعلومات حسابك فقط.", "Update your name and optional mobile number for your account details only.")}</p></div></div>{profile.isLoading ? <Loader2 className="animate-spin" /> : <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label>{copy("الاسم", "Name")}</Label><Input value={name} onChange={event => setName(event.target.value)} minLength={2} required /></div><div className="space-y-2"><Label>{copy("رقم الجوال السعودي — اختياري", "Saudi mobile number — optional")}</Label><Input dir="ltr" value={mobile} onChange={event => setMobile(event.target.value)} placeholder="05XXXXXXXX" /></div><div className="space-y-2"><Label>{copy("البريد الإلكتروني", "Email")}</Label><Input value={profile.data?.email ?? ""} disabled /></div><div className="role-line"><span>{copy("دور الحساب", "Account role")}</span><strong>{profile.data?.role === "admin" ? copy("مدير", "Administrator") : copy("مستخدم", "User")}</strong></div>{notice && <p className="form-notice" role="status">{notice}</p>}<Button className="workspace-primary" type="submit" disabled={update.isPending}>{update.isPending && <Loader2 className="animate-spin" />}{copy("حفظ البيانات", "Save details")}</Button></form>}</section>{profile.data?.role === "admin" && <section className="workspace-panel settings-card"><div className="settings-card-heading"><span><ShieldCheck /></span><div><h2>{copy("إدارة الحسابات", "Account management")}</h2><p>{copy("هذه القائمة متاحة لدور المدير فقط.", "This list is available to administrators only.")}</p></div></div>{accounts.isLoading ? <Loader2 className="animate-spin" /> : <div className="account-list">{accounts.data?.map(account => <article key={account.id}><div><strong>{account.name || copy("دون اسم", "Unnamed")}</strong><span>{account.email}</span></div><span className="status-pill">{account.role === "admin" ? copy("مدير", "Admin") : copy("مستخدم", "User")}</span></article>)}</div>}</section>}</div></WorkspaceAccess></AppShell>;
}
