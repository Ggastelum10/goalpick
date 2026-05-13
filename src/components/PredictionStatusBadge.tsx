import { Badge } from '@/components/ui/badge';
import { Eye, Lock, Pencil, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PredictionStatusBadgeProps {
  isLocked: boolean;
  isVisibleToOthers: boolean;
  isConfirmed?: boolean;
  size?: 'sm' | 'default';
}

export function PredictionStatusBadge({ 
  isLocked, 
  isVisibleToOthers, 
  isConfirmed,
  size = 'default' 
}: PredictionStatusBadgeProps) {
  const { t } = useTranslation();
  
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const padding = size === 'sm' ? 'px-1.5' : 'px-2';

  // Locked and visible to others
  if (isLocked && isVisibleToOthers) {
    return (
      <Badge variant="secondary" className={`gap-1 ${textSize} ${padding}`}>
        <Eye className={iconSize} />
        <span className="hidden sm:inline">{t('predictions.visible', 'Visible')}</span>
      </Badge>
    );
  }
  
  // Locked but not visible (mock pick or before visibility conditions met)
  if (isLocked) {
    return (
      <Badge variant="outline" className={`gap-1 ${textSize} ${padding} text-muted-foreground`}>
        <Lock className={iconSize} />
        <span className="hidden sm:inline">{t('predictions.locked', 'Locked')}</span>
      </Badge>
    );
  }
  
  // User confirmed their bracket (legacy, kept for backward compatibility)
  if (isConfirmed) {
    return (
      <Badge className={`gap-1 ${textSize} ${padding} bg-success text-success-foreground`}>
        <Check className={iconSize} />
        <span className="hidden sm:inline">{t('predictions.confirmed', 'Confirmed')}</span>
      </Badge>
    );
  }
  
  // Editable
  return (
    <Badge variant="outline" className={`gap-1 ${textSize} ${padding}`}>
      <Pencil className={iconSize} />
      <span className="hidden sm:inline">{t('predictions.editable', 'Editable')}</span>
    </Badge>
  );
}
