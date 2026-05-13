import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { CountdownTimer } from '@/components/CountdownTimer';
import { formatTournamentLong, formatLocalLong } from '@/lib/tournamentTime';
import type { AvailabilityStage } from '@/lib/tournamentTime';

interface RoundOpeningCardProps {
  /** The locked stage (e.g. 'round_of_32'). */
  stage: Exclude<AvailabilityStage, 'group'>;
  /** When the stage opens for predictions. */
  opensAt: Date | null;
  /** Human label for the predecessor stage (translated). */
  previousLabel: string;
  /** Human label for the locked stage (translated). */
  stageLabel: string;
}

/**
 * Locked-stage banner shown in Phase-by-Phase mode while the previous round
 * is still in progress. Includes a live countdown to the opening time.
 */
export function RoundOpeningCard({
  opensAt,
  previousLabel,
  stageLabel,
}: RoundOpeningCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-4 sm:py-5">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="rounded-full bg-primary/10 p-3 flex-shrink-0">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <h3 className="font-semibold text-base sm:text-lg">
              {t('knockoutBracket.roundOpensIn.title', {
                stage: stageLabel,
                previous: previousLabel,
              })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('knockoutBracket.roundOpensIn.rule')}
            </p>

            {opensAt && (
              <div className="space-y-0.5 pt-1 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">
                    {t('knockoutBracket.roundOpensIn.opensAt', {
                      date: formatTournamentLong(opensAt),
                    })}
                  </span>
                </div>
                <div>
                  {t('knockoutBracket.roundOpensIn.yourTime', {
                    date: formatLocalLong(opensAt),
                  })}
                </div>
              </div>
            )}
          </div>

          {opensAt && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-primary/30 bg-background/60 px-3 py-3 sm:px-5 sm:py-4 w-full sm:w-auto min-w-0 max-w-full overflow-hidden">
              <span className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">
                {t('knockoutBracket.roundOpensIn.countdown')}
              </span>
              <CountdownTimer
                targetDate={opensAt}
                size="fluid"
                className="gap-1 sm:gap-2 md:gap-3 w-full justify-center"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}