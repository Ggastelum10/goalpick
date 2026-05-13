import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeagueSettingsDialog } from '@/components/LeagueSettingsDialog';
import type { League } from '@/hooks/useLeagues';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  leagueId: string;
  leagueName: string;
}

/**
 * Admin entry point that opens the full league settings dialog for ANY league.
 * Bypasses the start-of-tournament lock (admins can always edit).
 */
export function AdminEditLeagueButton({ leagueId, leagueName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [league, setLeague] = useState<(League & { prize_pool?: number; expected_members?: number }) | null>(null);
  const qc = useQueryClient();

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      setLeague(data as unknown as League & { prize_pool?: number; expected_members?: number });
      setOpen(true);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load "${leagueName}"`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      // Refresh admin list to pick up any edits.
      qc.invalidateQueries({ queryKey: ['admin-leagues'] });
      setLeague(null);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleOpen}
        disabled={loading}
        aria-label={`Edit ${leagueName} settings`}
        title="Edit league settings"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Settings className="h-3.5 w-3.5" />
        )}
      </Button>

      {league && (
        <LeagueSettingsDialog
          open={open}
          onOpenChange={handleOpenChange}
          league={league}
          // Admin override: allow editing regardless of tournament state
          hasStarted={false}
          firstMatchDate={null}
        />
      )}
    </>
  );
}

export default AdminEditLeagueButton;
