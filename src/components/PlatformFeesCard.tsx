import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Info, CreditCard } from 'lucide-react';
import { usePlatformFee } from '@/hooks/usePlatformFee';
import { useTranslation } from 'react-i18next';

interface PlatformFeesCardProps {
  expectedMembers: number;
  coverMemberFees: boolean;
  onCoverMemberFeesChange: (checked: boolean) => void;
}

export function PlatformFeesCard({ 
  expectedMembers, 
  coverMemberFees, 
  onCoverMemberFeesChange 
}: PlatformFeesCardProps) {
  const { data: platformFee, isLoading } = usePlatformFee();
  const { t, i18n } = useTranslation();
  
  const feeAmount = platformFee?.amount ?? 1;
  const feeCurrency = platformFee?.currency ?? 'USD';
  
  // Calculate licenses needed (expected members minus owner who is waived)
  const licensesNeeded = Math.max(0, expectedMembers - 1);
  const totalCost = licensesNeeded * feeAmount;

  const formatCurrency = (amount: number, currency: string) => {
    const locale = i18n.language?.startsWith('es') ? 'es-MX' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('leagues.platformFees.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t('leagues.platformFees.title')}
        </CardTitle>
        <CardDescription>
          {t('leagues.platformFees.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground"
           dangerouslySetInnerHTML={{
             __html: t('leagues.platformFees.body', {
               fee: `<strong>${formatCurrency(feeAmount, feeCurrency)}</strong>`,
               currency: feeCurrency,
               interpolation: { escapeValue: false }
             })
           }}
        />

        <div className="border-t pt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="cover-fees"
              checked={coverMemberFees}
              onCheckedChange={(checked) => onCoverMemberFeesChange(checked === true)}
            />
            <div className="space-y-2 flex-1">
              <Label htmlFor="cover-fees" className="font-medium cursor-pointer">
                {t('leagues.platformFees.coverLabel')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('leagues.platformFees.coverHelp', { count: expectedMembers })}
              </p>
              
              {coverMemberFees && (
                <>
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('leagues.platformFees.totalLabel')}</span>
                      <span className="font-semibold">
                        {t('leagues.platformFees.totalSummary', {
                          count: licensesNeeded,
                          fee: formatCurrency(feeAmount, feeCurrency),
                          total: formatCurrency(totalCost, feeCurrency),
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('leagues.platformFees.creatorWaived')}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400 mt-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <p>
                      {t('leagues.platformFees.infoBanner')}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
