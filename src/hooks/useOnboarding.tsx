import { useState, useEffect } from 'react';
import { useProfile, useUpdateProfile } from './useProfile';

interface UseOnboardingReturn {
  showOnboarding: boolean;
  isRestarting: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  closeOnboarding: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // Check if user needs onboarding
  useEffect(() => {
    if (!isLoading && profile && profile.has_completed_onboarding === false) {
      setShowOnboarding(true);
    }
  }, [profile, isLoading]);

  const startOnboarding = () => {
    setIsRestarting(true);
    setShowOnboarding(true);
  };

  const completeOnboarding = async () => {
    // Only save to DB if not restarting
    if (!isRestarting) {
      await updateProfile.mutateAsync({
        has_completed_onboarding: true,
      });
    }
    setShowOnboarding(false);
    setIsRestarting(false);
  };

  const skipOnboarding = async () => {
    // Skip also marks as complete
    if (!isRestarting) {
      await updateProfile.mutateAsync({
        has_completed_onboarding: true,
      });
    }
    setShowOnboarding(false);
    setIsRestarting(false);
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);
    setIsRestarting(false);
  };

  return {
    showOnboarding,
    isRestarting,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    closeOnboarding,
  };
}
