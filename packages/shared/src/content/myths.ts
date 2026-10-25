import type { EvidenceLevel, MythVerdict } from '../constants';

export interface Myth {
  id: string;
  claim: string;
  verdict: MythVerdict;
  evidence: EvidenceLevel;
  explanation: string;
  tags: readonly string[];
}

/** Curated, reviewed answers for the Myth-vs-Fact swipe game and as grounding for the AI fact-checker. */
export const MYTHS: readonly Myth[] = [
  {
    id: 'hair-wash',
    claim: 'You should not wash your hair or bathe during your period.',
    verdict: 'MYTH',
    evidence: 'STRONG',
    explanation:
      'Bathing and washing your hair during your period is completely safe. Good hygiene helps you feel better, and a warm bath can even ease cramps.',
    tags: ['hygiene', 'culture'],
  },
  {
    id: 'sour-food',
    claim: 'Eating sour foods like pickle, curd or tamarind makes period pain or flow worse.',
    verdict: 'MYTH',
    evidence: 'MODERATE',
    explanation:
      'No research links sour foods to period pain or flow. Curd is actually a good source of calcium and protein. Eat what suits your body.',
    tags: ['food', 'culture'],
  },
  {
    id: 'impure-blood',
    claim: 'Period blood is "dirty" or impure blood leaving the body.',
    verdict: 'MYTH',
    evidence: 'STRONG',
    explanation:
      'Menstrual blood is a mix of normal blood and the uterine lining. It is not toxic or impure. A period is a sign of a healthy, working body.',
    tags: ['culture', 'basics'],
  },
  {
    id: 'kitchen-temple',
    claim: 'Periods make food or spaces unhygienic, so you should stay out of the kitchen.',
    verdict: 'MYTH',
    evidence: 'STRONG',
    explanation:
      'There is no health or hygiene reason behind this. It comes from cultural tradition, not medicine. Touching food or cooking during your period is perfectly safe.',
    tags: ['culture'],
  },
  {
    id: 'pcos-infertile',
    claim: 'If you have PCOS, you can never get pregnant.',
    verdict: 'MYTH',
    evidence: 'STRONG',
    explanation:
      'Many people with PCOS get pregnant, some naturally and some with simple treatment to help ovulation. PCOS is one of the most treatable causes of fertility problems.',
    tags: ['pcos', 'fertility'],
  },
  {
    id: 'pain-normal',
    claim: 'Severe period pain is normal, so you just have to bear it.',
    verdict: 'MYTH',
    evidence: 'STRONG',
    explanation:
      'Mild cramps are common, but pain that stops you from studying, working or living normally is not. It can be a sign of endometriosis or adenomyosis, and it can be treated.',
    tags: ['pain', 'endometriosis'],
  },
  {
    id: 'pregnant-on-period',
    claim: 'You cannot get pregnant during your period.',
    verdict: 'MYTH',
    evidence: 'STRONG',
    explanation:
      'It is less likely, but possible, especially with short cycles. Sperm can survive up to 5 days, so sex near the end of a period can lead to pregnancy.',
    tags: ['fertility', 'contraception'],
  },
  {
    id: 'exercise-harmful',
    claim: 'Exercising during your period is harmful.',
    verdict: 'MYTH',
    evidence: 'MODERATE',
    explanation:
      'Gentle to moderate exercise is safe during your period and may reduce cramps and bloating. Listen to your body and rest when you need to.',
    tags: ['fitness', 'pain'],
  },
  {
    id: 'irregular-pcos',
    claim: 'Irregular periods always mean PCOS.',
    verdict: 'MISLEADING',
    evidence: 'STRONG',
    explanation:
      'PCOS is a common cause, but thyroid problems, high prolactin, stress, big weight changes, intense exercise and breastfeeding can all cause irregular periods. A doctor can find the real reason.',
    tags: ['pcos', 'thyroid'],
  },
  {
    id: 'cup-virginity',
    claim: 'Using a tampon or menstrual cup affects your virginity.',
    verdict: 'MYTH',
    evidence: 'STRONG',
    explanation:
      'Virginity is a social idea, not a medical one. Using a tampon or menstrual cup has nothing to do with it. Cups are a safe, eco-friendly and money-saving option.',
    tags: ['hygiene', 'culture'],
  },
  {
    id: 'cold-water',
    claim: 'Drinking cold water or eating ice cream during periods causes clots or infertility.',
    verdict: 'MYTH',
    evidence: 'MODERATE',
    explanation:
      'Cold foods do not affect your uterus, your clots or your fertility. Small clots during heavy-flow days are normal. Very large or frequent clots are worth checking.',
    tags: ['food', 'culture'],
  },
  {
    id: 'heat-helps',
    claim: 'A hot water bag helps period cramps.',
    verdict: 'TRUE',
    evidence: 'MODERATE',
    explanation:
      'Heat on your lower belly relaxes the cramping muscles of the uterus. Studies show it can work about as well as common painkillers for many people.',
    tags: ['pain'],
  },
  {
    id: 'chai-iron',
    claim: 'Drinking chai or coffee with meals reduces how much iron you absorb.',
    verdict: 'TRUE',
    evidence: 'STRONG',
    explanation:
      'Tea and coffee contain compounds that block iron absorption. Keep them at least an hour away from iron-rich meals, and add vitamin C like lemon or amla instead.',
    tags: ['anaemia', 'food'],
  },
  {
    id: 'seed-cycling',
    claim: 'Seed cycling (eating different seeds in each cycle phase) balances your hormones.',
    verdict: 'UNPROVEN',
    evidence: 'TREND_ONLY',
    explanation:
      'There are no studies showing seed cycling changes hormone levels. The seeds are nutritious, so there is no harm in eating them, but don’t rely on them to treat PCOS or irregular periods.',
    tags: ['trend', 'food'],
  },
  {
    id: 'cycle-syncing',
    claim: 'Syncing your workouts to your cycle phases gives better results.',
    verdict: 'UNPROVEN',
    evidence: 'EMERGING',
    explanation:
      'Research on training by cycle phase is early and mixed. Many people do notice energy changes across their cycle, so adjusting to how you feel is reasonable, but there is no strict rule.',
    tags: ['trend', 'fitness'],
  },
  {
    id: 'hpv-married',
    claim: 'Only married women need the HPV vaccine or cervical cancer screening.',
    verdict: 'MYTH',
    evidence: 'STRONG',
    explanation:
      'The HPV vaccine works best between ages 9 and 14, before any sexual contact. Cervical screening is recommended from age 30 in India for anyone with a cervix who has ever been sexually active. Marital status doesn’t matter.',
    tags: ['cancer', 'prevention'],
  },
  {
    id: 'anaemia-diet',
    claim: 'You only become anaemic if you don’t eat well.',
    verdict: 'MISLEADING',
    evidence: 'STRONG',
    explanation:
      'Heavy periods, pregnancy, worms, poor absorption and drinking tea with meals can all cause anaemia even with a good diet. A simple blood test tells you where you stand.',
    tags: ['anaemia'],
  },
];
