import type { CyclePhase, EvidenceLevel } from '../constants';

export interface PhaseTip {
  kind: 'NOURISH' | 'MOVE' | 'CARE' | 'KNOW';
  text: string;
  evidence: EvidenceLevel;
}

export interface PhaseGuide {
  phase: CyclePhase;
  name: string;
  vibe: string;
  emoji: string;
  description: string;
  tips: readonly PhaseTip[];
}

/** Each tip carries an Evidence Meter rating, so trends never get dressed up as science. */
export const PHASE_GUIDES: Record<CyclePhase, PhaseGuide> = {
  MENSTRUAL: {
    phase: 'MENSTRUAL',
    name: 'Menstrual phase',
    vibe: 'Reset Era',
    emoji: '',
    description: 'Hormones are at their lowest. It’s normal to want rest, warmth and comfort food.',
    tips: [
      { kind: 'NOURISH', text: 'Pair iron with vitamin C, like palak dal with a squeeze of lemon, or poha with peanuts and lemon.', evidence: 'STRONG' },
      { kind: 'CARE', text: 'A hot water bag on your lower belly relaxes cramping muscles.', evidence: 'MODERATE' },
      { kind: 'MOVE', text: 'Gentle walks, stretching or yoga can ease cramps. Rest when you need to.', evidence: 'MODERATE' },
      { kind: 'KNOW', text: 'Soaking a pad every 1–2 hours or passing large clots is heavy bleeding, and worth a check-up.', evidence: 'STRONG' },
    ],
  },
  FOLLICULAR: {
    phase: 'FOLLICULAR',
    name: 'Follicular phase',
    vibe: 'Glow-Up Era',
    emoji: '',
    description: 'Oestrogen is rising. Many people feel their energy, mood and focus lift.',
    tips: [
      { kind: 'NOURISH', text: 'Protein-rich breakfasts like besan chilla, eggs or sprouts keep rising energy steady.', evidence: 'MODERATE' },
      { kind: 'MOVE', text: 'If you feel energetic, it’s a good time to try a new workout or push a little harder.', evidence: 'EMERGING' },
      { kind: 'CARE', text: 'Use the extra motivation to start things, like a new project, plan or habit.', evidence: 'TREND_ONLY' },
    ],
  },
  OVULATORY: {
    phase: 'OVULATORY',
    name: 'Ovulation',
    vibe: 'Main Character Era',
    emoji: '',
    description: 'An egg is released. Confidence and social energy often peak.',
    tips: [
      { kind: 'KNOW', text: 'This is your most fertile window. Use contraception if you’re avoiding pregnancy.', evidence: 'STRONG' },
      { kind: 'KNOW', text: 'A one-sided twinge in your lower belly (mittelschmerz) or clear, stretchy discharge is normal now.', evidence: 'STRONG' },
      { kind: 'CARE', text: 'Feeling social? Plan the big conversation, presentation or get-together.', evidence: 'TREND_ONLY' },
    ],
  },
  LUTEAL: {
    phase: 'LUTEAL',
    name: 'Luteal phase',
    vibe: 'Cozy Era',
    emoji: '',
    description: 'Progesterone rises, then both hormones fall before your period. Slowing down is valid.',
    tips: [
      { kind: 'NOURISH', text: 'Cravings are real. Your body uses a bit more energy now. Try roasted chana, ragi, fruit with peanut butter or a little dark chocolate.', evidence: 'MODERATE' },
      { kind: 'NOURISH', text: 'Magnesium-rich foods like pumpkin seeds, bananas and leafy greens may ease PMS.', evidence: 'EMERGING' },
      { kind: 'CARE', text: 'Protect your sleep. Mood often dips in the week before a period.', evidence: 'MODERATE' },
      { kind: 'CARE', text: 'Going easy on salt and caffeine may reduce bloating and breast tenderness.', evidence: 'EMERGING' },
    ],
  },
};
