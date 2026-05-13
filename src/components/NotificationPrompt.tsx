import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';

export function NotificationPrompt() {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed
    const hasDismissed = localStorage.getItem('notification-prompt-dismissed');
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after a delay if notifications not enabled
    if (isSupported && permission === 'default') {
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShow(false);
    }
  };

  if (!show || dismissed || !isSupported || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Never Miss a Match!</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Get reminders before matches start so you never miss updating your predictions.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleEnable}>
                  Enable Notifications
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Not Now
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
