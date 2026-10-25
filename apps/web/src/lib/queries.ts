'use client';

import type { ISODate, ScreeningType, UpsertLogInput } from '@cherri/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const keys = {
  dashboard: ['dashboard'] as const,
  cycle: ['cycle'] as const,
  insights: ['insights'] as const,
  log: (date: ISODate) => ['log', date] as const,
  logs: ['logs'] as const,
  screenings: ['screenings'] as const,
  screening: (type: ScreeningType) => ['screening', type] as const,
  labs: ['labs'] as const,
  labTrends: ['labTrends'] as const,
  shares: ['shares'] as const,
  report: (rangeDays: number) => ['report', rangeDays] as const,
  chatSessions: ['chatSessions'] as const,
  chatSession: (id: string) => ['chatSession', id] as const,
  wrapped: (days: number) => ['wrapped', days] as const,
  articles: ['articles'] as const,
  article: (id: string) => ['article', id] as const,
  myths: ['myths'] as const,
  help: ['help'] as const,
  motherhood: ['motherhood'] as const,
  medications: ['medications'] as const,
  story: ['story'] as const,
  background: ['background'] as const,
  contacts: ['contacts'] as const,
  consults: ['consults'] as const,
  consult: (id: string) => ['consult', id] as const,
  consultPreview: ['consultPreview'] as const,
  doctorInbox: (status: string) => ['doctorInbox', status] as const,
  doctorConsult: (id: string) => ['doctorConsult', id] as const,
  reminders: ['reminders'] as const,
};

/** Anything that changes health data invalidates every derived view. */
export function useInvalidateHealth() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [keys.dashboard, keys.cycle, keys.insights, keys.logs, keys.screenings, keys.motherhood, keys.consultPreview, ['log'], ['report'], ['wrapped']].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
}

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard });
export const useCycle = () => useQuery({ queryKey: keys.cycle, queryFn: api.cycle });
export const useInsights = () => useQuery({ queryKey: keys.insights, queryFn: api.insights });
export const useLog = (date: ISODate) => useQuery({ queryKey: keys.log(date), queryFn: () => api.logs.get(date) });
export const useScreenings = () => useQuery({ queryKey: keys.screenings, queryFn: api.screenings.overview });
export const useScreening = (type: ScreeningType) =>
  useQuery({ queryKey: keys.screening(type), queryFn: () => api.screenings.detail(type) });
export const useLabs = () => useQuery({ queryKey: keys.labs, queryFn: api.labs.list });
export const useLabTrends = () => useQuery({ queryKey: keys.labTrends, queryFn: api.labs.trends });
export const useShares = () => useQuery({ queryKey: keys.shares, queryFn: api.reports.list });
export const useReportPreview = (rangeDays: number) =>
  useQuery({ queryKey: keys.report(rangeDays), queryFn: () => api.reports.preview(rangeDays, true) });
export const useChatSessions = () => useQuery({ queryKey: keys.chatSessions, queryFn: api.ai.sessions });
export const useWrapped = (days: number) => useQuery({ queryKey: keys.wrapped(days), queryFn: () => api.wrapped(days) });
export const useArticles = () => useQuery({ queryKey: keys.articles, queryFn: api.content.articles, staleTime: Infinity });
export const useArticle = (id: string) => useQuery({ queryKey: keys.article(id), queryFn: () => api.content.article(id), staleTime: Infinity });
export const useMyths = () => useQuery({ queryKey: keys.myths, queryFn: api.content.myths, staleTime: Infinity });
export const useHelp = () => useQuery({ queryKey: keys.help, queryFn: api.content.help, staleTime: Infinity });
export const useMotherhood = () => useQuery({ queryKey: keys.motherhood, queryFn: api.motherhood });
export const useMedications = () => useQuery({ queryKey: keys.medications, queryFn: api.medications.list });
export const useStory = () => useQuery({ queryKey: keys.story, queryFn: api.story.get });
export const useBackground = () => useQuery({ queryKey: keys.background, queryFn: api.me.background });
export const useContacts = () => useQuery({ queryKey: keys.contacts, queryFn: api.contacts.list });

export function useSaveLog(date: ISODate) {
  const invalidate = useInvalidateHealth();
  return useMutation({
    mutationFn: (input: UpsertLogInput) => api.logs.upsert(date, input),
    onSuccess: () => invalidate(),
  });
}
