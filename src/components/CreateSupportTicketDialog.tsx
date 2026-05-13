import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTicket } from '@/hooks/useSupportTickets';
import { ChatMessage } from '@/hooks/useHelpChat';
import { toast } from 'sonner';

interface CreateSupportTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatHistory?: ChatMessage[];
}

export function CreateSupportTicketDialog({
  open,
  onOpenChange,
  chatHistory = [],
}: CreateSupportTicketDialogProps) {
  const { t } = useTranslation();
  const createTicket = useCreateTicket();
  
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Generate a summary from chat history
  const chatSummary = chatHistory.length > 0
    ? `\n\n--- Chat History Summary ---\n${chatHistory
        .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`)
        .join('\n')}`
    : '';

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error(t('helpCenter.supportDialog.fillRequired'));
      return;
    }

    try {
      await createTicket.mutateAsync({
        subject: subject.trim(),
        description: description.trim() + chatSummary,
        chat_history: chatHistory,
        priority,
      });
      
      toast.success(t('helpCenter.ticketCreated'));
      onOpenChange(false);
      
      // Reset form
      setSubject('');
      setDescription('');
      setPriority('medium');
    } catch (error) {
      toast.error(t('helpCenter.supportDialog.submitFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('helpCenter.escalate')}</DialogTitle>
          <DialogDescription>
            {t('helpCenter.supportDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">{t('helpCenter.supportDialog.subject')} *</Label>
            <Input
              id="subject"
              placeholder={t('helpCenter.supportDialog.subjectPlaceholder')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">{t('helpCenter.supportDialog.priority')}</Label>
            <Select value={priority} onValueChange={(v: 'low' | 'medium' | 'high') => setPriority(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('helpCenter.supportDialog.priorityLow')}</SelectItem>
                <SelectItem value="medium">{t('helpCenter.supportDialog.priorityMedium')}</SelectItem>
                <SelectItem value="high">{t('helpCenter.supportDialog.priorityHigh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('helpCenter.supportDialog.descriptionLabel')} *</Label>
            <Textarea
              id="description"
              placeholder={t('helpCenter.supportDialog.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          {chatHistory.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('helpCenter.supportDialog.chatAttached')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={createTicket.isPending}>
            {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('helpCenter.supportDialog.submitTicket')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
