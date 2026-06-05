import { useQuery } from '@tanstack/react-query';
import { useAxios } from './useAxios';

// src/hooks/useServiceLines.ts
export function useServiceLines() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['service-lines'],
    queryFn: async () => {
      const res = await axios.get('/service-lines?isActive=true');
      return res.data.data as { id: string; name: string }[];
    },
  });
}
