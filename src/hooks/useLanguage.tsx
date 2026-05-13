import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile, useUpdateProfile } from './useProfile';
import { useAuth } from './useAuth';

export const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const;

export type LanguageCode = typeof availableLanguages[number]['code'];

export function useLanguage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const currentLanguage = i18n.language?.substring(0, 2) as LanguageCode || 'en';

  // Sync language from profile on login
  useEffect(() => {
    if (profile?.preferred_language && profile.preferred_language !== currentLanguage) {
      i18n.changeLanguage(profile.preferred_language);
    }
  }, [profile?.preferred_language, i18n, currentLanguage]);

  const setLanguage = useCallback(async (langCode: string) => {
    // Update i18next
    await i18n.changeLanguage(langCode);
    
    // Store in localStorage for persistence
    localStorage.setItem('preferred_language', langCode);
    
    // If authenticated, save to profile
    if (user) {
      try {
        await updateProfile.mutateAsync({ preferred_language: langCode });
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  }, [i18n, user, updateProfile]);

  const getLanguageInfo = (code: string) => {
    return availableLanguages.find(lang => lang.code === code) || availableLanguages[0];
  };

  return {
    currentLanguage,
    setLanguage,
    availableLanguages,
    getLanguageInfo,
    isChanging: updateProfile.isPending,
  };
}
