export type SafetyCategory = 'SELF_HARM' | 'MEDICAL_EMERGENCY' | 'VIOLENCE';

export interface Helpline {
  name: string;
  number: string;
  description: string;
}

export const INDIA_HELPLINES: readonly Helpline[] = [
  { name: 'Emergency', number: '112', description: 'All-India emergency number for police, fire and medical help.' },
  { name: 'Ambulance', number: '108', description: 'Free emergency ambulance in most states.' },
  { name: 'Pregnancy & baby transport', number: '102', description: 'Free ambulance for pregnant women and sick infants under JSSK.' },
  { name: 'Women Helpline', number: '181', description: 'Support for women facing violence or distress.' },
  { name: 'Women Helpline (Police)', number: '1091', description: 'Police helpline for women in danger or being harassed.' },
  { name: 'Tele-MANAS', number: '14416', description: 'Free 24×7 mental health support from the Government of India (also 1-800-891-4416).' },
  { name: 'Cyber Crime Helpline', number: '1930', description: 'Report online harassment, morphed photos or blackmail. Also cybercrime.gov.in.' },
];

const PATTERNS: Record<SafetyCategory, RegExp[]> = {
  SELF_HARM: [
    /suicid/i,
    /\bkill(ing)? my ?self\b/i,
    /\bend (my life|it all)\b/i,
    /\bwant to die\b/i,
    /\bdon'?t want to (live|be alive)\b/i,
    /\bself[- ]?harm/i,
    /\b(cut|hurt)(ting)? my ?self\b/i,
    /\bno reason to live\b/i,
    /\bmar(na|\s?jaana|\s?jana) chaht?i\b/i,
    /\bkhud ?kushi\b/i,
    /\baatm ?hatya\b/i,
    /\bjeena nahi? chaht?i\b/i,
    /आत्महत्या|खुदकुशी|मरना चाहती/,
    /ಆತ್ಮಹತ್ಯೆ|ಸಾಯಬೇಕು|ಸಾಯಲು ಬಯಸ/,
  ],
  MEDICAL_EMERGENCY: [
    /\bsoak(ing|ed|s)?\b.{0,30}\b(every|each|in an?) (hour|30 min)/i,
    /\b(fainted|fainting|passed out|unconscious|behosh)\b/i,
    /\b(can'?t|cannot|unable to) breathe\b/i,
    /\bchest pain\b/i,
    /\bpregnan\w*\b.{0,40}\b(bleeding|severe pain|lot of pain)\b/i,
    /\b(bleeding|severe pain)\b.{0,40}\bpregnan/i,
    /\bbleeding (won'?t|will not|doesn'?t|does not) stop\b/i,
    /\bseizure|convulsion|\b(had|having|getting) fits\b|\bdaura pad/i,
    /\bwaters? (broke|has broken|have broken)\b/i,
    /\bbaby (is |has )?(not moving|stopped moving|not moved)\b/i,
    /ಮೂರ್ಛೆ|ಪ್ರಜ್ಞೆ ತಪ್ಪ/,
  ],
  VIOLENCE: [
    /\b(raped|rape|sexual(ly)? assault(ed)?|molest(ed)?)\b/i,
    /\b(he|husband|partner|boyfriend|in-?laws?)\b.{0,20}\b(hits|beats|beat|hurts|abuses|slapped)\b/i,
    /\bdomestic violence\b/i,
    /\bmaar(ta|te) h(ai|ain)\b/i,
    /ಹೊಡೆಯುತ್ತಾ(ನೆ|ರೆ)|ಕಿರುಕುಳ/,
  ],
};

export interface SafetyConcern {
  category: SafetyCategory;
  helplines: readonly Helpline[];
  message: string;
}

const NUMBERS: Record<SafetyCategory, string[]> = {
  SELF_HARM: ['14416', '112'],
  MEDICAL_EMERGENCY: ['108', '102', '112'],
  VIOLENCE: ['181', '1091', '112'],
};

const MESSAGES: Record<SafetyCategory, string> = {
  SELF_HARM:
    'I’m really glad you told me. You deserve support right now. Please call Tele-MANAS on 14416 (free, 24×7) or 112 if you are in immediate danger. If you can, reach out to someone you trust and let them know how you’re feeling.',
  MEDICAL_EMERGENCY:
    'What you’re describing can be a medical emergency. Please call 108 for an ambulance or 112, or go to the nearest hospital now. Don’t wait for symptoms to settle.',
  VIOLENCE:
    'I’m so sorry this is happening. It is not your fault. You can call the Women Helpline on 181 for confidential support, or 112 if you are in danger right now.',
};

/** Deterministic, multilingual first-line check that runs before any AI is involved. */
export function detectSafetyConcern(text: string): SafetyConcern | null {
  for (const category of ['SELF_HARM', 'MEDICAL_EMERGENCY', 'VIOLENCE'] as const) {
    if (PATTERNS[category].some((p) => p.test(text))) {
      return {
        category,
        helplines: INDIA_HELPLINES.filter((h) => NUMBERS[category].includes(h.number)),
        message: MESSAGES[category],
      };
    }
  }
  return null;
}

/** Strip direct identifiers before text leaves our servers for an AI provider. */
export function redactPII(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[id-number]')
    .replace(/(?:\+91[\s-]?|\b0)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, '[phone]');
}
