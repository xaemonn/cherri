import { bandStyles, formatDay, labFlagStyles, PBAC_HEAVY_SCORE, severityStyles, type DoctorReport, type ReportBloodLoss } from '@cherri/shared';
import { CherryMark } from '@/components/brand/logo';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid border-t border-line pt-5">
      <h3 className="mb-3 text-xs font-semibold tracking-[0.18em] text-ink-soft uppercase">{title}</h3>
      {children}
    </section>
  );
}

const LIFE_STAGE_LABELS: Record<string, string> = {
  CYCLE: 'Menstruating',
  TTC: 'Trying to conceive',
  PREGNANCY: 'Pregnant',
  POSTPARTUM: 'Postpartum',
  PERIMENOPAUSE: 'Perimenopause',
  MENOPAUSE: 'Post-menopause',
};

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-bold text-ink-soft uppercase">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** PBAC sits first: a measured blood-loss score is the evidence most often missing at a heavy-period visit. */
function BloodLoss({ data }: { data: ReportBloodLoss }) {
  const max = Math.max(PBAC_HEAVY_SCORE * 1.5, ...data.cycles.map((c) => c.score));
  return (
    <section className={`break-inside-avoid rounded-2xl border-2 p-4 ${data.heavy ? 'border-cherry/50 bg-cherry-soft/50' : 'border-line bg-cream'}`}>
      <h3 className="text-xs font-semibold tracking-[0.18em] text-ink-soft uppercase">Menstrual blood loss · PBAC (Higham 1990)</h3>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p>
          <span className={`text-4xl font-semibold ${data.heavy ? 'text-cherry' : 'text-olive-deep'}`}>{data.score}</span> points
        </p>
        <p>
          ≈ <strong>{data.estimatedMl} mL</strong> per period
        </p>
        <p className={data.heavy ? 'font-bold text-cherry-deep' : 'font-semibold text-olive-deep'}>
          {data.heavy ? 'Heavy menstrual bleeding (PBAC > 100 or > 80 mL)' : 'Below the heavy-bleeding threshold'}
        </p>
      </div>
      <p className="mt-1 text-ink-soft">
        Period starting {formatDay(data.start)} · clots: {data.clotsLarge} large (≥ ₹5 coin), {data.clotsSmall} small · flooding episodes: {data.flooding}
      </p>
      {data.cycles.length > 1 && (
        <ul className="mt-3 space-y-1" aria-label="PBAC score by period">
          {data.cycles.map((c) => (
            <li key={c.start} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-2 text-xs">
              <span className="text-ink-soft">{formatDay(c.start)}</span>
              <span className="relative h-2.5 rounded-full bg-paper">
                <span className={`absolute inset-y-0 left-0 rounded-full ${c.heavy ? 'bg-cherry' : 'bg-olive'}`} style={{ width: `${(c.score / max) * 100}%` }} />
                <span className="absolute -inset-y-1 w-px bg-ink" style={{ left: `${(PBAC_HEAVY_SCORE / max) * 100}%` }} title="100-point threshold" />
              </span>
              <span className="text-right font-semibold">{c.score}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Clinician-facing one-pager. Numbers first, clinical terms, prints cleanly. */
export function DoctorReportView({ report }: { report: DoctorReport }) {
  const { patient, cycle, story, background, pregnancy, vitals } = report;
  const medications = report.medications ?? [];
  const bp = vitals?.bloodPressure ?? [];
  const weights = vitals?.weight ?? [];
  return (
    <article className="space-y-5 rounded-card border border-line bg-white p-6 text-[14px] leading-relaxed shadow-soft print:border-0 print:p-0 print:shadow-none sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">Patient-generated health summary</p>
          <h2 className="mt-1 text-3xl font-semibold">
            {patient.firstName ?? 'Patient'}
            {patient.age ? `, ${patient.age}` : ''}
          </h2>
          <p className="text-ink-soft">
            {LIFE_STAGE_LABELS[patient.lifeStage] ?? patient.lifeStage}
            {patient.knownConditions.length > 0 && ` · Known: ${patient.knownConditions.join(', ')}`}
          </p>
        </div>
        <div className="text-xs text-ink-soft sm:text-right">
          <p className="flex items-center gap-1.5 font-bold text-ink sm:justify-end">
            <CherryMark className="size-5" /> Cherri
          </p>
          <p>
            {formatDay(report.rangeStart, { year: true })} – {formatDay(report.rangeEnd, { year: true })}
          </p>
          <p>{report.loggedDays} days logged</p>
        </div>
      </header>

      {report.bloodLoss && <BloodLoss data={report.bloodLoss} />}

      {report.summary && <p className="rounded-2xl bg-cream p-4 text-[15px] leading-relaxed">{report.summary}</p>}

      {story && (
        <Section title="Presenting concern (in her own words)">
          <p className="text-base font-semibold">{story.mainConcern}</p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Fact label="Onset" value={story.since} />
            <Fact label="Timing" value={story.pattern} />
            <Fact label="Site" value={story.location} />
            <Fact label="Severity" value={story.severity} />
            <Fact label="Aggravating" value={story.triggers.join('; ')} />
            <Fact label="Relieving" value={story.relief.join('; ')} />
            <Fact label="Tried so far" value={story.tried.join('; ')} />
            <Fact label="Impact on daily life" value={story.impact} />
            <Fact label="Concerns" value={story.worries} />
          </dl>
          <details className="mt-3 print:block" open>
            <summary className="cursor-pointer text-xs font-bold text-ink-soft uppercase print:hidden">Her full account</summary>
            <blockquote className="mt-2 border-l-2 border-line pl-3 text-ink-soft">{story.inHerWords}</blockquote>
          </details>
        </Section>
      )}

      {(background || medications.length > 0) && (
        <Section title="Background and current medicines">
          {background && (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Fact label="Allergies" value={background.allergies ?? 'None recorded'} />
              <Fact label="Menarche" value={background.menarcheAge != null ? `Age ${background.menarcheAge}` : null} />
              <Fact label="Family history (mother/sisters)" value={background.familyHistory.join(', ')} />
              <Fact label="Past surgeries" value={background.surgeries} />
            </dl>
          )}
          {medications.length > 0 && (
            <ul className="mt-3 space-y-1">
              {medications.map((m) => (
                <li key={m.name}>
                  <strong>{m.name}</strong>
                  {[m.dose, m.schedule].filter(Boolean).length > 0 && ` ${[m.dose, m.schedule].filter(Boolean).join(', ')}`}
                  {m.reason && <span className="text-ink-soft"> · for {m.reason}</span>}
                  {m.since && <span className="text-ink-soft"> · since {formatDay(m.since, { year: true })}</span>}
                  {m.moodChange && (
                    <span className="ml-1 rounded-full bg-clay-soft px-2 py-0.5 text-xs font-bold text-clay-deep">
                      mean mood {m.moodChange.before} → {m.moodChange.after} /5 since starting
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {pregnancy && (
        <Section title={pregnancy.stage === 'PREGNANCY' ? 'Pregnancy' : 'Postnatal'}>
          <p>
            {pregnancy.stage === 'PREGNANCY' ? (
              <>
                Gestation <strong>{pregnancy.weeks}+{pregnancy.days} weeks</strong> (trimester {pregnancy.trimester}) · EDD <strong>{formatDay(pregnancy.dueDate, { year: true })}</strong>
              </>
            ) : (
              <>
                Delivered {formatDay(pregnancy.deliveryDate, { year: true })} · <strong>{pregnancy.weeksSinceBirth} weeks</strong> postnatal
              </>
            )}
          </p>
        </Section>
      )}

      {(bp.length > 0 || weights.length > 1) && (
        <Section title="Home vitals (self-measured)">
          {bp.length > 0 && (
            <p>
              Blood pressure, latest first:{' '}
              {[...bp]
                .reverse()
                .slice(0, 8)
                .map((r) => `${r.systolic}/${r.diastolic} (${formatDay(r.date)})`)
                .join(', ')}
              {bp.length > 8 && ` … ${bp.length} readings in total`}
            </p>
          )}
          {weights.length > 1 && (
            <p className="mt-1">
              Weight {weights[0]!.weightKg} kg ({formatDay(weights[0]!.date)}) → {weights.at(-1)!.weightKg} kg ({formatDay(weights.at(-1)!.date)})
            </p>
          )}
        </Section>
      )}

      {cycle && (
        <Section title="Menstrual cycle">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Mean cycle', cycle.averageCycleLength ? `${cycle.averageCycleLength} d` : '—'],
              ['Range', cycle.shortestCycle ? `${cycle.shortestCycle}–${cycle.longestCycle} d` : '—'],
              ['Pattern', cycle.regularity === 'UNKNOWN' ? 'Insufficient data' : cycle.regularity.toLowerCase()],
              ['Mean menses', cycle.averagePeriodLength ? `${cycle.averagePeriodLength} d` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-cream p-3">
                <p className="text-[11px] font-bold text-ink-soft uppercase">{label}</p>
                <p className="font-display text-lg font-semibold capitalize">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-ink-soft">
            LMP: {cycle.lastPeriodStart ? formatDay(cycle.lastPeriodStart, { year: true }) : '—'}
            {cycle.nextExpected && ` · Next expected ≈ ${formatDay(cycle.nextExpected, { year: true })}`}
          </p>
          {cycle.history.length > 0 && (
            <p className="mt-1 text-ink-soft">
              Cycle lengths:{' '}
              {cycle.history
                .filter((h) => h.cycleLength)
                .map((h) => h.cycleLength)
                .join(', ')}{' '}
              days
            </p>
          )}
        </Section>
      )}

      {report.pain.maximum != null && (
        <Section title="Pain">
          <p>
            Mean pain during menses: <strong>{report.pain.averageDuringPeriod ?? '—'}/10</strong> · Max: <strong>{report.pain.maximum}/10</strong> · Days ≥ 6/10:{' '}
            <strong>{report.pain.daysAt6OrMore}</strong>
          </p>
        </Section>
      )}

      {report.redFlags.length > 0 && (
        <Section title="Flags">
          <ul className="space-y-2">
            {report.redFlags.map((f) => (
              <li key={f.title} className="rounded-2xl px-3 py-2" style={{ background: severityStyles[f.severity as keyof typeof severityStyles]?.bg ?? '#ECE3D3' }}>
                <strong>{f.title}.</strong> {f.detail}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.symptoms.length > 0 && (
        <Section title="Symptoms (share of logged days)">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody>
                {report.symptoms.map((s) => (
                  <tr key={s.label} className="border-b border-line/60">
                    <td className="py-1.5 pr-3 font-semibold">{s.clinicalTerm ?? s.label}</td>
                    <td className="py-1.5 pr-3 text-ink-soft">{s.clinicalTerm ? s.label : ''}</td>
                    <td className="py-1.5 pr-3">{Math.round(s.shareOfLoggedDays * 100)}%</td>
                    <td className="py-1.5 text-ink-soft">{s.peakPhase ? `peaks: ${s.peakPhase}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {report.patterns.length > 0 && (
        <Section title="Cycle-linked patterns (Fisher’s exact test)">
          <ul className="list-disc space-y-1 pl-5">
            {report.patterns.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Section>
      )}

      {report.labs.length > 0 && (
        <Section title="Latest laboratory values">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody>
                {report.labs.map((l) => (
                  <tr key={l.name} className="border-b border-line/60">
                    <td className="py-1.5 pr-3 font-semibold">{l.name}</td>
                    <td className="py-1.5 pr-3">
                      {l.value} {l.unit}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: labFlagStyles[l.flag].bg, color: labFlagStyles[l.flag].ink }}>
                        {labFlagStyles[l.flag].label}
                      </span>
                    </td>
                    <td className="py-1.5 text-ink-soft">
                      {formatDay(l.takenAt, { year: true })}
                      {l.previous && ` (prev ${l.previous.value})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {report.screenings.length > 0 && (
        <Section title="Symptom screenings">
          <ul className="space-y-2">
            {report.screenings.map((s) => (
              <li key={s.title}>
                <strong>{s.title}</strong>{' '}
                <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: bandStyles[s.band].bg, color: bandStyles[s.band].ink }}>
                  {s.band}
                </span>{' '}
                <span className="text-ink-soft">({s.date}, {s.basis})</span>
                <p className="text-ink-soft">{s.summary}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.mindChecks && report.mindChecks.length > 0 && (
        <Section title="Mood questionnaires">
          <ul className="space-y-1">
            {report.mindChecks.map((m) => (
              <li key={m.type}>
                <strong>{m.type === 'PHQ9' ? 'PHQ-9' : 'GAD-7'}</strong> {m.score}/{m.maxScore} ({m.label.toLowerCase()}) <span className="text-ink-soft">· {formatDay(m.date, { year: true })}</span>
                {m.selfHarm && <span className="ml-2 rounded-full bg-cherry-soft px-2 py-0.5 text-xs font-bold text-cherry-deep">item 9 positive</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.notYetOnRecord && report.notYetOnRecord.length > 0 && (
        <Section title="Not yet on record">
          <ul className="list-disc space-y-0.5 pl-5 text-ink-soft">
            {report.notYetOnRecord.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </Section>
      )}

      {report.questionsToAsk.length > 0 && (
        <Section title="Patient’s questions">
          <ol className="list-decimal space-y-1 pl-5">
            {report.questionsToAsk.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </Section>
      )}

      {report.notes.length > 0 && (
        <Section title="Patient notes">
          <ul className="space-y-1">
            {report.notes.map((n) => (
              <li key={`${n.date}-${n.text}`}>
                <span className="font-semibold">{formatDay(n.date)}:</span> {n.text}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="border-t border-line pt-4 text-xs text-ink-soft">{report.disclaimer}</p>
    </article>
  );
}
