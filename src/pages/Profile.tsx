import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { NotificationSettings } from '@/components/NotificationSettings';
import { OnboardingModal } from '@/components/OnboardingModal';
import { LanguageSelector } from '@/components/LanguageSelector';
import { User, Mail, Trophy, Target, LogOut, Save, Loader2, HelpCircle, BookOpen, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function Profile() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { showOnboarding, startOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  
  const [displayName, setDisplayName] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [country, setCountry] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setFavoriteTeam(profile.favorite_team || '');
      setCountry(profile.country || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        display_name: displayName,
        favorite_team: favoriteTeam || null,
        country: country || null,
      });
      toast.success(t('toast.profileUpdated'));
    } catch (error: any) {
      toast.error(error.message || t('toast.profileUpdateFailed'));
    }
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="animate-slide-up">
          <h1 className="font-display text-4xl text-gradient-brand flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            {t('profile.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('profile.manageAccount')}
          </p>
        </div>

        {/* Profile Info Card */}
        <Card className="animate-slide-up [animation-delay:100ms]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile.accountInfo')}
            </CardTitle>
            <CardDescription>
              {t('profile.updateDetails')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xl font-bold">
                  {profile?.display_name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{profile?.display_name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 text-primary">
                  <Trophy className="h-5 w-5" />
                  <span className="font-display text-2xl">{profile?.total_points || 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t('profile.totalPoints')}</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-2 text-accent">
                  <Target className="h-5 w-5" />
                  <span className="font-display text-2xl">{profile?.exact_score_count || 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t('profile.exactScores')}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('profile.nickname')}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('profile.nicknamePlaceholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="favoriteTeam">{t('profile.favoriteTeam')}</Label>
                <Input
                  id="favoriteTeam"
                  value={favoriteTeam}
                  onChange={(e) => setFavoriteTeam(e.target.value)}
                  placeholder={t('profile.favoriteTeamPlaceholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">{t('profile.country')}</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder={t('profile.countryPlaceholder')}
                />
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t('profile.saveChanges')}
            </Button>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card className="animate-slide-up [animation-delay:150ms]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('language.title')}
            </CardTitle>
            <CardDescription>
              {t('language.selectLanguage')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector variant="select" className="w-full" />
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <div className="animate-slide-up [animation-delay:200ms]">
          <NotificationSettings />
        </div>

        {/* Help & Tutorial */}
        <Card className="animate-slide-up [animation-delay:300ms]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {t('profile.helpTutorial')}
            </CardTitle>
            <CardDescription>
              {t('profile.learnHow')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={startOnboarding}
              className="w-full gap-2"
            >
              <BookOpen className="h-4 w-4" />
              {t('profile.viewTutorial')}
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="animate-slide-up [animation-delay:400ms] border-destructive/20">
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('common.signOut')}
            </Button>
          </CardContent>
        </Card>

        {/* Onboarding Modal */}
        <OnboardingModal 
          open={showOnboarding} 
          onComplete={completeOnboarding} 
          onSkip={skipOnboarding} 
        />
      </div>
    </Layout>
  );
}
