import { Languages } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

export function LanguageToggle() {
  const { locale, toggleLocale } = useLocale();
  return (
    <button className="language-toggle" onClick={toggleLocale} aria-label="Change language">
      <Languages className="h-4 w-4" />
      <span>{locale === "ar" ? "English" : "العربية"}</span>
    </button>
  );
}
