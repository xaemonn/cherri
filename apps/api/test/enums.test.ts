import { describe, expect, it } from 'vitest';
import { $Enums } from '@prisma/client';
import { COMPANION_TONES, CONSULT_CATEGORIES, CONSULT_STATUSES, DOCTOR_SPECIALTIES, ROLES, FLOW_LEVELS, LAB_FLAGS, LANGUAGES, LIFE_STAGES, LOG_SOURCES, RISK_BANDS, SCREENING_TYPES } from '@cherri/shared';

/** Database enums and the shared constants must never drift apart. */
describe('enum consistency', () => {
  it.each([
    ['LifeStage', $Enums.LifeStage, LIFE_STAGES],
    ['Language', $Enums.Language, LANGUAGES],
    ['CompanionTone', $Enums.CompanionTone, COMPANION_TONES],
    ['Flow', $Enums.Flow, FLOW_LEVELS],
    ['LogSource', $Enums.LogSource, LOG_SOURCES],
    ['LabFlag', $Enums.LabFlag, LAB_FLAGS],
    ['ScreeningType', $Enums.ScreeningType, SCREENING_TYPES],
    ['RiskBand', $Enums.RiskBand, RISK_BANDS],
    ['Role', $Enums.Role, ROLES],
    ['DoctorSpecialty', $Enums.DoctorSpecialty, DOCTOR_SPECIALTIES],
    ['ConsultCategory', $Enums.ConsultCategory, CONSULT_CATEGORIES],
    ['ConsultStatus', $Enums.ConsultStatus, CONSULT_STATUSES],
  ] as const)('%s matches @cherri/shared', (_name, prismaEnum, shared) => {
    expect(Object.values(prismaEnum).sort()).toEqual([...shared].sort());
  });
});
