import { z } from 'zod';
import { INDIA_HELPLINES, type Helpline } from '../safety';

/**
 * PHQ-9 (depression) and GAD-7 (anxiety): short, validated questionnaires used in primary care
 * worldwide and free to use. Scored by fixed rules here; the score supports a conversation with a
 * doctor and is never a diagnosis.
 */
export const MIND_CHECK_TYPES = ['PHQ9', 'GAD7'] as const;
export type MindCheckType = (typeof MIND_CHECK_TYPES)[number];

export type MindBand = 'MINIMAL' | 'MILD' | 'MODERATE' | 'MODERATELY_SEVERE' | 'SEVERE';

export const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
] as const;

export interface MindCheckDefinition {
  type: MindCheckType;
  title: string;
  tagline: string;
  intro: string;
  questions: ReadonlyArray<{ id: string; text: string }>;
  /** Inclusive score ranges from the published scoring guides. */
  bands: ReadonlyArray<{ max: number; band: MindBand; label: string }>;
  loinc: string;
  source: string;
}

const INTRO = 'Over the last 2 weeks, how often have you been bothered by the following?';

export const MIND_CHECKS: Record<MindCheckType, MindCheckDefinition> = {
  PHQ9: {
    type: 'PHQ9',
    title: 'Mood check (PHQ-9)',
    tagline: 'Nine questions doctors use to understand low mood.',
    intro: INTRO,
    questions: [
      { id: 'interest', text: 'Little interest or pleasure in doing things' },
      { id: 'down', text: 'Feeling down, depressed, or hopeless' },
      { id: 'sleep', text: 'Trouble falling or staying asleep, or sleeping too much' },
      { id: 'tired', text: 'Feeling tired or having little energy' },
      { id: 'appetite', text: 'Poor appetite or overeating' },
      { id: 'failure', text: 'Feeling bad about yourself, or that you are a failure or have let yourself or your family down' },
      { id: 'concentration', text: 'Trouble concentrating on things, such as reading or watching television' },
      { id: 'movement', text: 'Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual' },
      { id: 'self_harm', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way' },
    ],
    bands: [
      { max: 4, band: 'MINIMAL', label: 'Minimal' },
      { max: 9, band: 'MILD', label: 'Mild' },
      { max: 14, band: 'MODERATE', label: 'Moderate' },
      { max: 19, band: 'MODERATELY_SEVERE', label: 'Moderately severe' },
      { max: 27, band: 'SEVERE', label: 'Severe' },
    ],
    loinc: '44261-6',
    source: 'Kroenke, Spitzer & Williams, J Gen Intern Med 2001',
  },
  GAD7: {
    type: 'GAD7',
    title: 'Anxiety check (GAD-7)',
    tagline: 'Seven questions about worry and feeling on edge.',
    intro: INTRO,
    questions: [
      { id: 'nervous', text: 'Feeling nervous, anxious, or on edge' },
      { id: 'control', text: 'Not being able to stop or control worrying' },
      { id: 'worry', text: 'Worrying too much about different things' },
      { id: 'relax', text: 'Trouble relaxing' },
      { id: 'restless', text: 'Being so restless that it is hard to sit still' },
      { id: 'irritable', text: 'Becoming easily annoyed or irritable' },
      { id: 'afraid', text: 'Feeling afraid, as if something awful might happen' },
    ],
    bands: [
      { max: 4, band: 'MINIMAL', label: 'Minimal' },
      { max: 9, band: 'MILD', label: 'Mild' },
      { max: 14, band: 'MODERATE', label: 'Moderate' },
      { max: 21, band: 'SEVERE', label: 'Severe' },
    ],
    loinc: '70274-6',
    source: 'Spitzer, Kroenke, Williams & Löwe, Arch Intern Med 2006',
  },
};

export const mindCheckSubmitSchema = z.object({
  answers: z.record(z.string().max(40), z.number().int().min(0).max(3)),
});
export type MindCheckSubmitInput = z.infer<typeof mindCheckSubmitSchema>;

export interface MindCheckResult {
  type: MindCheckType;
  score: number;
  maxScore: number;
  band: MindBand;
  label: string;
  /** PHQ-9 item 9 answered above "not at all": always shown crisis support, whatever the total. */
  selfHarm: boolean;
  advice: string;
  helplines: readonly Helpline[];
}

const ADVICE: Record<MindBand, string> = {
  MINIMAL: 'Few symptoms right now. Keep checking in, especially in the week before your period or after a big change.',
  MILD: 'Some symptoms. Sleep, daylight, movement and talking to someone you trust can help. Check again in two weeks.',
  MODERATE: 'This is worth talking to a doctor about. Depression and anxiety are common, are not your fault, and get better with treatment.',
  MODERATELY_SEVERE: 'Please talk to a doctor soon. Treatment works, and you don’t have to wait until it gets worse.',
  SEVERE: 'Please talk to a doctor this week. You deserve support now: Tele-MANAS on 14416 is free and open 24×7.',
};

export function missingMindAnswers(type: MindCheckType, answers: Readonly<Record<string, number>>): string[] {
  return MIND_CHECKS[type].questions.filter((q) => answers[q.id] === undefined).map((q) => q.id);
}

export function scoreMindCheck(type: MindCheckType, answers: Readonly<Record<string, number>>): MindCheckResult {
  const definition = MIND_CHECKS[type];
  const score = definition.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
  const { band, label } = definition.bands.find((b) => score <= b.max)!;
  const selfHarm = type === 'PHQ9' && (answers.self_harm ?? 0) > 0;
  const helplines = INDIA_HELPLINES.filter((h) => h.number === '14416' || (selfHarm && h.number === '112'));
  return {
    type,
    score,
    maxScore: definition.questions.length * 3,
    band,
    label,
    selfHarm,
    advice: selfHarm
      ? 'You said you have had thoughts of being better off dead or of hurting yourself. Please talk to someone today: call Tele-MANAS on 14416 (free, 24×7), or 112 if you are in danger right now.'
      : ADVICE[band],
    helplines: band === 'MINIMAL' && !selfHarm ? [] : helplines,
  };
}
