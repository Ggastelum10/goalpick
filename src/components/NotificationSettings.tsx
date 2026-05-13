import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Smartphone, Trophy, TrendingUp, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NotificationPreferences {
  notify_match_results: boolean;
  notify_points_change: boolean;
  notify_standings_update: boolean;
  notify_push_enabled: boolean;
  notify_email_enabled: boolean;
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notify_match_results: true,
    notify_points_change: true,
    notify_standings_update: true,
    notify_push_enabled: true,
    notify_email_enabled: true,
  });

  useEffect(() => {
    if (!user) return;
    
    const loadPreferences = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('notify_match_results, notify_points_change, notify_standings_update, notify_push_enabled, notify_email_enabled')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error loading notification preferences:', error);
      } else if (data) {
        setPreferences({
          notify_match_results: data.notify_match_results ?? true,
          notify_points_change: data.notify_points_change ?? true,
          notify_standings_update: data.notify_standings_update ?? true,
          notify_push_enabled: data.notify_push_enabled ?? true,
          notify_email_enabled: data.notify_email_enabled ?? true,
        });
      }
      setLoading(false);
    };
    
    loadPreferences();
  }, [user]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;
    
    setSaving(true);
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating notification preference:', error);
      toast.error(t('toast.preferenceUpdateFailed'));
      // Revert on error
      setPreferences(preferences);
    } else {
      toast.success(t('toast.preferenceUpdated'));
    }
    setSaving(false);
  };

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) {
      updatePreference('notify_push_enabled', true);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notifications.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t('notifications.preferences')}
        </CardTitle>
        <CardDescription>
          {t('notifications.preferencesDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('notifications.deliveryChannels')}
          </h4>
          
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="email-notifications" className="font-medium">
                  {t('notifications.email')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('notifications.emailDesc')}
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.notify_email_enabled}
              onCheckedChange={(checked) => updatePreference('notify_email_enabled', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Smartphone className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <Label htmlFor="push-notifications" className="font-medium">
                  {t('notifications.push')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('notifications.pushDesc')}
                </p>
              </div>
            </div>
            {!isSupported ? (
              <Badge variant="outline" className="text-muted-foreground">
                {t('notifications.notSupported')}
              </Badge>
            ) : permission === 'denied' ? (
              <Badge variant="destructive">{t('notifications.blocked')}</Badge>
            ) : permission !== 'granted' ? (
              <Button size="sm" variant="outline" onClick={handleEnablePush}>
                {t('notifications.enable')}
              </Button>
            ) : (
              <Switch
                id="push-notifications"
                checked={preferences.notify_push_enabled}
                onCheckedChange={(checked) => updatePreference('notify_push_enabled', checked)}
                disabled={saving}
              />
            )}
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('notifications.notificationTypes')}
          </h4>
          
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="match-results" className="font-medium">
                  {t('notifications.matchResults')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('notifications.matchResultsDesc')}
                </p>
              </div>
            </div>
            <Switch
              id="match-results"
              checked={preferences.notify_match_results}
              onCheckedChange={(checked) => updatePreference('notify_match_results', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <Trophy className="h-4 w-4 text-gold" />
              </div>
              <div>
                <Label htmlFor="points-change" className="font-medium">
                  {t('notifications.pointsUpdates')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('notifications.pointsUpdatesDesc')}
                </p>
              </div>
            </div>
            <Switch
              id="points-change"
              checked={preferences.notify_points_change}
              onCheckedChange={(checked) => updatePreference('notify_points_change', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div>
                <Label htmlFor="standings-update" className="font-medium">
                  {t('notifications.standingsChanges')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('notifications.standingsChangesDesc')}
                </p>
              </div>
            </div>
            <Switch
              id="standings-update"
              checked={preferences.notify_standings_update}
              onCheckedChange={(checked) => updatePreference('notify_standings_update', checked)}
              disabled={saving}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
