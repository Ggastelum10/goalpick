import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useImportPredictionsToLeague, useStandalonePredictionCount } from '@/hooks/useStandalonePredictions';
import { toast } from 'sonner';
import { Loader2, Download, FileX, CheckCircle2 } from 'lucide-react';

interface ImportPredictionsDialogProps {
  leagueId: string;
  leagueName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function ImportPredictionsDialog({
  leagueId,
  leagueName,
  open,
  onOpenChange,
  onComplete,
}: ImportPredictionsDialogProps) {
  const [choice, setChoice] = useState<'import' | 'fresh' | null>(null);
  const { data: predictionCount, isLoading: countLoading } = useStandalonePredictionCount();
  const importPredictions = useImportPredictionsToLeague();

  const handleImport = async () => {
    try {
      const result = await importPredictions.mutateAsync({ leagueId });
      toast.success(`Imported ${result.imported} predictions to ${leagueName}!`);
      onComplete();
    } catch (error) {
      toast.error('Failed to import predictions');
    }
  };

  const handleStartFresh = () => {
    toast.success(`Starting fresh with ${leagueName}!`);
    onComplete();
  };

  const hasPredictions = (predictionCount ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Your Predictions?</DialogTitle>
          <DialogDescription>
            You have predictions in your Mock pick. Would you like to import them to {leagueName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {countLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : hasPredictions ? (
            <>
              <div className="flex items-center justify-center gap-2 py-2">
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {predictionCount} predictions available
                </Badge>
              </div>

              <div className="grid gap-3">
                <Card 
                  className={`cursor-pointer transition-all ${
                    choice === 'import' 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setChoice('import')}
                >
                  <CardContent className="py-4 flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Import My Predictions</h4>
                      <p className="text-sm text-muted-foreground">
                        Copy all {predictionCount} predictions from your Mock pick to this league
                      </p>
                    </div>
                    {choice === 'import' && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    choice === 'fresh' 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setChoice('fresh')}
                >
                  <CardContent className="py-4 flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileX className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Start Fresh</h4>
                      <p className="text-sm text-muted-foreground">
                        Make new predictions specifically for this league
                      </p>
                    </div>
                    {choice === 'fresh' && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              </div>

              <Button
                className="w-full"
                disabled={!choice || importPredictions.isPending}
                onClick={() => {
                  if (choice === 'import') {
                    handleImport();
                  } else {
                    handleStartFresh();
                  }
                }}
              >
                {importPredictions.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : choice === 'import' ? (
                  'Import & Continue'
                ) : choice === 'fresh' ? (
                  'Start Fresh'
                ) : (
                  'Select an Option'
                )}
              </Button>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <p className="text-muted-foreground">
                No predictions in your Mock pick yet. You'll start with a blank slate!
              </p>
              <Button className="w-full" onClick={handleStartFresh}>
                Continue to League
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
