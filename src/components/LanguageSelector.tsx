import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage, availableLanguages } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LanguageSelectorProps {
  variant?: 'select' | 'dropdown' | 'compact';
  className?: string;
}

export function LanguageSelector({ variant = 'select', className }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { currentLanguage, setLanguage, getLanguageInfo } = useLanguage();

  const handleLanguageChange = async (langCode: string) => {
    await setLanguage(langCode);
    const langInfo = getLanguageInfo(langCode);
    toast.success(t('toast.languageChanged', { language: langInfo.name }));
  };

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9", className)}
            aria-label={t('language.selectLanguage')}
          >
            <Globe className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          {availableLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                "cursor-pointer gap-2",
                currentLanguage === lang.code && "bg-primary/10 text-primary"
              )}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn("gap-2", className)}>
            <span className="text-base">{getLanguageInfo(currentLanguage).flag}</span>
            <span className="hidden sm:inline">{getLanguageInfo(currentLanguage).name}</span>
            <Globe className="h-4 w-4 ml-1 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          {availableLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                "cursor-pointer gap-2",
                currentLanguage === lang.code && "bg-primary/10 text-primary"
              )}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default: Select variant
  return (
    <Select value={currentLanguage} onValueChange={handleLanguageChange}>
      <SelectTrigger className={cn("w-[180px]", className)}>
        <div className="flex items-center gap-2">
          <span className="text-base">{getLanguageInfo(currentLanguage).flag}</span>
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableLanguages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
