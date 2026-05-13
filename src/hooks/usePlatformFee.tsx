import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePlatformFee() {
  return useQuery({
    queryKey: ['platformFee'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_settings')
        .select('platform_fee_amount, platform_fee_currency')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching platform fee:', error);
      }

      return {
        amount: data?.platform_fee_amount ?? 1,
        currency: data?.platform_fee_currency ?? 'USD',
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
