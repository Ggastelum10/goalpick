import { useProfile } from './useProfile';
import { usePendingLegalDocuments, useAcceptLegalDocument } from './useLegalDocuments';
import { useCallback } from 'react';

export function useSetupScreen() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: pendingDocs, isLoading: pendingLoading } = usePendingLegalDocuments();
  const acceptDocument = useAcceptLegalDocument();

  const isLoading = profileLoading || pendingLoading;

  // Show setup if there are pending legal documents to sign
  const showSetup = !isLoading && !!profile && (pendingDocs?.length ?? 0) > 0;

  const completeSetup = useCallback(async () => {
    // Accept all pending documents
    if (pendingDocs) {
      for (const doc of pendingDocs) {
        await acceptDocument.mutateAsync(doc.id);
      }
    }
  }, [pendingDocs, acceptDocument]);

  return {
    showSetup: !!showSetup,
    isLoading,
    completeSetup,
    isCompleting: acceptDocument.isPending,
    pendingDocuments: pendingDocs || [],
  };
}
