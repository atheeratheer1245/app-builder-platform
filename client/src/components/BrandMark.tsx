import { useLocale } from "@/contexts/LocaleContext";

const LOGO_URL = "/manus-storage/appbuilder-app-icon_ff77e513.png";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { copy } = useLocale();
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="brand-logo-wrap shrink-0">
        <img src={LOGO_URL} alt={copy("أيقونة App Builder", "App Builder icon")} className="brand-logo-image" />
      </div>
      {!compact && (
        <div className="min-w-0 leading-none">
          <p className="font-display text-[17px] font-extrabold tracking-[-0.04em] text-slate-950">App Builder</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-500">Build • Design • Deploy</p>
        </div>
      )}
    </div>
  );
}
