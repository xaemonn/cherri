import {
  APP_NAME,
  babySize,
  bloodPressureReadings,
  PHASE_GUIDES,
  summarizeSymptoms,
  latestLabsByCode,
  type CompanionTone,
  type Language,
} from '@cherri/shared';
import type { HealthSnapshot } from '../../insights/insights.service';
import type { KnowledgeHit } from '../../knowledge/knowledge.service';

const TONES: Record<CompanionTone, string> = {
  BESTIE:
    'Gen Z best friend: warm, casual and playful, with an emoji or two (warm ones like 🍒✨💛🌻, never pink hearts or flowers), never cringe. Validate her feelings before giving information.',
  BIG_SIS: 'Caring older sister: warm, reassuring and practical, a little protective.',
  CLINICAL:
    'Calm, precise and factual, like a doctor friend. Minimal emoji. Use correct medical terms with a plain-language explanation.',
};

const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', hi: 'Hindi', hinglish: 'Hinglish', kn: 'Kannada' };

export function systemPrompt(tone: CompanionTone, language: Language): string {
  return `You are ${APP_NAME}, the AI health companion inside the ${APP_NAME} women's health app, made for India. Talk to her like a close, trusted friend.

Tone: ${TONES[tone]}
Language: reply in the same language and script she writes in. If she writes Hindi in English letters (Hinglish), reply in natural Hinglish. Her preferred language is ${LANGUAGE_NAMES[language]}.

What you do:
- Help her understand her body, symptoms, cycle and lab results in simple words.
- Personalise answers with her data below, for example by linking tiredness to low haemoglobin or to her cycle phase.
- When she describes symptoms she has now or had recently, call log_symptoms so they are saved, then briefly tell her what you logged.
- For questions about timing (next period, fertile days, late period), call get_cycle_status.
- For medical facts, use the health library excerpts. Call search_health_library with an English query if you need more. Cite excerpts inline like [1].
- If her symptoms match a check she hasn't done (PCOS, ENDOMETRIOSIS, PMDD, ANEMIA, THYROID), call suggest_screening.

Safety rules (never break them):
- You are not a doctor. Never diagnose. Say "this can be a sign of..." and suggest a doctor when appropriate.
- Don't give medicine doses beyond standard over-the-counter label advice. For prescription medicines, tell her to ask her doctor.
- Emergencies (heavy bleeding with dizziness, severe one-sided belly pain with a missed period, fainting, thoughts of self-harm): urge her to call 108 or 112 or go to a hospital now. For mental health crises, share Tele-MANAS 14416.
- In pregnancy or the 6 weeks after birth, these are danger signs that need a hospital the same day: bleeding, fits, a severe headache or blurred vision, blood pressure of 140/90 or more with headache or swelling, leaking fluid, the baby moving less, fever, or breathlessness. Point her to 102 (free pregnancy transport) or 108. Never reassure her that a danger sign is normal.
- Never tell her to start, stop or change a prescribed medicine. Suggest she discusses it with her doctor.
- Be warm and non-judgemental about sex, contraception, periods and bodies. Never moralise.
- Never ask for her full name, phone number, address or ID numbers.
- Keep replies short and warm: 2 to 5 sentences, or up to 4 short bullets, under 90 words. Bold at most one phrase. No tables or headings.`;
}

const REPLY_LANGUAGE: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi in Devanagari script',
  hinglish: 'Hinglish (Hindi written in English letters, mixed with English words, exactly how she types)',
  kn: 'Kannada in Kannada script (simple, everyday Kannada; keep medicine and test names in English)',
};

/** Pinned to the end of the prompt so the model doesn't drift into English. */
export function replyLanguageRule(language: Language): string {
  return `## This reply\nWrite your whole reply in ${REPLY_LANGUAGE[language]}.`;
}

/** A compact summary of her data. Aggregates only; raw rows never leave the server. */
export function healthContext(snap: HealthSnapshot): string {
  const lines: string[] = [`- Today: ${snap.today}. Life stage: ${snap.user.lifeStage}.${snap.age ? ` Age: ${snap.age}.` : ''}`];

  if (snap.pregnancy) {
    const baby = babySize(snap.pregnancy.weeks);
    lines.push(
      `- Pregnancy: ${snap.pregnancy.weeks} weeks ${snap.pregnancy.days} days (trimester ${snap.pregnancy.trimester}), due ${snap.pregnancy.dueDate}${baby ? `; baby is about the size of ${baby.name}` : ''}.`,
    );
  } else if (snap.postpartum) {
    lines.push(`- Gave birth ${snap.postpartum.weeks} weeks ago (${snap.postpartum.days} days).`);
  }
  const readings = bloodPressureReadings(snap.logs).slice(-3);
  if (readings.length) lines.push(`- Recent blood pressure: ${readings.map((r) => `${r.systolic}/${r.diastolic} (${r.date})`).join(', ')}.`);

  const current = snap.prediction?.current;
  const next = snap.prediction?.nextPeriod;
  if (current && next) {
    const guide = PHASE_GUIDES[current.phase];
    lines.push(
      `- Cycle: day ${current.day}, ${guide.name} (${guide.vibe}). Next period expected ${next.date} (±2 days, ${Math.round(next.confidence * 100)}% confidence)${next.isLate ? `; currently ${next.daysLate} days late` : ''}.`,
    );
    const stats = snap.prediction!.stats;
    if (stats.avgCycleLength) {
      lines.push(`- Cycle stats: average ${stats.avgCycleLength} days, ${stats.regularity.toLowerCase()}, ${stats.completedCycles} cycles logged.`);
    }
  } else if (snap.prediction) {
    lines.push('- No periods logged yet.');
  }

  const recent = summarizeSymptoms(snap.logs, snap.periods, {
    today: snap.today,
    expectedCycleLength: snap.expectedCycleLength,
    defaultPeriodLength: snap.user.avgPeriodLength,
    days: 14,
  }).slice(0, 6);
  if (recent.length) lines.push(`- Last 14 days: ${recent.map((s) => `${s.label.toLowerCase()} ×${s.days}`).join(', ')}.`);

  if (snap.patterns.patterns.length) {
    const patterns = snap.patterns.patterns
      .slice(0, 4)
      .map((p) => `${p.message}${p.hint?.screening ? ` (suggests the ${p.hint.screening} check)` : ''}`);
    lines.push(`- Patterns found: ${patterns.join(' ')}`);
  }
  if (snap.redFlags.length) lines.push(`- Flags: ${snap.redFlags.slice(0, 4).map((f) => f.title).join('; ')}.`);

  const labs = [...latestLabsByCode(snap.labs).values()];
  if (labs.length) {
    const shown = labs.filter((l) => l.flag !== 'NORMAL').concat(labs.filter((l) => l.flag === 'NORMAL')).slice(0, 6);
    lines.push(`- Latest labs: ${shown.map((l) => `${l.name} ${l.value}${l.unit ? ` ${l.unit}` : ''} (${l.flag.toLowerCase()}, ${l.takenAt})`).join('; ')}.`);
  }
  if (snap.user.conditions.length) lines.push(`- Known conditions: ${snap.user.conditions.join(', ')}.`);

  return `## Her data (private: use it to personalise, don't recite it all)\n${lines.join('\n')}`;
}

export function libraryContext(hits: readonly KnowledgeHit[], startIndex = 1): string {
  if (hits.length === 0) return '';
  const excerpts = hits.map((h, i) => `[${startIndex + i}] ${h.title}: ${h.heading} (${h.source})\n${h.text}`).join('\n\n');
  return `## Health library excerpts\n${excerpts}`;
}
