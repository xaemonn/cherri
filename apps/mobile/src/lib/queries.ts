import type { ISODate, ScreeningType, UpsertLogInput } from '@cherri/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const keys = {
  dashboard: ['dashboard'] as const,
  insights: ['insights'] as const,
  log: (date: ISODate) => ['log', date] as const,
  screenings: ['screenings'] as const,
  screening: (type: ScreeningType) => ['screening', type] as const,
  labs: ['labs'] as const,
  shares: ['shares'] as const,
  help: ['help'] as const,
  motherhood: ['motherhood'] as const,
  contacts: ['contacts'] as const,
};

export function useInvalidateHealth() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [keys.dashboard, keys.insights, keys.screenings, keys.motherhood, ['log'], ['report']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard });
export const useInsights = () => useQuery({ queryKey: keys.insights, queryFn: api.insights });
export const useLog = (date: ISODate) => useQuery({ queryKey: keys.log(date), queryFn: () => api.logs.get(date) });
export const useScreenings = () => useQuery({ queryKey: keys.screenings, queryFn: api.screenings.overview });
export const useScreening = (type: ScreeningType) =>
  useQuery({ queryKey: keys.screening(type), queryFn: () => api.screenings.detail(type) });
export const useLabs = () => useQuery({ queryKey: keys.labs, queryFn: api.labs.list });
export const useShares = () => useQuery({ queryKey: keys.shares, queryFn: api.reports.list });
export const useHelp = () => useQuery({ queryKey: keys.help, queryFn: api.content.help, staleTime: Infinity });
export const useMotherhood = () => useQuery({ queryKey: keys.motherhood, queryFn: api.motherhood });
export const useContacts = () => useQuery({ queryKey: keys.contacts, queryFn: api.contacts.list });

export function useSaveLog(date: ISODate) {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (input: UpsertLogInput) => api.logs.upsert(date, input),
    onSuccess: () => invalidate(),
  });
}
