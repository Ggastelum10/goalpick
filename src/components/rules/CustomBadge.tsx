import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface CustomBadgeProps {
  isCustom: boolean;
}

export function CustomBadge({ isCustom }: CustomBadgeProps) {
  const { t } = useTranslation();
  if (!isCustom) return null;
  return <Badge variant="secondary" className="ml-2 text-[10px]">{t('rules.customBadge')}</Badge>;
}
