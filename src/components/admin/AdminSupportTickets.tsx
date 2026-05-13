import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, MessageSquare, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAllTickets, useUpdateTicket, SupportTicket, SupportTicketWithUser } from '@/hooks/useSupportTickets';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  open: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed: 'bg-muted text-muted-foreground border-muted',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-600',
  high: 'bg-red-500/10 text-red-600',
};

export function AdminSupportTickets() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: tickets, isLoading } = useAllTickets(statusFilter);
  const updateTicket = useUpdateTicket();

  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        status: newStatus as SupportTicket['status'],
        ...(newStatus === 'resolved' && { resolved_by: user?.id }),
      });
      toast.success('Ticket status updated');
    } catch (error) {
      toast.error('Failed to update ticket');
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        priority: newPriority as SupportTicket['priority'],
      });
      toast.success('Ticket priority updated');
    } catch (error) {
      toast.error('Failed to update ticket');
    }
  };

  const handleSaveNotes = async (ticketId: string) => {
    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        admin_notes: editingNotes[ticketId] || '',
      });
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          {tickets?.length || 0} ticket{tickets?.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tickets List */}
      {!tickets || tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No support tickets found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base">{ticket.subject}</CardTitle>
                    <CardDescription className="text-xs">
                      Created by <span className="font-medium text-foreground">{(ticket as SupportTicketWithUser).user_display_name}</span> — {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={priorityColors[ticket.priority]}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant="outline" className={statusColors[ticket.status]}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {ticket.description}
                </div>

                {/* Status and Priority Controls */}
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Status</label>
                    <Select
                      value={ticket.status}
                      onValueChange={(v) => handleStatusChange(ticket.id, v)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Priority</label>
                    <Select
                      value={ticket.priority}
                      onValueChange={(v) => handlePriorityChange(ticket.id, v)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Chat History Collapsible */}
                {ticket.chat_history && ticket.chat_history.length > 0 && (
                  <Collapsible
                    open={expandedTicket === ticket.id}
                    onOpenChange={(open) => setExpandedTicket(open ? ticket.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Chat History ({ticket.chat_history.length} messages)
                        </span>
                        {expandedTicket === ticket.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                        {ticket.chat_history.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`text-xs p-2 rounded ${
                              msg.role === 'user'
                                ? 'bg-primary/10 ml-8'
                                : 'bg-muted mr-8'
                            }`}
                          >
                            <span className="font-semibold">
                              {msg.role === 'user' ? 'User' : 'AI'}:
                            </span>{' '}
                            {msg.content}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Admin Notes */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Admin Notes</label>
                  <Textarea
                    placeholder="Add internal notes about this ticket..."
                    value={editingNotes[ticket.id] ?? ticket.admin_notes ?? ''}
                    onChange={(e) =>
                      setEditingNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                    }
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveNotes(ticket.id)}
                    disabled={updateTicket.isPending}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
