import type { DoctorReport } from '../api/types';
import { FAMILY_CONDITION_LABELS, type FamilyCondition } from '../constants';
import { MIND_CHECKS } from '../screenings/mind';

/**
 * HL7 FHIR R4 export of the doctor report: the format India's ABDM and most hospital
 * systems exchange records in. Patient-reported data is marked as such throughout.
 */
export interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection';
  timestamp: string;
  entry: Array<{ fullUrl: string; resource: FhirResource }>;
}

const LOINC = 'http://loinc.org';
const UCUM = 'http://unitsofmeasure.org';
const INTERPRETATION = 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation';
const OBSERVATION_CATEGORY = 'http://terminology.hl7.org/CodeSystem/observation-category';

const loinc = (code: string, display: string, text = display) => ({ coding: [{ system: LOINC, code, display }], text });
const category = (code: 'laboratory' | 'vital-signs' | 'survey' | 'exam') => [{ coding: [{ system: OBSERVATION_CATEGORY, code }] }];
const INTERPRETATION_CODES = { LOW: 'L', HIGH: 'H', NORMAL: 'N' } as const;

/** Bundle-local ids in UUID form (urn:uuid fullUrls must be UUIDs); no randomness, so exports are reproducible. */
function localUuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;
}

export function toFhirBundle(report: DoctorReport): FhirBundle {
  const entry: FhirBundle['entry'] = [];
  const add = (resource: Omit<FhirResource, 'id'>): string => {
    const id = localUuid(entry.length + 1);
    entry.push({ fullUrl: `urn:uuid:${id}`, resource: { ...resource, id } as FhirResource });
    return `urn:uuid:${id}`;
  };

  const birthYear = report.patient.age != null ? Number(report.rangeEnd.slice(0, 4)) - report.patient.age : null;
  const patient = add({
    resourceType: 'Patient',
    ...(report.patient.firstName && { name: [{ given: [report.patient.firstName], text: report.patient.firstName }] }),
    gender: 'female',
    ...(birthYear && { birthDate: String(birthYear) }),
  });
  const subject = { reference: patient };
  const reported = { meta: { tag: [{ system: 'https://cherri.app/fhir', code: 'patient-reported', display: 'Patient-reported via Cherri' }] } };

  for (const lab of report.labs) {
    const flag = lab.flag === 'UNKNOWN' ? null : INTERPRETATION_CODES[lab.flag];
    add({
      resourceType: 'Observation',
      status: 'final',
      category: category('laboratory'),
      code: lab.loinc ? loinc(lab.loinc, lab.name) : { text: lab.name },
      subject,
      effectiveDateTime: lab.takenAt,
      valueQuantity: { value: lab.value, ...(lab.unit && { unit: lab.unit }) },
      ...(flag && { interpretation: [{ coding: [{ system: INTERPRETATION, code: flag }] }] }),
    });
  }

  for (const bp of report.vitals?.bloodPressure ?? []) {
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('vital-signs'),
      code: loinc('85354-9', 'Blood pressure panel with all children optional', 'Blood pressure'),
      subject,
      effectiveDateTime: bp.date,
      component: [
        { code: loinc('8480-6', 'Systolic blood pressure'), valueQuantity: { value: bp.systolic, unit: 'mmHg', system: UCUM, code: 'mm[Hg]' } },
        { code: loinc('8462-4', 'Diastolic blood pressure'), valueQuantity: { value: bp.diastolic, unit: 'mmHg', system: UCUM, code: 'mm[Hg]' } },
      ],
    });
  }
  for (const w of report.vitals?.weight ?? []) {
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('vital-signs'),
      code: loinc('29463-7', 'Body weight'),
      subject,
      effectiveDateTime: w.date,
      valueQuantity: { value: w.weightKg, unit: 'kg', system: UCUM, code: 'kg' },
    });
  }

  if (report.cycle?.lastPeriodStart) {
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('exam'),
      code: loinc('8665-2', 'Last menstrual period start date'),
      subject,
      valueDateTime: report.cycle.lastPeriodStart,
      ...(report.cycle.averageCycleLength && {
        note: [{ text: `Mean cycle ${report.cycle.averageCycleLength} days (range ${report.cycle.shortestCycle}–${report.cycle.longestCycle}), ${report.cycle.regularity.toLowerCase()}.` }],
      }),
    });
  }
  if (report.pain.maximum != null) {
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('survey'),
      code: loinc('72514-3', 'Pain severity - 0-10 verbal numeric rating [Score] - Reported', 'Maximum pain score'),
      subject,
      effectivePeriod: { start: report.rangeStart, end: report.rangeEnd },
      valueInteger: report.pain.maximum,
      note: [{ text: `Highest pain logged; mean during periods ${report.pain.averageDuringPeriod ?? 'n/a'}/10; ${report.pain.daysAt6OrMore} days at 6/10 or more.` }],
    });
  }

  for (const check of report.mindChecks ?? []) {
    const definition = MIND_CHECKS[check.type];
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('survey'),
      code: loinc(definition.loinc, `${check.type === 'PHQ9' ? 'PHQ-9' : 'GAD-7'} total score`, definition.title),
      subject,
      effectiveDateTime: check.date,
      valueInteger: check.score,
      interpretation: [{ text: check.label }],
    });
  }

  if (report.pregnancy?.stage === 'PREGNANCY') {
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('exam'),
      code: loinc('11778-8', 'Delivery date Estimated'),
      subject,
      valueDateTime: report.pregnancy.dueDate,
    });
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('exam'),
      code: loinc('49051-6', 'Gestational age in weeks'),
      subject,
      effectiveDateTime: report.rangeEnd,
      valueQuantity: { value: Math.round((report.pregnancy.weeks + report.pregnancy.days / 7) * 10) / 10, unit: 'wk', system: UCUM, code: 'wk' },
    });
  }

  for (const s of report.symptoms) {
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('survey'),
      code: { text: s.clinicalTerm ?? s.label },
      subject,
      effectivePeriod: { start: report.rangeStart, end: report.rangeEnd },
      valueString: `${s.label}: ${s.days} days (${Math.round(s.shareOfLoggedDays * 100)}% of logged days)${s.peakPhase ? `, peaks in ${s.peakPhase}` : ''}`,
    });
  }

  if (report.story) {
    add({
      resourceType: 'Observation',
      ...reported,
      status: 'final',
      category: category('survey'),
      code: loinc('10164-2', 'History of Present illness Narrative', 'History of present illness (in her own words)'),
      subject,
      effectiveDateTime: report.story.updatedAt,
      valueString: report.story.inHerWords,
    });
  }

  for (const condition of report.patient.knownConditions) {
    add({
      resourceType: 'Condition',
      ...reported,
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
      verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'unconfirmed' }] },
      code: { text: condition },
      subject,
    });
  }

  for (const med of report.medications ?? []) {
    const dosage = [med.dose, med.schedule].filter(Boolean).join(', ');
    add({
      resourceType: 'MedicationStatement',
      ...reported,
      status: 'active',
      medicationCodeableConcept: { text: med.name },
      subject,
      ...(med.since && { effectivePeriod: { start: med.since } }),
      ...(dosage && { dosage: [{ text: dosage }] }),
      ...(med.reason && { reasonCode: [{ text: med.reason }] }),
    });
  }

  if (report.background?.allergies) {
    add({
      resourceType: 'AllergyIntolerance',
      ...reported,
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] },
      verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'unconfirmed' }] },
      code: { text: report.background.allergies },
      patient: subject,
    });
  }

  for (const code of report.background?.familyHistory ?? []) {
    add({
      resourceType: 'FamilyMemberHistory',
      ...reported,
      status: 'completed',
      patient: subject,
      relationship: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode', code: 'FAMMEMB', display: 'family member' }] },
      condition: [{ code: { text: FAMILY_CONDITION_LABELS[code as FamilyCondition] ?? code } }],
    });
  }

  return {
    resourceType: 'Bundle',
    id: localUuid(0),
    type: 'collection',
    timestamp: report.generatedAt,
    entry,
  };
}
