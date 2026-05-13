import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGameModes, useUpdateGameMode } from '@/hooks/useGameModes';
import { Gamepad2, Lock, Unlock } from 'lucide-react';

export function GameModes() {
  const { data: gameModes, isLoading, error } = useGameModes();
  const updateGameMode = useUpdateGameMode();

  const handleToggle = (id: string, currentEnabled: boolean) => {
    updateGameMode.mutate({ id, is_enabled: !currentEnabled });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Game Modes
          </CardTitle>
          <CardDescription>Loading game modes...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-11" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Game Modes
          </CardTitle>
          <CardDescription className="text-destructive">
            Failed to load game modes: {error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          Game Modes
        </CardTitle>
        <CardDescription>
          Configure which game modes are available for new leagues. Disabled modes won't appear in the league creation form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {gameModes?.map((mode) => (
          <div
            key={mode.id}
            className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
              mode.is_enabled 
                ? 'bg-card border-border' 
                : 'bg-muted/50 border-muted'
            }`}
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{mode.name}</h4>
                <Badge 
                  variant={mode.is_enabled ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {mode.is_enabled ? (
                    <>
                      <Unlock className="h-3 w-3 mr-1" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Disabled
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {mode.description}
              </p>
              <p className="text-xs text-muted-foreground/70">
                Code: <code className="bg-muted px-1 py-0.5 rounded">{mode.code}</code>
              </p>
            </div>
            <Switch
              checked={mode.is_enabled}
              onCheckedChange={() => handleToggle(mode.id, mode.is_enabled)}
              disabled={updateGameMode.isPending}
              aria-label={`Toggle ${mode.name}`}
            />
          </div>
        ))}

        {gameModes?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No game modes configured yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
