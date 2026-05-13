import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if session exists and was created via recovery
      if (session) {
        setIsValidSession(true);
      }
      setIsLoading(false);
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast({ 
        title: 'Error', 
        description: 'Passwords do not match', 
        variant: 'destructive' 
      });
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      toast({ 
        title: 'Error', 
        description: 'Password must be at least 6 characters', 
        variant: 'destructive' 
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await updatePassword(password);
    
    if (error) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      setIsSuccess(true);
      toast({ 
        title: 'Success!', 
        description: 'Your password has been updated.' 
      });
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
    
    setIsSubmitting(false);
  };

  // Shared shell wrapper for all states
  const Shell = ({ headline, children }: { headline?: string; children: React.ReactNode }) => (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-secondary/40 p-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 20%, hsl(var(--primary) / 0.18) 0%, transparent 70%), radial-gradient(40% 35% at 50% 80%, hsl(var(--accent) / 0.10) 0%, transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44 flex items-center justify-center group relative">
            <div className="absolute inset-0 bg-primary/15 rounded-full blur-2xl animate-pulse-slow" />
            <img
              src={goalpickLogo}
              alt="GOALPICK Logo"
              className="h-28 sm:h-36 md:h-44 w-auto object-contain drop-shadow-[0_0_18px_rgba(34,197,94,0.25)] dark:drop-shadow-[0_0_30px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>
        {headline && (
          <h1 className="font-display text-3xl sm:text-4xl text-center text-headline-sport">
            {headline}
          </h1>
        )}
        {children}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Shell>
        <Card className="glass border border-primary/20 shadow-glow">
          <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking your reset link…</p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!isValidSession) {
    return (
      <Shell headline="Link Expired">
        <Card className="glass border border-primary/20 shadow-glow animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle>This Link Has Expired</CardTitle>
            <CardDescription>
              Reset links expire after a short time for your security. No worries — request a fresh one and you'll be back in the game.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/auth')}
              className="w-full shadow-glow hover:shadow-glow-accent transition-shadow"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Request a New Link
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (isSuccess) {
    return (
      <Shell headline="You're Back In">
        <Card className="glass border border-primary/20 shadow-glow animate-slide-up">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-primary/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">You're All Set!</h2>
            <p className="text-muted-foreground">
              Password updated. Taking you back to the action…
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell headline="New Password">
      <Card className="glass border border-primary/20 shadow-glow animate-slide-up">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Set Your New Password</CardTitle>
            <CardDescription>
              Pick a strong one — you'll need it next time you log in to make your picks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                placeholder="Type it again to confirm"
              />
            </div>
            <Button
              type="submit"
              className="w-full shadow-glow hover:shadow-glow-accent transition-shadow"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save New Password'
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </Shell>
  );
}
