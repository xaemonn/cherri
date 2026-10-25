# Cherri: Clinical Intelligence and Women's Health Platform

Turning everyday menstrual and symptom logs into objective clinical evidence. Built for clinical accuracy, patient safety, and DPDP-grade privacy.

Project developed for the recHERsion Hackathon.

---

## Evaluation Links

- Demo Video: [INSERT DEMO VIDEO LINK HERE]
- Live Web Deployment: [INSERT DEPLOYMENT URL HERE]
- Mobile App Preview: See Section 2 for local Expo and standalone APK instructions.

---

## Table of Contents

1. Executive Summary and Problem Statement
2. Quick Start and Judge Evaluation Guide
3. Core Feature Architecture
4. Clinical Evidence Base and Medical Reference Standards
5. Product Engineering, Security, and Privacy Architecture
6. Verification and Automated Test Coverage

---

## 1. Executive Summary and Problem Statement

### The Problem
The average gynaecological consultation in India lasts between 3 and 7 minutes. During this brief window, women frequently experience recall bias—forgetting exact dates of bleeding, fluctuation of pain levels, and chronological symptom clusters. Consequently, conditions like Endometriosis face an average diagnostic delay of 7 to 10 years, while conditions like Polycystic Ovary Syndrome (PCOS) and Iron-Deficiency Anaemia are routinely identified only after severe secondary complications arise.

Furthermore, traditional cycle trackers operate on rigid 28-day assumptions, reducing menstrual health to decorative calendars while monetizing intimate user data. Between appointments, patients lack reliable non-emergency guidance, frequently taking medications incorrectly (such as consuming iron supplements with calcium or tea, which neutralizes absorption) or panicking after contraceptive accidents.

### The Solution
Cherri bridges the gap between everyday experience and clinical decision-making:
- Replaces subjective descriptions with validated clinical scoring (such as Higham PBAC for heavy bleeding).
- Connects patients with certified clinicians through a two-way asynchronous consultation portal featuring auto-generated 90-day clinical summaries.
- Safeguards patient treatments through active drug-food interaction checks and emergency contraceptive triage.
- Employs Bayesian probability distributions and statistical clustering (Fisher's exact test) rather than generative guesswork for cycle predictions.
- Adheres strictly to the Digital Personal Data Protection (DPDP) Act with zero ad-tracking, field-level AES-256-GCM encryption, and an instant 15-millisecond screen shield.

---

## 2. Quick Start and Judge Evaluation Guide

### System Prerequisites
- Node.js 22+
- pnpm 10+
- Docker Desktop
- Modern web browser (Chrome, Safari, Edge, Firefox)

### Step 1: Environment Setup
Clone the repository and install workspace dependencies:

```bash
pnpm install
```

### Step 2: Database Initialization
Start the PostgreSQL 16 container, apply Prisma migrations, and seed pre-configured clinical evaluation accounts:

```bash
# Start PostgreSQL container on port 5433
pnpm db:up

# Note: If the container already exists from an earlier session, run:
# docker start cherri-db

# Apply all database schema migrations
pnpm db:migrate

# Seed demo personas (Patient, Doctor, Pregnancy)
pnpm db:seed
```

### Step 3: Run the Development Server
Launch both the NestJS API (port 4100) and the Next.js 16 Web Application (port 3100) concurrently:

```bash
pnpm dev
```

Open `http://localhost:3100` in your browser.

---

### Pre-Configured Evaluation Personas

To test the system immediately without manual onboarding, use the seeded accounts:

| Persona | Credentials | Clinical Profile and Key Features to Test |
|---|---|---|
| Patient (Ananya, 21) | Email: `demo@cherri.app`<br>Password: `cherri-demo-2026` | Irregular cycles (average 39 days), clinical menorrhagia (PBAC score 128), low ferritin (9 ng/mL). Features: PBAC pad logger, Medicine Guardian, Consult Doctor flow. |
| Doctor (Dr. Kavya Rao) | Email: `doctor@cherri.app`<br>Password: `cherri-doctor-2026` | Verified Gynaecologist. Direct access to Doctor Portal (`/doctor`). Features: Triage queue, split-screen clinical snapshot, recommendation of follow-up tests (CBC, Pelvic Ultrasound), and thread resolution. |
| Pregnancy (Meera, 27) | Email: `pregnancy@cherri.app`<br>Password: `cherri-demo-2026` | 30 weeks pregnant with rising blood pressure. Features: Gestational week-by-week monitoring, BP telemetry charts, maternal danger sign checks. |

*Tip for Judges:* Open two browser windows side by side (e.g., standard window for Ananya and an Incognito window for Dr. Kavya Rao) to observe the two-way consultation in real time.

---

### 4-Minute Judge Walkthrough Script

1. **Patient View (`demo@cherri.app`):**
   - **Dashboard (`/home`):** Notice the top alert: *Heavy menstrual bleeding (PBAC 128)*. Review the Bayesian cycle wheel showing calculated prediction confidence.
   - **Blood Loss Logger (`/log`):** Open the PBAC calculator. Tap the plus icons on *Fully soaked pad* and *Large clot (₹5 coin)*. Note the live calculation: score updates to 45 points (~36 mL). Save the entry.
   - **Medicine Guardian (`/meds`):** Select *Livogen (Iron)*, *Shelcal 500 (Calcium)*, and *Thyronorm*. Observe the dynamic conflict cards explaining that calcium blocks iron absorption (requiring a 4-hour spacing window) and detailing thyroid fasting rules. Test the *Missed-Pill Helper* with 30 hours to see updated FSRH clinical guidance.
   - **Emergency Contraceptive Triage (`/ec`):** Select *Condom broke or slipped* from *Yesterday*. View the real-time conception risk band and live countdown timers for Levonorgestrel (72h), Ulipristal (120h), and Copper IUD.
   - **Consult a Doctor (`/consult`):** Select *Lab report review*. Test the emergency gate by typing *"I am soaking 2 pads an hour and feel dizzy"*—observe the immediate Critical Symptoms trap with 112/108 emergency buttons. Replace it with routine text or a voice note, review the attached 90-day clinical snapshot, agree to the consent terms, and send.
   - **Screen Shield (`Esc` twice or `Alt + Q`):** Press `Esc` twice anywhere. The screen instantly switches to a neutral weather cover in 15 milliseconds, the tab title becomes *Local Weather*, and the session locks behind a 4-digit PIN. Unlock using `2580` or your account password.
   - **Language Switcher:** In the top navigation, toggle between **English** and **हिंदी**. Observe the immediate transition to authentic, pure Devanagari typography (`Noto Sans Devanagari`).

2. **Doctor View (`doctor@cherri.app`):**
   - Navigate to `/doctor`. Review the triage queue sorted by clinical tags (*Heavy bleeding · PBAC 128*, *Low ferritin / anaemia*).
   - Open Ananya's consultation. Observe the split-screen workspace: patient longitudinal evidence on the left, messaging on the right.
   - Click *Recommend tests*, check *Complete Blood Count (CBC)* and *Pelvic Ultrasound*, and reply.
   - Click *Mark as resolved* to safely archive the consultation.

---

## 3. Core Feature Architecture

### I. Two-Way Doctor Portal and Care Triage
- Asynchronous clinical communication between patients and verified specialists.
- Direct attachment of verified longitudinal snapshots: 90-day cycle statistics, flagged symptoms, out-of-range lab markers, active medications, and PBAC bleeding totals.
- Emergency red-flag interceptor: Built-in safety gates halt routine chat and surface immediate hospital/ambulance routing (112, 108) if critical symptoms (such as hemorrhage or severe unilateral abdominal pain) are detected.

### II. Clinical Menorrhagia PBAC Calculator
- Replaces vague bleeding descriptions with the Higham (1990) Pictorial Blood Loss Assessment Chart standard.
- Quantifies sanitary pad saturation levels, tampon usage, menstrual cup volume in mL, and clot sizes.
- Cumulative cycle scores >100 points (~80 mL) trigger clinical menorrhagia flags to investigate structural uterine pathologies (fibroids, polyps, adenomyosis) or bleeding disorders.

### III. Medicine and Food Interaction Guardian
- Real-time interaction engine cross-checking active drugs and dietary habits.
- Prevents clinical failures:
  - Enforces empty-stomach morning timing for Levothyroxine (Thyronorm) with a 45–60 minute buffer before tea, coffee, or food.
  - Flags Iron and Calcium co-administration conflicts, mandating a 4-hour separation window.
  - Warns against consuming Iron with tannin/caffeine-rich beverages (tea/chai/coffee) and recommends Vitamin C co-ingestion.
  - Interactive missed-pill logic based on UK Faculty of Sexual and Reproductive Healthcare (FSRH) guidelines.

### IV. Emergency Contraception Triage Radar
- Time-critical decision support for contraceptive failures.
- Evaluates event timing against estimated ovulation windows to present dynamic conception risk bands.
- Hour-by-hour countdown timers detailing efficacy decay across Levonorgestrel (1.5mg, 72h window), Ulipristal Acetate (30mg, 120h window), and Emergency Copper IUD (120h window).
- Automatically schedules a confidential reminder at 21 days for home pregnancy test validation.

### V. Mathematical Intelligence (Pattern Radar & Bayesian Engine)
- Bayesian Cycle Predictor: Calculates probability distributions with explicit confidence metrics (e.g., *"65% confident, derived from 5 recorded cycles"*) rather than a naive 28-day calendar mean.
- Pattern Radar: Evaluates symptom clustering across menstrual, follicular, ovulatory, and luteal phases using Fisher's exact test. Generates statistical correlations without AI hallucination.
- Lab Decoder: Vision- and OCR-powered extraction of blood lab reports (CBC, Thyroid, Hormone panels), standardizing biomarkers against clinical reference ranges.

### VI. Quick-Exit Privacy and Screen Shield
- Desktop and mobile camouflage layer triggered by persistent icon, `Esc + Esc`, or `Alt + Q`.
- Swaps the entire viewport to a believable decoy (Local Weather, Encyclopedia, or Blank Notes) in approximately 15 milliseconds.
- Masks the document title, changes the favicon, rewrites browser history, and protects the health session behind a 4-digit PIN.

---

## 4. Clinical Evidence Base and Medical Reference Standards

Cherri's algorithms, screening tools, and safety thresholds are grounded in peer-reviewed clinical guidelines and international health standards:

| Domain | Medical Standard / Guideline | Clinical Specification Applied in Cherri |
|---|---|---|
| Heavy Menstrual Bleeding | Higham, Shaw & O'Brien (1990) PBAC; FIGO AUB Classification | Validated scoring system: lightly stained pad = 1 pt; moderately soaked = 5 pts; saturated pad = 20 pts; small clot = 1 pt; large clot (₹5 coin) = 5 pts; flooding = 5 pts. Cumulative score >100 points (~80 mL blood loss) defines clinical Menorrhagia. |
| Polycystic Ovary Syndrome | Rotterdam ESHRE/ASRM Consensus (2003); International PCOS Guideline (Monash, 2023) | Pre-fills diagnostic criteria across oligo/anovulation (cycles <21 or >35 days), clinical hyperandrogenism (hirsutism, persistent cystic acne), and ultrasound/biochemical markers. |
| Endometriosis | National Institute for Health and Care Excellence (NICE NG73) | Evaluates chronic pelvic pain, deep dyspareunia, catamenial dyschezia/dysuria, and painful periods impacting daily activities. |
| Premenstrual Dysphoric Disorder | Diagnostic and Statistical Manual of Mental Disorders (DSM-5) | Requires presence of at least 5 affective and physical symptoms peaking in the final week before menses and remitting post-onset. |
| Anaemia Severity | World Health Organization (WHO) Haemoglobin Standards | Haemoglobin reference thresholds: Normal ≥12.0 g/dL; Mild 11.0–11.9 g/dL; Moderate 8.0–10.9 g/dL; Severe <8.0 g/dL. Cross-referenced with serum Ferritin levels (<15 ng/mL indicating depleted iron reserves). |
| Emergency Contraception | FSRH Clinical Guidance; WHO Multicentre Randomized Trial (Lancet 1998) | Levonorgestrel 1.5mg within 72 hours (95% efficacy within 24h, declining to 85% at 24–48h and 58% at 48–72h); Ulipristal Acetate 30mg up to 120 hours; Copper-bearing IUD up to 120 hours (>99% efficacy). |
| Missed Oral Contraceptives | UK Faculty of Sexual and Reproductive Healthcare (FSRH) | Algorithmic triage based on combined vs. progestogen-only formulation, pill count missed, and cycle week (Week 1 vs. Week 2/3) with emergency barrier instructions. |
| Health Data Exchange | HL7 FHIR (Fast Healthcare Interoperability Resources) Release 4 | Standardized JSON export of patient Observations (PBAC scores, blood biomarkers, vitals) and Conditions for hospital Electronic Health Record (EHR) compatibility. |

---

## 5. Product Engineering, Security, and Privacy Architecture

### Technology Stack
- **Monorepo Management:** Turborepo with pnpm workspaces.
- **Backend API (`apps/api`):** NestJS 11, Prisma 6 ORM, PostgreSQL 16.
- **Web Portal (`apps/web`):** Next.js 16 (App Router), Tailwind CSS 4, Motion (Framer Motion).
- **Mobile Application (`apps/mobile`):** React Native 0.88, Expo SDK 58 (Expo Router), standalone APK configuration.
- **Shared Domain (`packages/shared`):** Reusable Zod validation schemas, typed API client, Bayesian cycle engine, FHIR mapper, and clinical rule calculators.

```
apps/
  ├── api/       NestJS 11 backend, Prisma ORM, PostgreSQL 16
  ├── web/       Next.js 16 web application, Tailwind 4, pure Devanagari Hindi support
  └── mobile/    React Native 0.88, Expo SDK 58, Android & iOS
packages/
  └── shared/    Zod schemas, FHIR R4 generator, clinical calculators, design tokens
```

### Security and Cryptography Standards
- **Field-Level Data Encryption:** Patient notes, chat contents, private medication regimens, and generated consultation snapshots are encrypted at rest using **AES-256-GCM**. Encryption keys are maintained strictly in environment configurations.
- **Authentication and Session Security:** Passwords hashed with **Argon2id**. Authentication utilizes short-lived (15-minute) JSON Web Tokens (JWT) paired with rotating refresh tokens. Token reuse detection revokes entire compromised session families.
- **Doctor Share Security:** Report sharing links rely on high-entropy SHA-256 token hashes. Links support expiration windows, view limits, and append-only audit access logging. Raw tokens are never stored in the database.
- **DPDP Act Compliance (India):**
  - Explicit user consent recorded with ISO timestamps during onboarding.
  - Complete data export available as structured JSON in one click.
  - Hard deletion: account removal cascades across all child records with zero residual storage.
  - PII Striping: Patient identifiers (names, emails, phone numbers) are stripped before health summaries reach any AI inference provider.
- **Offline Resilience:** If third-party AI APIs become unreachable, an offline regex parser and local clinical guideline catalogs take over seamlessly. Core tracking, screening, and doctor reporting operate without active AI services.

---

## 6. Verification and Automated Test Coverage

The platform maintains extensive automated test suites verifying clinical calculations, Zod schemas, FHIR conversions, and API route security:

```bash
# Execute unit and domain tests across all workspace packages
pnpm test

# Run TypeScript type verification across apps and packages
pnpm typecheck

# Verify AI endpoint configurations and reachable model providers
pnpm ai:check
```

### Key Automated Test Suites
- `packages/shared/test/guardian.test.ts`: Validates drug-drug conflicts, food-medicine timing rules, and FSRH missed-pill branch coverage.
- `packages/shared/test/insights.test.ts`: Verifies PBAC Higham mathematical summation, Menorrhagia thresholds, and cycle phase clustering.
- `packages/shared/test/care.test.ts`: Validates crisis keyword detection, Indian emergency helpline mapping, and language detection.
- `apps/api/test/consult.test.ts`: Tests doctor portal access controls, patient snapshot generation, and consultation thread safety gates.

---

## License

Developed for the **recHERsion** Hackathon. All clinical algorithms and guidelines are sourced from open international medical consensus standards.
