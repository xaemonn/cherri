'use client';

import { formatDay, labFlagStyles, type LabReportDto, type LabTrend } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, FileText, Trash2, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { CherryMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/chip';
import { EmptyState, ErrorNote, PageHeader, PageLoader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { keys, useInvalidateHealth, useLabs, useLabTrends } from '@/lib/queries';

function Sparkline({ trend }: { trend: LabTrend }) {
  const values = trend.points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${36 - ((v - min) / span) * 30}`).join(' ');
  const last = trend.points.at(-1)!;
  return (
    <Card className="p-4 sm:p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-bold">{trend.name}</p>
        <Pill style={{ background: labFlagStyles[last.flag].bg, color: labFlagStyles[last.flag].ink }}>{labFlagStyles[last.flag].label}</Pill>
      </div>
      <p className="font-display text-2xl font-semibold">
        {last.value} <span className="text-sm font-semibold text-ink-soft">{last.unit ?? trend.unit}</span>
      </p>
      <svg viewBox="0 0 100 40" className="mt-2 h-10 w-full" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} fill="none" stroke="#2E2230" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="text-[11px] text-ink-faint">
        {trend.points.length} results since {formatDay(trend.points[0]!.takenAt, { year: true })}
      </p>
    </Card>
  );
}

function ReportCard({ report, onDelete }: { report: LabReportDto; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-ink-soft uppercase">
            {formatDay(report.takenAt, { year: true })} · {report.source === 'MANUAL' ? 'Entered manually' : `Read by ${report.extractor === 'offline-parser' ? 'Cherri (offline)' : 'AI'}`}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{report.labName ?? 'Lab report'}</h3>
          <p className="mt-1 text-sm text-ink-soft">{report.summary}</p>
        </div>
        <button type="button" onClick={onDelete} aria-label="Delete report" className="rounded-full p-2 text-ink-faint hover:bg-cherry-soft hover:text-cherry-deep">
          <Trash2 className="size-4" />
        </button>
      </div>

      {report.highlights.length > 0 && (
        <div className="mt-4 space-y-2">
          {report.highlights.map((r) => (
            <div key={r.id} className="rounded-2xl p-3" style={{ background: labFlagStyles[r.flag].bg, color: labFlagStyles[r.flag].ink }}>
              <p className="font-bold">
                {r.name}: {r.value} {r.unit} <span className="text-xs">({labFlagStyles[r.flag].label})</span>
              </p>
              <p className="text-sm opacity-90">{r.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-4 inline-flex items-center gap-1 text-sm font-bold">
        {open ? 'Hide' : 'Show'} all {report.results.length} results <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-soft uppercase">
              <tr>
                <th className="py-2 pr-3">Test</th>
                <th className="py-2 pr-3">Result</th>
                <th className="py-2 pr-3">Range</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2 pr-3 font-semibold">{r.name}</td>
                  <td className="py-2 pr-3">
                    {r.value} {r.unit}
                  </td>
                  <td className="py-2 pr-3 text-ink-soft">{r.refLow != null || r.refHigh != null ? `${r.refLow ?? '–'} – ${r.refHigh ?? '–'}` : '—'}</td>
                  <td className="py-2">
                    <Pill style={{ background: labFlagStyles[r.flag].bg, color: labFlagStyles[r.flag].ink }}>{labFlagStyles[r.flag].label}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function LabsPage() {
  const labs = useLabs();
  const trends = useLabTrends();
  const queryClient = useQueryClient();
  const invalidateHealth = useInvalidateHealth();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function upload(file: Blob, name: string) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file, name);
      const report = await api.labs.upload(form);
      toast(`Decoded ${report.results.length} results`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.labs }),
        queryClient.invalidateQueries({ queryKey: keys.labTrends }),
        invalidateHealth(),
      ]);
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
    }
  }

  async function uploadSample() {
    const blob = await (await fetch('/sample-lab-report.png')).blob();
    await upload(blob, 'sample-lab-report.png');
  }

  const multiPointTrends = trends.data?.filter((t) => t.points.length >= 2) ?? [];

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Lab decoder" title="Blood report? Let’s decode it.">
        Upload a photo or PDF. Cherri reads every value, flags what’s off and explains it in plain words. Your file is processed and then
        thrown away. Only the numbers are kept.
      </PageHeader>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void upload(file, file.name);
        }}
        className={cn(
          'relative flex flex-col items-center gap-4 rounded-card border-[3px] border-dashed px-6 py-12 text-center transition-colors',
          dragging ? 'border-ink bg-olive-soft' : 'border-ink/30 bg-paper',
        )}
      >
        {uploading ? (
          <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CherryMark className="size-16 animate-wiggle" />
            <p className="font-display text-xl font-semibold">Decoding your report…</p>
            <p className="text-sm text-ink-soft">Reading values, checking ranges, writing explanations.</p>
          </motion.div>
        ) : (
          <>
            <span className="grid size-16 place-items-center rounded-full bg-ochre">
              <Upload className="size-7" />
            </span>
            <div>
              <p className="font-display text-2xl font-semibold">Drop your report here</p>
              <p className="text-sm text-ink-soft">PDF, JPG, PNG or WEBP · up to 8 MB</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => inputRef.current?.click()}>
                <FileText className="size-4" /> Choose a file
              </Button>
              <Button variant="outline" onClick={() => void uploadSample()}>
                Try a sample report
              </Button>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file, file.name);
            e.target.value = '';
          }}
        />
      </div>
      {error !== null && <ErrorNote error={error} />}

      {multiPointTrends.length > 0 && (
        <section>
          <SectionTitle eyebrow="Trends" title="How your numbers are moving" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {multiPointTrends.map((t) => (
              <Sparkline key={t.code} trend={t} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle eyebrow="Your reports" title="Decoded reports" />
        {labs.isLoading ? (
          <PageLoader />
        ) : labs.data?.length ? (
          <div className="space-y-4">
            {labs.data.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onDelete={async () => {
                  await api.labs.remove(report.id);
                  void queryClient.invalidateQueries({ queryKey: keys.labs });
                  void queryClient.invalidateQueries({ queryKey: keys.labTrends });
                  void invalidateHealth();
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No reports yet">
            Upload your latest blood test, or try the sample to see how it works.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
