import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageToggleCompact() {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'es').substring(0, 2);
  const next = current === 'es' ? 'en' : 'es';

  const handleToggle = () => {
    i18n.changeLanguage(next);
    localStorage.setItem('preferred_language', next);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className="gap-1.5 backdrop-blur"
      aria-label="Change language"
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="text-xs font-bold uppercase">
        {current === 'es' ? 'EN' : 'ES'}
      </span>
    </Button>
  );
}
