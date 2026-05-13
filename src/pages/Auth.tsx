import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggleCompact } from '@/components/LanguageToggleCompact';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, ArrowLeft, Mail, Trophy, Users, Target, Info, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';
import { cn } from '@/lib/utils';

// ---- Validation helpers ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (v: string): string | null => {
  const value = v.trim();
  if (!value) return 'Email is required';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address';
  if (value.length > 255) return 'Email is too long';
  return null;
};
const validatePassword = (v: string, mode: 'signin' | 'signup'): string | null => {
  if (!v) return 'Password is required';
  if (mode === 'signup' && v.length < 6) return 'Use at least 6 characters';
  return null;
};
const validateNickname = (v: string): string | null => {
  const value = v.trim();
  if (!value) return 'Nickname is required';
  if (value.length < 2) return 'Nickname is too short';
  if (value.length > 30) return 'Keep it under 30 characters';
  return null;
};
const passwordStrength = (v: string): { score: 0 | 1 | 2 | 3; label: string } => {
  let s = 0;
  if (v.length >= 6) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
  const label = ['Too short', 'Weak', 'Good', 'Strong'][s] as string;
  return { score: s as 0 | 1 | 2 | 3, label };
};
const friendlyAuthError = (msg?: string): string => {
  if (!msg) return 'Something went wrong. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'Email or password is incorrect.';
  if (m.includes('email not confirmed'))
    return 'Please confirm your email before signing in.';
  if (m.includes('user already registered') || m.includes('already registered'))
    return 'An account with this email already exists. Try signing in instead.';
  if (m.includes('rate limit'))
    return 'Too many attempts — please wait a moment and try again.';
  if (m.includes('network'))
    return 'Network issue. Check your connection and try again.';
  return msg;
};

export default function Auth() {
  const { t } = useTranslation();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Sign-in state
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [signinErrors, setSigninErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [signinTouched, setSigninTouched] = useState<{ email?: boolean; password?: boolean }>({});

  // Sign-up state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupErrors, setSignupErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [signupTouched, setSignupTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>({});

  // Forgot-password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | undefined>();
  const [resetTouched, setResetTouched] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    const rawRedirect = searchParams.get('redirect');
    // Only allow same-origin path redirects (must start with a single "/")
    const safeRedirect =
      rawRedirect && /^\/(?!\/)/.test(rawRedirect) ? rawRedirect : '/dashboard';
    return <Navigate to={safeRedirect} replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailErr = validateEmail(signinEmail);
    const passwordErr = validatePassword(signinPassword, 'signin');
    setSigninTouched({ email: true, password: true });
    if (emailErr || passwordErr) {
      setSigninErrors({ email: emailErr ?? undefined, password: passwordErr ?? undefined });
      return;
    }
    setSigninErrors({});
    setIsSubmitting(true);
    const { error } = await signIn(signinEmail.trim(), signinPassword);
    if (error) {
      const friendly = friendlyAuthError(error.message);
      setSigninErrors({ form: friendly });
      toast({ title: 'Sign in failed', description: friendly, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nameErr = validateNickname(signupName);
    const emailErr = validateEmail(signupEmail);
    const passwordErr = validatePassword(signupPassword, 'signup');
    setSignupTouched({ name: true, email: true, password: true });
    if (nameErr || emailErr || passwordErr) {
      setSignupErrors({
        name: nameErr ?? undefined,
        email: emailErr ?? undefined,
        password: passwordErr ?? undefined,
      });
      return;
    }
    setSignupErrors({});
    setIsSubmitting(true);
    const { error } = await signUp(signupEmail.trim(), signupPassword, signupName.trim());
    if (error) {
      const friendly = friendlyAuthError(error.message);
      setSignupErrors({ form: friendly });
      toast({ title: 'Sign up failed', description: friendly, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome!', description: 'Your account has been created.' });
    }
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetTouched(true);
    const emailErr = validateEmail(resetEmail);
    if (emailErr) {
      setResetError(emailErr);
      return;
    }
    setResetError(undefined);
    setIsSubmitting(true);
    const { error } = await resetPassword(resetEmail.trim());
    if (error) {
      const friendly = friendlyAuthError(error.message);
      setResetError(friendly);
      toast({ title: 'Could not send link', description: friendly, variant: 'destructive' });
    } else {
      setResetEmailSent(true);
      toast({ 
        title: 'Check your email', 
        description: 'We sent you a password reset link.' 
      });
    }
    setIsSubmitting(false);
  };

  // Live field-level revalidation (only after the field was touched)
  const onSigninEmailChange = (v: string) => {
    setSigninEmail(v);
    if (signinTouched.email) setSigninErrors((p) => ({ ...p, email: validateEmail(v) ?? undefined, form: undefined }));
  };
  const onSigninPasswordChange = (v: string) => {
    setSigninPassword(v);
    if (signinTouched.password) setSigninErrors((p) => ({ ...p, password: validatePassword(v, 'signin') ?? undefined, form: undefined }));
  };
  const onSignupNameChange = (v: string) => {
    setSignupName(v);
    if (signupTouched.name) setSignupErrors((p) => ({ ...p, name: validateNickname(v) ?? undefined, form: undefined }));
  };
  const onSignupEmailChange = (v: string) => {
    setSignupEmail(v);
    if (signupTouched.email) setSignupErrors((p) => ({ ...p, email: validateEmail(v) ?? undefined, form: undefined }));
  };
  const onSignupPasswordChange = (v: string) => {
    setSignupPassword(v);
    if (signupTouched.password) setSignupErrors((p) => ({ ...p, password: validatePassword(v, 'signup') ?? undefined, form: undefined }));
  };

  const strength = passwordStrength(signupPassword);
  const strengthColors = ['bg-destructive', 'bg-destructive', 'bg-gold', 'bg-primary'];

  if (showForgotPassword) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-secondary/40 p-4 overflow-hidden">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageToggleCompact />
      </div>
        {/* Ambient stadium glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 20%, hsl(var(--primary) / 0.18) 0%, transparent 70%), radial-gradient(40% 35% at 50% 80%, hsl(var(--accent) / 0.10) 0%, transparent 70%)',
          }}
        />
        <div className="relative w-full max-w-md space-y-6">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="h-32 w-32 sm:h-44 sm:w-44 md:h-52 md:w-52 lg:h-64 lg:w-64 flex items-center justify-center group relative">
              <div className="absolute inset-0 bg-primary/15 rounded-full blur-2xl animate-pulse-slow" />
              <img 
                src={goalpickLogo} 
                alt="GOALPICK Logo" 
                className="h-32 sm:h-44 md:h-52 lg:h-64 w-auto object-contain drop-shadow-[0_0_20px_rgba(34,197,94,0.25)] dark:drop-shadow-[0_0_30px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform duration-300" 
              />
            </div>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-center text-headline-sport">
            {t('authPage.forgot.resetTitle')}
          </h1>

          <Card className="glass border border-primary/20 shadow-glow">
            {resetEmailSent ? (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-primary/30 rounded-full flex items-center justify-center mb-4">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{t('authPage.forgot.sentTitle')}</CardTitle>
                  <CardDescription>
                    {t('authPage.forgot.sentDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('authPage.forgot.back')}
                  </Button>
                </CardContent>
              </>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <CardHeader>
                  <CardTitle>{t('authPage.forgot.title')}</CardTitle>
                  <CardDescription>
                    {t('authPage.forgot.desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">{t('authPage.forgot.email')}</Label>
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder={t('authPage.forgot.emailPlaceholder')}
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (resetTouched) setResetError(validateEmail(e.target.value) ?? undefined);
                      }}
                      onBlur={() => {
                        setResetTouched(true);
                        setResetError(validateEmail(resetEmail) ?? undefined);
                      }}
                      aria-invalid={!!resetError}
                      aria-describedby={resetError ? 'reset-email-error' : undefined}
                      className={cn(resetError && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {resetError && (
                      <p id="reset-email-error" className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {resetError}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full shadow-glow hover:shadow-glow-accent transition-shadow" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('authPage.forgot.submit')}
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setShowForgotPassword(false)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('authPage.forgot.back')}
                  </Button>
                </CardContent>
              </form>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-secondary/40 p-4 overflow-hidden">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageToggleCompact />
      </div>
      {/* Ambient stadium glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 15%, hsl(var(--primary) / 0.20) 0%, transparent 70%), radial-gradient(40% 35% at 50% 85%, hsl(var(--accent) / 0.10) 0%, transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-2 sm:mb-4">
          <div className="h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44 flex items-center justify-center group relative">
            <div className="absolute inset-0 bg-primary/15 rounded-full blur-2xl animate-pulse-slow" />
            <img 
              src={goalpickLogo} 
              alt="GOALPICK Logo" 
              className="h-28 sm:h-36 md:h-44 w-auto object-contain drop-shadow-[0_0_18px_rgba(34,197,94,0.25)] dark:drop-shadow-[0_0_30px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform duration-300" 
            />
          </div>
        </div>

        {/* Value Proposition */}
        <div className="text-center space-y-2 animate-slide-up">
          <h1 className="font-display text-3xl sm:text-4xl text-headline-sport">
            {t('authPage.hero.title')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xs mx-auto">
            {t('authPage.hero.subtitle')}
          </p>
          <div className="flex justify-center gap-6 pt-2">
            <div className="flex flex-col items-center gap-1">
              <div className="h-10 w-10 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('authPage.hero.predict')}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-10 w-10 rounded-full bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-accent" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('authPage.hero.compete')}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-10 w-10 rounded-full bg-gold/10 ring-1 ring-gold/20 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('authPage.hero.win')}</span>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="glass border border-primary/20 shadow-glow animate-slide-up [animation-delay:100ms]">
          <div className="px-6 pt-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('authPage.back')}
            </Link>
          </div>
          <Tabs defaultValue={initialTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('authPage.tabs.signin')}</TabsTrigger>
              <TabsTrigger value="signup">{t('authPage.tabs.signup')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardHeader>
                  <CardTitle>{t('authPage.signin.title')}</CardTitle>
                  <CardDescription>{t('authPage.signin.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {signinErrors.form && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{signinErrors.form}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('authPage.signin.email')}</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={signinEmail}
                      onChange={(e) => onSigninEmailChange(e.target.value)}
                      onBlur={() => {
                        setSigninTouched((p) => ({ ...p, email: true }));
                        setSigninErrors((p) => ({ ...p, email: validateEmail(signinEmail) ?? undefined }));
                      }}
                      aria-invalid={!!signinErrors.email}
                      aria-describedby={signinErrors.email ? 'signin-email-error' : undefined}
                      className={cn(signinErrors.email && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {signinErrors.email && (
                      <p id="signin-email-error" className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {signinErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">{t('authPage.signin.password')}</Label>
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 h-auto font-normal text-sm text-muted-foreground hover:text-primary"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        {t('authPage.signin.forgot')}
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showSigninPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={signinPassword}
                        onChange={(e) => onSigninPasswordChange(e.target.value)}
                        onBlur={() => {
                          setSigninTouched((p) => ({ ...p, password: true }));
                          setSigninErrors((p) => ({ ...p, password: validatePassword(signinPassword, 'signin') ?? undefined }));
                        }}
                        aria-invalid={!!signinErrors.password}
                        aria-describedby={signinErrors.password ? 'signin-password-error' : undefined}
                        className={cn('pr-10', signinErrors.password && 'border-destructive focus-visible:ring-destructive')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSigninPassword((s) => !s)}
                        aria-label={showSigninPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showSigninPassword}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {showSigninPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signinErrors.password && (
                      <p id="signin-password-error" className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {signinErrors.password}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full shadow-glow hover:shadow-glow-accent transition-shadow"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('authPage.signin.submit')}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle>{t('authPage.signup.title')}</CardTitle>
                  <CardDescription>{t('authPage.signup.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {signupErrors.form && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{signupErrors.form}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="signup-name">{t('authPage.signup.nickname')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-center">
                          <p>{t('authPage.signup.nicknameTip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="signup-name"
                      name="displayName"
                      placeholder={t('authPage.signup.nicknamePlaceholder')}
                      autoComplete="nickname"
                      maxLength={30}
                      value={signupName}
                      onChange={(e) => onSignupNameChange(e.target.value)}
                      onBlur={() => {
                        setSignupTouched((p) => ({ ...p, name: true }));
                        setSignupErrors((p) => ({ ...p, name: validateNickname(signupName) ?? undefined }));
                      }}
                      aria-invalid={!!signupErrors.name}
                      aria-describedby={signupErrors.name ? 'signup-name-error' : undefined}
                      className={cn(signupErrors.name && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {signupErrors.name && (
                      <p id="signup-name-error" className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {signupErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('authPage.signup.email')}</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={signupEmail}
                      onChange={(e) => onSignupEmailChange(e.target.value)}
                      onBlur={() => {
                        setSignupTouched((p) => ({ ...p, email: true }));
                        setSignupErrors((p) => ({ ...p, email: validateEmail(signupEmail) ?? undefined }));
                      }}
                      aria-invalid={!!signupErrors.email}
                      aria-describedby={signupErrors.email ? 'signup-email-error' : undefined}
                      className={cn(signupErrors.email && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {signupErrors.email && (
                      <p id="signup-email-error" className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {signupErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('authPage.signup.password')}</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignupPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={6}
                        value={signupPassword}
                        onChange={(e) => onSignupPasswordChange(e.target.value)}
                        onBlur={() => {
                          setSignupTouched((p) => ({ ...p, password: true }));
                          setSignupErrors((p) => ({ ...p, password: validatePassword(signupPassword, 'signup') ?? undefined }));
                        }}
                        aria-invalid={!!signupErrors.password}
                        aria-describedby={signupErrors.password ? 'signup-password-error' : 'signup-password-hint'}
                        className={cn('pr-10', signupErrors.password && 'border-destructive focus-visible:ring-destructive')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((s) => !s)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showSignupPassword}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {/* Strength meter */}
                    {signupPassword && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                'h-1 flex-1 rounded-full transition-colors',
                                i < strength.score ? strengthColors[strength.score] : 'bg-muted'
                              )}
                            />
                          ))}
                        </div>
                        <p className={cn(
                          'flex items-center gap-1.5 text-[11px]',
                          strength.score >= 3 ? 'text-primary' : 'text-muted-foreground'
                        )}>
                          {strength.score >= 3 && <CheckCircle2 className="h-3 w-3" />}
                          {t('authPage.signup.strength')}: {strength.label}
                        </p>
                      </div>
                    )}
                    {signupErrors.password ? (
                      <p id="signup-password-error" className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {signupErrors.password}
                      </p>
                    ) : (
                      <p id="signup-password-hint" className="text-[11px] text-muted-foreground">
                        {t('authPage.signup.passwordHint')}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full shadow-glow hover:shadow-glow-accent transition-shadow"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('authPage.signup.submit')}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
