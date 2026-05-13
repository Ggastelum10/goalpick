import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage, availableLanguages } from '@/hooks/useLanguage';
import { useSetupScreen } from '@/hooks/useSetupScreen';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';
import { Loader2, ChevronDown } from 'lucide-react';

export function SetupScreen() {
  const { t } = useTranslation();
  const { currentLanguage, setLanguage } = useLanguage();
  const { completeSetup, isCompleting, pendingDocuments } = useSetupScreen();

  // Track acceptance per document
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  // Reset accepted state when pending docs change
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    pendingDocuments.forEach(doc => { initial[doc.id] = false; });
    setAccepted(initial);
  }, [pendingDocuments]);

  const allAccepted = pendingDocuments.length > 0 && pendingDocuments.every(doc => accepted[doc.id]);

  const handleContinue = async () => {
    if (!allAccepted) return;
    await completeSetup();
  };

  const labelForType = (type: string) => {
    if (type === 'terms_and_conditions') return t('setup.acceptTerms');
    if (type === 'privacy_policy') return t('setup.acceptPrivacy');
    return type;
  };

  const titleForType = (type: string) => {
    if (type === 'terms_and_conditions') return t('setup.termsTitle');
    if (type === 'privacy_policy') return t('setup.privacyTitle');
    return type;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 px-6 pt-6 pb-2 shrink-0">
          <img src={goalpickLogo} alt="GoalPick" className="h-10 w-auto" />
          <h1 className="text-xl font-bold text-foreground">{t('setup.title')}</h1>
          <p className="text-sm text-muted-foreground text-center">{t('setup.subtitle')}</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 pt-3 pb-6 space-y-3">
            {/* Language Selection */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t('setup.chooseLanguage')}</p>
              <div className="grid grid-cols-2 gap-3">
                {availableLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border-2 p-3 transition-all",
                      currentLanguage === lang.code
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="font-medium text-foreground">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Legal Documents */}
            {pendingDocuments.map(doc => (
              <div key={doc.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`accept-${doc.id}`}
                    checked={!!accepted[doc.id]}
                    onCheckedChange={(v) => setAccepted(prev => ({ ...prev, [doc.id]: !!v }))}
                  />
                  <Label htmlFor={`accept-${doc.id}`} className="text-sm leading-tight cursor-pointer">
                    {labelForType(doc.document_type)}
                  </Label>
                </div>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-6">
                    <span>{titleForType(doc.document_type)}</span>
                    <ChevronDown className="h-3 w-3 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-1 max-h-32 overflow-y-auto rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground whitespace-pre-line">
                        {doc.content || '(See attached PDF)'}
                      </p>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-xs mt-1 inline-block"
                        >
                          View PDF
                        </a>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}

            {pendingDocuments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('setup.termsPlaceholder')}</p>
            )}
          </div>
        </div>

        {/* Continue Button — pinned at bottom */}
        <div className="px-6 py-4 border-t shrink-0">
          <Button
            className="w-full"
            disabled={!allAccepted || isCompleting}
            onClick={handleContinue}
          >
            {isCompleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t('setup.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
