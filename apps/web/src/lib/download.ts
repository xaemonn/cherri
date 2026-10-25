'use client';

/** Save a JSON document as a file (data exports, FHIR bundles). */
export function downloadJson(filename: string, data: unknown, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
