import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { Loader2, LockKeyhole } from "lucide-react";
import { Link } from "wouter";

export function WorkspaceAccess({ children }: { children: React.ReactNode }) {
  const { copy } = useLocale();
  const account = trpc.localAuth.me.useQuery(undefined, { retry: false });
  if (account.isLoading) return <div className="workspace-access-state"><Loader2 className="animate-spin" /><span>{copy("يتم التحقق من جلستك…", "Checking your session…")}</span></div>;
  if (!account.data) return <div className="workspace-access-state"><div className="access-icon"><LockKeyhole /></div><h1>{copy("سجّل الدخول للوصول إلى مساحة العمل", "Sign in to access your workspace")}</h1><p>{copy("أنشئ حسابًا أو سجّل الدخول لمتابعة مشاريعك وقوالبك وملفات التصدير.", "Create an account or sign in to continue to your projects, templates, and exports.")}</p><Link href="/auth"><Button className="workspace-primary">{copy("تسجيل الدخول", "Sign in")}</Button></Link></div>;
  return <>{children}</>;
}
