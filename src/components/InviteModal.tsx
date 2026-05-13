import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Mail, Share2, MessageCircle, Check, Loader2, UserPlus } from 'lucide-react';
import { LeagueLogo } from '@/components/LeagueLogo';
import { toast } from 'sonner';
import { useInviteEmail } from '@/hooks/useInviteEmail';
import { buildInviteUrl } from '@/lib/inviteUrl';

interface InviteModalProps {
  leagueId: string;
  leagueName: string;
  inviteCode: string;
  inviterName: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}

export function InviteModal({ leagueId, leagueName, inviteCode, inviterName, logoUrl, children }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const inviteEmail = useInviteEmail();

  const inviteUrl = buildInviteUrl(inviteCode, leagueName);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(`Join my league "${leagueName}" on GOALPICK! ${inviteUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${leagueName}`,
          text: `Join my league "${leagueName}" on GOALPICK - the ultimate football prediction game!`,
          url: inviteUrl,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      copyToClipboard();
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    inviteEmail.mutate(
      { 
        email: email.trim(), 
        leagueId, 
        leagueName, 
        inviterName, 
        inviteCode 
      },
      {
        onSuccess: () => {
          setEmail('');
          toast.success(`Invitation sent to ${email}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LeagueLogo url={logoUrl} name={leagueName} size="sm" />
            Invite to {leagueName}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share Link
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Send Email
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={inviteUrl} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={copyToClipboard} 
                  variant="outline"
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={shareWhatsApp} 
                variant="outline" 
                className="flex-1 gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              {navigator.share && (
                <Button 
                  onClick={shareNative} 
                  variant="outline" 
                  className="flex-1 gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4 mt-4">
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={inviteEmail.isPending}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={inviteEmail.isPending}
              >
                {inviteEmail.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center">
              They'll receive an email with a link to join your league.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
