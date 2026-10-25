/**
 * Preventive check-ups by age, following India's NP-NCD programme (population-based screening of
 * everyone over 30 for oral, breast and cervical cancer, blood pressure and diabetes) plus WHO and
 * Anemia Mukt Bharat guidance. Most are free at government health centres.
 */
export interface PreventiveCheck {
  id: string;
  title: string;
  fromAge: number;
  toAge?: number;
  howOften: string;
  detail: string;
}

export const PREVENTIVE_CHECKS: readonly PreventiveCheck[] = [
  {
    id: 'hpv_vaccine',
    title: 'HPV vaccine',
    fromAge: 9,
    toAge: 26,
    howOften: 'Best at 9–14; catch-up later',
    detail: 'Protects against the virus behind most cervical cancers. If you are older than 14, ask your doctor about catch-up doses.',
  },
  {
    id: 'haemoglobin',
    title: 'Haemoglobin test',
    fromAge: 15,
    toAge: 49,
    howOften: 'Once a year, sooner with heavy periods',
    detail: 'More than half of Indian women aged 15–49 are anaemic (NFHS-5). Testing and iron tablets are free under Anemia Mukt Bharat.',
  },
  {
    id: 'cervical',
    title: 'Cervical cancer screening',
    fromAge: 30,
    toAge: 65,
    howOften: 'Every 5 years',
    detail: 'A quick VIA test (or a Pap or HPV test) finds changes years before they become cancer. Free at government health centres.',
  },
  {
    id: 'breast',
    title: 'Clinical breast examination',
    fromAge: 30,
    toAge: 65,
    howOften: 'Every 5 years, and know your normal',
    detail: 'A trained health worker checks your breasts. In between, see a doctor for a new lump, skin dimpling, nipple discharge or a change in shape.',
  },
  {
    id: 'oral',
    title: 'Mouth (oral cancer) check',
    fromAge: 30,
    howOften: 'Every 5 years',
    detail: 'A quick look inside the mouth, especially important if you use tobacco, gutkha or betel nut.',
  },
  {
    id: 'bp_sugar',
    title: 'Blood pressure and blood sugar',
    fromAge: 30,
    howOften: 'At least once a year',
    detail: 'Free at Ayushman Arogya Mandirs. PCOS, or high blood pressure or diabetes in a pregnancy, raises your risk later in life, so start earlier if that’s you.',
  },
  {
    id: 'bone',
    title: 'Bone density (DEXA) scan',
    fromAge: 65,
    howOften: 'Ask your doctor',
    detail: 'Bones thin after menopause. Ask sooner if you had an early menopause, are very underweight, or broke a bone in a small fall.',
  },
];

/** The checks that apply at her age (all of them, in order, when her age isn't known). */
export function preventiveChecksFor(age: number | null): PreventiveCheck[] {
  if (age == null) return [...PREVENTIVE_CHECKS];
  return PREVENTIVE_CHECKS.filter((c) => age >= c.fromAge && (c.toAge === undefined || age <= c.toAge));
}
