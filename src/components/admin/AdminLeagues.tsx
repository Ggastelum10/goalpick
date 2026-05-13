import { useState } from 'react';
import {
  useAdminLeagues,
  useWaivePlatformFee,
  useDeleteLeague,
  useToggleLeagueFeeWaiver,
  type AdminLeague,
} from '@/hooks/useAdminLeagues';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LeagueLogo } from '@/components/LeagueLogo';
import { AdminEditLeagueButton } from './AdminEditLeagueButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronRight, Search, Trash2, Shield, RefreshCw, Gift, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export function AdminLeagues() {
  const { data: leagues, isLoading } = useAdminLeagues();
  const waiveFee = useWaivePlatformFee();
  const deleteLeague = useDeleteLeague();
  const toggleWaiver = useToggleLeagueFeeWaiver();
  const [search, setSearch] = useState('');
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);

  const filtered = (leagues || []).filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.owner_display_name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> League Management
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leagues or owners..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>League</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead className="text-right">Entry Fee</TableHead>
              <TableHead className="text-right">Platform Fees</TableHead>
              <TableHead className="text-center">Waive Fees</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No leagues found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(league => (
                <LeagueRow
                  key={league.id}
                  league={league}
                  isExpanded={expandedLeague === league.id}
                  onToggle={() => setExpandedLeague(prev => prev === league.id ? null : league.id)}
                  onWaiveFee={(userId) => waiveFee.mutate({ leagueId: league.id, userId })}
                  onDelete={() => deleteLeague.mutate(league.id)}
                  onToggleWaiver={(waived) => toggleWaiver.mutate({ leagueId: league.id, waived })}
                  isDeleting={deleteLeague.isPending}
                  isWaiving={waiveFee.isPending}
                  isTogglingWaiver={toggleWaiver.isPending}
                />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LeagueRow({
  league,
  isExpanded,
  onToggle,
  onWaiveFee,
  onDelete,
  onToggleWaiver,
  isDeleting,
  isWaiving,
  isTogglingWaiver,
}: {
  league: AdminLeague;
  isExpanded: boolean;
  onToggle: () => void;
  onWaiveFee: (userId: string) => void;
  onDelete: () => void;
  onToggleWaiver: (waived: boolean) => void;
  isDeleting: boolean;
  isWaiving: boolean;
  isTogglingWaiver: boolean;
}) {
  const [waiverDialogOpen, setWaiverDialogOpen] = useState(false);
  const waived = league.platform_fees_waived;

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <LeagueLogo
              url={league.logo_url}
              scale={league.logo_scale}
              offsetX={league.logo_offset_x}
              offsetY={league.logo_offset_y}
              name={league.name}
              size="xs"
            />
            <span>{league.name}</span>
            <span onClick={(e) => e.stopPropagation()}>
              <AdminEditLeagueButton
                leagueId={league.id}
                leagueName={league.name}
              />
            </span>
          </div>
          {league.is_test && <Badge variant="outline" className="ml-2 text-xs">Test</Badge>}
          {waived && (
            <Badge className="ml-2 text-xs gap-1 bg-success text-success-foreground hover:bg-success/90">
              <Gift className="h-3 w-3" /> Fees Waived
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {format(new Date(league.created_at), 'MMM d, yyyy')}
        </TableCell>
        <TableCell>{league.owner_display_name}</TableCell>
        <TableCell className="text-center">{league.member_count}</TableCell>
        <TableCell className="text-right">
          {league.entry_fee} {league.currency}
        </TableCell>
        <TableCell className="text-right">
          {league.total_platform_fees.toFixed(2)} {league.currency}
        </TableCell>
        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-2">
            <Switch
              checked={waived}
              disabled={isTogglingWaiver}
              onCheckedChange={() => setWaiverDialogOpen(true)}
              aria-label="Waive platform fees"
            />
            <span className="text-xs text-muted-foreground hidden lg:inline">
              {waived ? 'Waived' : 'Charged'}
            </span>
          </div>
          <AlertDialog open={waiverDialogOpen} onOpenChange={setWaiverDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {waived ? 'Re-enable platform fees?' : 'Waive platform fees?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {waived ? (
                    <>
                      Future members joining <strong>{league.name}</strong> will be charged the
                      platform/app access fee again. Members who already joined under the waiver
                      will <strong>not</strong> be retroactively billed.
                    </>
                  ) : (
                    <>
                      All current and future members of <strong>{league.name}</strong> will be able
                      to join without paying the platform/app access fee. Existing pending members
                      will be marked as paid immediately.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onToggleWaiver(!waived);
                    setWaiverDialogOpen(false);
                  }}
                >
                  {waived ? 'Re-enable Fees' : 'Waive Fees'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            <Button asChild variant="default" size="sm" title="Enter league as a member to test UX/UI">
              <Link to={`/leagues/${league.id}`}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Enter League
              </Link>
            </Button>
            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{league.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the league, all member associations, predictions, and chat messages. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete League
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && league.members.length > 0 && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/30 p-0">
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-center">Entry Paid</TableHead>
                    <TableHead className="text-center">Platform Fee</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {league.members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>{member.display_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(member.joined_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={member.has_paid ? 'default' : 'secondary'}>
                          {member.has_paid ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {waived ? (
                          <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                            <Gift className="h-3 w-3" /> Waived (League)
                          </Badge>
                        ) : (
                          <Badge variant={member.admin_fee_paid ? 'default' : 'secondary'}>
                            {member.admin_fee_paid ? 'Paid' : 'Pending'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!waived && !member.admin_fee_paid && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isWaiving}
                            onClick={() => onWaiveFee(member.user_id)}
                          >
                            Waive Fee
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
