'use client';

import type { ShareCreated } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Eye, FileJson, Printer, QrCode, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { DoctorReportView } from '@/components/report/doctor-report';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/field';
import { ErrorNote, PageHeader, PageLoader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { downloadJson } from '@/lib/download';
import { keys, useReportPreview, useShares } from '@/lib/queries';

function timeLeft(iso: string) {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return 'expired';
  const hours = Math.round(ms / 3_600_000);
  return hours >= 24 ? `${Math.round(hours / 24)} days left` : `${Math.max(1, hours)}h left`;
}

export default function ReportPage() {
  const preview = useReportPreview(180);
  const shares = useShares();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [singleView, setSingleView] = useState(false);
  const [created, setCreated] = useState<ShareCreated | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setCreating(true);
    try {
      const share = await api.reports.create({ expiresInHours, rangeDays: 180, includeNotes: true, ...(singleView && { maxViews: 1 }) });
      setCreated(share);
      void queryClient.invalidateQueries({ queryKey: keys.shares });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create link.', '😕');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Doctor report" title="Walk in with evidence">
        One page your gynaecologist can read in a minute: cycle stats, pain, patterns, flags, labs and your questions, in clinical terms.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          {preview.isLoading ? <PageLoader label="Building your report…" /> : preview.error || !preview.data ? <ErrorNote error={preview.error} /> : <DoctorReportView report={preview.data} />}
        </div>

        <aside className="order-1 space-y-4 lg:sticky lg:top-6 lg:order-2 lg:self-start">
          <Card sticker tone="ochre">
            <QrCode className="size-8" />
            <h2 className="mt-2 text-2xl font-semibold">Share with your doctor</h2>
            <p className="mt-1 text-sm text-ink-soft">They scan a QR code and see this report. No app or login needed. The link expires on its own.</p>
            <label className="mt-4 block text-sm font-bold">
              Link works for
              <Select className="mt-1.5 h-11" value={expiresInHours} onChange={(e) => setExpiresInHours(Number(e.target.value))}>
                <option value={1}>1 hour</option>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
              </Select>
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 accent-[#33261C]" checked={singleView} onChange={(e) => setSingleView(e.target.checked)} />
              Allow only one view
            </label>
            <Button className="mt-4 w-full" onClick={() => void createLink()} disabled={creating}>
              {creating ? 'Creating…' : 'Create QR link'}
            </Button>
          </Card>

          {created && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- QR is a data URL from the API */}
                <img src={created.qrCode} alt="QR code for the doctor report" className="mx-auto size-56 rounded-2xl border border-ink/10" />
                <p className="mt-3 text-sm font-bold">Scan to open · {timeLeft(created.expiresAt)}</p>
                <div className="mt-3 flex gap-2">
                  <input readOnly value={created.url} className="min-w-0 flex-1 rounded-full border border-line bg-cream px-3 text-xs" aria-label="Share link" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(created.url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            <Printer className="size-4" /> Print or save as PDF
          </Button>
          <Button
            variant="outline"
            className="w-full"
            title="HL7 FHIR R4, the format hospital systems and ABDM health lockers use"
            onClick={async () => {
              try {
                downloadJson(`cherri-fhir-${new Date().toISOString().slice(0, 10)}.json`, await api.reports.fhir(180), 'application/fhir+json');
              } catch (error) {
                toast(error instanceof Error ? error.message : 'Could not export.', '😕');
              }
            }}
          >
            <FileJson className="size-4" /> Download for hospital systems (FHIR)
          </Button>
          <ButtonLink href="/prep" variant="ghost" className="w-full">
            <Stethoscope className="size-4" /> Add your story & medicines
          </ButtonLink>

          {shares.data && shares.data.length > 0 && (
            <Card>
              <h3 className="font-semibold">Your links</h3>
              <ul className="mt-3 space-y-2">
                {shares.data.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl bg-cream px-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold">{s.active ? timeLeft(s.expiresAt) : s.revokedAt ? 'Turned off' : 'Expired'}</span>
                      <span className="ml-2 inline-flex items-center gap-1 text-ink-soft">
                        <Eye className="size-3.5" /> {s.viewCount}
                      </span>
                    </span>
                    {s.active && (
                      <button
                        type="button"
                        className="text-xs font-bold text-cherry-deep underline"
                        onClick={async () => {
                          await api.reports.revoke(s.id);
                          void queryClient.invalidateQueries({ queryKey: keys.shares });
                          toast('Link turned off', '🔒');
                        }}
                      >
                        Turn off
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
