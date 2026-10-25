'use client';

import { toFhirBundle, type ShareView } from '@cherri/shared';
import { FileJson, Lock, Printer } from 'lucide-react';
import { use, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { DoctorReportView } from '@/components/report/doctor-report';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { downloadJson } from '@/lib/download';

/** What a doctor sees after scanning the QR code. Each load counts as one logged view. */
export function SharedReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [view, setView] = useState<ShareView | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Every fetch is a logged view, so never fetch twice (React dev mode re-runs effects).
  const requested = useRef<string | null>(null);

  useEffect(() => {
    if (requested.current === token) return;
    requested.current = token;
    api.share
      .view(token)
      .then(setView)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'This link could not be opened.'));
  }, [token]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Logo />
        {view && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-soft px-3 py-1.5 text-xs font-bold text-olive-deep">
              <Lock className="size-3.5" /> Shared securely · expires {new Date(view.expiresAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              title="HL7 FHIR R4 bundle for your hospital system (built from this page, no extra view)"
              onClick={() => downloadJson(`patient-summary-fhir-${view.report.rangeEnd}.json`, toFhirBundle(view.report), 'application/fhir+json')}
            >
              <FileJson className="size-4" /> FHIR
            </Button>
          </div>
        )}
      </header>
      {error ? (
        <div className="rounded-card border border-ink/10 bg-paper p-8 text-center shadow-lift">
          <p className="text-4xl">🔒</p>
          <h1 className="mt-3 text-2xl font-semibold">{error}</h1>
          <p className="mt-2 text-ink-soft">Shared links expire to protect the patient’s privacy. Ask them to create a new one in Cherri.</p>
        </div>
      ) : view ? (
        <DoctorReportView report={view.report} />
      ) : (
        <PageLoader label="Opening report…" />
      )}
    </div>
  );
}
