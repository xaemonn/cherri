import type { ScreeningType } from '../constants';

export interface ScreeningQuestion {
  id: string;
  text: string;
  hint?: string;
}

export interface ScreeningDefinition {
  type: ScreeningType;
  title: string;
  tagline: string;
  minutes: number;
  /** The published guidance the questions are built on. */
  basis: string;
  questions: ScreeningQuestion[];
  specialist: string;
  tests: string[];
}

export const SCREENINGS: Record<ScreeningType, ScreeningDefinition> = {
  PCOS: {
    type: 'PCOS',
    title: 'PCOS check',
    tagline: 'Irregular periods, acne, hair changes? See if they add up.',
    minutes: 2,
    basis: 'Rotterdam criteria and the 2023 International Evidence-based PCOS Guideline',
    questions: [
      { id: 'irregular', text: 'Are your periods usually irregular: more than 35 days apart, or fewer than 8 periods a year?' },
      { id: 'missed', text: 'Have you gone 3 months or more without a period (when not pregnant)?' },
      { id: 'hair', text: 'Do you have noticeable dark or coarse hair on your face, chest, belly or back?' },
      { id: 'acne', text: 'Do you have persistent acne as an adult, especially on the jawline or chin?' },
      { id: 'scalp', text: 'Is the hair on your scalp thinning, especially at the crown or parting?' },
      { id: 'ultrasound', text: 'Has an ultrasound ever shown "polycystic ovaries" or many small follicles?' },
      { id: 'weight', text: 'Do you find it hard to manage your weight, especially around the waist?' },
      { id: 'skin', text: 'Do you have dark, velvety patches of skin on your neck, armpits or groin?' },
      { id: 'family', text: 'Does your mother or sister have PCOS, or does a close relative have type 2 diabetes?' },
    ],
    specialist: 'Gynaecologist (or endocrinologist)',
    tests: [
      'Pelvic ultrasound',
      'Total testosterone',
      'LH and FSH',
      'TSH and prolactin (to rule out other causes)',
      'Fasting glucose or HbA1c',
      'Lipid profile',
    ],
  },
  ENDOMETRIOSIS: {
    type: 'ENDOMETRIOSIS',
    title: 'Endometriosis check',
    tagline: 'Period pain that wrecks your day is not "normal".',
    minutes: 2,
    basis: 'Symptoms listed in NICE guideline NG73 (Endometriosis: diagnosis and management)',
    questions: [
      { id: 'pain_daily', text: 'Does period pain stop you from going to college or work, or from doing daily activities?' },
      {
        id: 'painkillers',
        text: 'Does your period pain continue even after taking regular painkillers?',
        hint: 'For example ibuprofen or mefenamic acid (Meftal).',
      },
      { id: 'pelvic', text: 'Have you had pelvic or lower-belly pain on non-period days for 6 months or more?' },
      { id: 'sex', text: 'Do you feel deep pain during or after sex?' },
      { id: 'bowel', text: 'Is it painful to poop around your period?' },
      { id: 'urine', text: 'Do you have pain or see blood when peeing around your period?' },
      { id: 'fertility', text: 'Have you been trying to get pregnant for over a year without success?' },
      { id: 'family', text: 'Does your mother or sister have endometriosis?' },
    ],
    specialist: 'Gynaecologist, ideally one experienced in endometriosis',
    tests: [
      'Pelvic examination',
      'Transvaginal or pelvic ultrasound',
      'MRI if deep endometriosis is suspected',
    ],
  },
  PMDD: {
    type: 'PMDD',
    title: 'PMS / PMDD check',
    tagline: 'When the week before your period feels like a different person.',
    minutes: 2,
    basis: 'DSM-5 criteria for premenstrual dysphoric disorder',
    questions: [
      { id: 'mood_swings', text: 'In the week before your period, do you have sudden mood swings, feel suddenly sad or tearful, or feel very sensitive?' },
      { id: 'irritable', text: 'Do you feel very irritable or angry, or get into more arguments?' },
      { id: 'depressed', text: 'Do you feel very low, hopeless or self-critical?' },
      { id: 'anxious', text: 'Do you feel anxious, tense or on edge?' },
      { id: 'interest', text: 'Do you lose interest in your usual activities, like studies, work or friends?' },
      { id: 'focus', text: 'Do you find it hard to concentrate?' },
      { id: 'energy', text: 'Do you feel very tired or low on energy?' },
      { id: 'appetite', text: 'Do you overeat or have strong food cravings?' },
      { id: 'sleep', text: 'Do you sleep much more or much less than usual?' },
      { id: 'overwhelmed', text: 'Do you feel overwhelmed or out of control?' },
      { id: 'physical', text: 'Do you get physical symptoms like breast tenderness, bloating, or joint or muscle pain?' },
      { id: 'timing', text: 'Do these feelings ease within a few days after your period starts and mostly go away the week after?' },
      { id: 'impact', text: 'Do they seriously affect your studies, work, relationships or daily life?' },
    ],
    specialist: 'Gynaecologist or psychiatrist',
    tests: ['Daily symptom tracking for at least 2 cycles (Cherri does this for you)', 'TSH (to rule out thyroid problems)'],
  },
  ANEMIA: {
    type: 'ANEMIA',
    title: 'Anaemia check',
    tagline: 'Always tired? More than half of Indian women are anaemic.',
    minutes: 1,
    basis: 'Common symptoms of iron-deficiency anaemia (WHO, NHS) and NFHS-5 risk factors',
    questions: [
      { id: 'heavy', text: 'Are your periods heavy (soaking a pad every 1–2 hours or passing large clots) or longer than 7 days?' },
      { id: 'tired', text: 'Do you feel tired or weak most days, even after resting?' },
      { id: 'breath', text: 'Do you get breathless, or does your heart race, with light activity like climbing stairs?' },
      { id: 'dizzy', text: 'Do you often feel dizzy or lightheaded?' },
      { id: 'pale', text: 'Have people said you look pale, or are your inner eyelids or nails pale?' },
      { id: 'pica', text: 'Do you crave ice, mud, chalk or raw rice?' },
      { id: 'hair_nails', text: 'Is your hair falling more than usual, or are your nails brittle or spoon-shaped?' },
      { id: 'diet', text: 'Do you rarely eat iron-rich foods (leafy greens, dals, jaggery, eggs, meat) or often skip meals?' },
      { id: 'cold', text: 'Are your hands and feet often cold?' },
    ],
    specialist: 'General physician or gynaecologist',
    tests: ['Complete blood count (CBC)', 'Serum ferritin', 'Vitamin B12 and folate'],
  },
  THYROID: {
    type: 'THYROID',
    title: 'Thyroid check',
    tagline: 'Tired, cold, hair fall, periods off? Your thyroid might be why.',
    minutes: 1,
    basis: 'Common symptoms of hypothyroidism and hyperthyroidism (NHS, American Thyroid Association)',
    questions: [
      { id: 'tired', text: 'Do you feel tired or sluggish most of the time?' },
      { id: 'weight_gain', text: 'Have you gained weight without a clear reason?' },
      { id: 'cold', text: 'Do you feel cold when others around you don’t?' },
      { id: 'constipation', text: 'Are you often constipated?' },
      { id: 'dry', text: 'Do you have dry skin or brittle hair?' },
      { id: 'hair', text: 'Has your hair been thinning or falling more?' },
      { id: 'periods', text: 'Have your periods become heavier, longer or more irregular than before?' },
      { id: 'mood', text: 'Do you have low mood, slowed thinking or brain fog?' },
      { id: 'neck', text: 'Have you noticed a swelling or lump at the front of your neck?' },
      { id: 'hyper', text: 'Do you have a racing heart, shaky hands, feel hot and sweaty, or lose weight without trying?' },
      { id: 'family', text: 'Does anyone in your family have a thyroid problem?' },
    ],
    specialist: 'General physician or endocrinologist',
    tests: ['TSH', 'Free T4', 'Anti-TPO antibodies (if TSH is abnormal)'],
  },
};
