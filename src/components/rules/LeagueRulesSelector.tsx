import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserLeague } from '@/hooks/useUserLeagues';

interface LeagueRulesSelectorProps {
  leagues: UserLeague[] | undefined;
  selectedLeagueId: string;
  onSelect: (value: string) => void;
}

export function LeagueRulesSelector({ leagues, selectedLeagueId, onSelect }: LeagueRulesSelectorProps) {
  const { t } = useTranslation();
  const count = leagues?.length ?? 0;

  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{t('dashboard.viewingLeague')}</span>
        <span className="text-sm font-semibold">{leagues![0].name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{t('dashboard.viewingLeague')}</span>
      <Select value={selectedLeagueId} onValueChange={onSelect}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {leagues?.map(league => (
            <SelectItem key={league.id} value={league.id}>
              {league.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
