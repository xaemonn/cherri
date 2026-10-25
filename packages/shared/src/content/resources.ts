export interface CareResource {
  name: string;
  url: string;
  description: string;
}

/** Free, government-backed care options in India, shown alongside nearby clinics. */
export const INDIA_CARE_RESOURCES: readonly CareResource[] = [
  {
    name: 'eSanjeevani',
    url: 'https://esanjeevani.mohfw.gov.in',
    description: 'Free online doctor consultations from the Government of India. Works on any phone.',
  },
  {
    name: 'Ayushman Bharat PM-JAY',
    url: 'https://pmjay.gov.in',
    description: 'Free treatment at empanelled hospitals for eligible families. Check eligibility and find hospitals.',
  },
  {
    name: 'Anemia Mukt Bharat',
    url: 'https://anemiamuktbharat.info',
    description: 'Free iron-folic acid supplements and anaemia testing at government health facilities.',
  },
];
