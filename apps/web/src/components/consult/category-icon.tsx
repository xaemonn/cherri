import type { ConsultCategory } from '@cherri/shared';
import { CalendarClock, FlaskConical, Pill, Stethoscope, type LucideIcon } from 'lucide-react';

export const CATEGORY_ICONS: Record<ConsultCategory, LucideIcon> = {
  LAB_REVIEW: FlaskConical,
  MEDICATION_SIDE_EFFECTS: Pill,
  PERIOD_IRREGULARITY: CalendarClock,
  GENERAL_SYMPTOMS: Stethoscope,
};
