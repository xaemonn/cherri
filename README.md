# 🍒 Cherri

**Women's health, decoded.** Cherri turns everyday symptom logs into clinical evidence a woman can take to her doctor. It is built for India, with Hinglish AI, an anaemia and PCOS focus, government care resources and DPDP-minded privacy.

> Hackathon project by Team Goodies · web app + mobile app + API, all TypeScript.

## What's inside

| | |
|---|---|
| 🔁 **Cycle engine** | Bayesian period prediction that gets more confident every cycle ("45% confident, learned from 5 of your cycles") |
| 📡 **Pattern Radar** | Finds symptoms that cluster in a cycle phase using a Fisher's exact test. Pure statistics, no AI guesswork |
| 🚩 **Red flags** | Rule-based alerts (ACOG/NICE/FIGO thresholds) for missed, heavy, painful or irregular periods and abnormal labs |
| 🩺 **Health checks** | PCOS (Rotterdam), endometriosis (NICE NG73), PMDD (DSM-5), anaemia, thyroid, pre-filled from her logs and labs |
| 🧪 **Lab decoder** | Photo or PDF of a blood report → every value flagged and explained. The file is never stored |
| 💬 **Ask Cherri** | AI chat that knows her cycle and labs, logs symptoms from chat, cites a curated health library and detects crises |
| 🎙️ **Talk-to-Log** | "Cramps 7/10, bahut thakaan", typed or spoken, becomes a structured log |
| 📄 **Doctor report** | Clinical one-pager shared through an expiring QR link, with view limits and an access log |
| 🧠 **Myth buster** | Swipe game of Indian period myths plus AI fact-checking with an Evidence Meter |
| 🎁 **Cycle Wrapped** | Spotify-Wrapped-style recap: power phase, top symptoms, streaks |
| 📍 **Find care** | Nearby clinics (OpenStreetMap), eSanjeevani, PM-JAY and helplines (112, 108, 181, 14416) |

**AI is grounded and safe.** Crisis messages get helplines before any AI runs. Phone numbers and emails are removed before text reaches a provider. Logged values are cross-checked against what she actually said. **If every AI provider is down, the app still works**: an offline parser and the health library take over.

## Repository layout

```
apps/
  api/      NestJS 11 · Prisma 6 · PostgreSQL 16   → http://localhost:4100/api
  web/      Next.js 16 · Tailwind 4 · Motion        → http://localhost:3100
  mobile/   Expo SDK 58 · Expo Router · RN 0.88      → Expo Go on your phone
packages/
  shared/   used by all three: zod schemas, typed API client, design tokens,
            cycle engine, Pattern Radar, red flags, screenings, lab catalog, offline NLP
demo/       sample lab report (PNG/PDF) for the Lab Decoder demo
```

## Quick start

Prerequisites: Node 22+, pnpm 10, Docker Desktop, and the Expo Go app on your phone.

**One-time setup**
```bash
pnpm install
pnpm db:up                                   # Postgres on localhost:5433
cp apps/api/.env.example apps/api/.env       # fill JWT_ACCESS_SECRET, ENCRYPTION_KEY, GROQ_API_KEY, GEMINI_API_KEY
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate
pnpm db:seed                                 # demo account: demo@cherri.app / cherri-demo-2026
pnpm ai:check                                # confirms your AI keys and models work
```

**Every time**
```bash
pnpm dev            # API (4100) + web (3100)
pnpm dev:mobile     # in a second terminal: scan the QR code with Expo Go
```

### Running on your phone
1. Your phone and laptop must be on the **same Wi-Fi**.
2. Run `pnpm dev`, then `pnpm dev:mobile`, and scan the QR code with Expo Go (Android) or the Camera app (iPhone).
3. The app finds the API on your laptop automatically. If Windows asks whether to let Node.js through the firewall, allow **private networks**.
4. On hotspot or college Wi-Fi with client isolation, create `apps/mobile/.env` with `EXPO_PUBLIC_API_URL=http://<your-laptop-ip>:4100/api`, or point it at a deployed API.

## The 3-minute demo
1. **Web:** open http://localhost:3100 and click **Start free, no email needed**. On the first onboarding step, choose **Explore with demo data**.
2. **Home:** cycle wheel, phase, prediction confidence, red flags, Pattern Radar.
3. **Ask Cherri:** *"Aaj bahut cramps hain aur thakaan bhi, kya karun?"* Watch it reply in Hinglish and log the symptoms.
4. **Lab decoder:** **Try a sample report**. Every value is decoded in about 5 seconds.
5. **Health checks → PCOS:** "Cherri noticed your cycles average 39 days".
6. **Doctor report → Create QR link:** scan it with a phone. When running locally, the QR points at your laptop's Wi-Fi address (the API logs it at startup: "Share links and QR codes use http://…"), so the phone must be on the **same Wi-Fi**, and Windows must allow Node.js through the firewall. Judges on mobile data need a deployed version.
7. **Cycle Wrapped:** end on the fun recap.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm dev:api` / `pnpm dev:web` / `pnpm dev:mobile` | Run the apps with hot reload |
| `pnpm test` | 105 tests: shared unit tests plus API end-to-end tests against a real Postgres (`cherri_test`) |
| `pnpm typecheck` / `pnpm build` | Type-check every package / production builds |
| `pnpm db:migrate` / `pnpm db:seed` | Migrations / reset the demo account |
| `pnpm ai:check` | Shows which AI models your keys can reach |

## AI providers (free tiers)

| Provider | Used for | Default models (verified Oct 2026) |
|---|---|---|
| Groq | Chat, Talk-to-Log, voice notes (Whisper) | `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `whisper-large-v3` |
| Google Gemini | Lab report photos, chat fallback | `gemini-3.5-flash`, `gemini-3.5-flash-lite` (2.5 models are closed to new users) |
| OpenRouter / Ollama | Optional extra fallbacks | `openrouter/free`, `llama3.2` |

Providers are tried in order. A rate-limited provider is benched for a while and the next one takes over. Every model can be overridden in `apps/api/.env`.

## API reference

Base URL `http://localhost:4100/api`. Send `Authorization: Bearer <accessToken>` except on routes marked 🌐. Errors look like `{ "error": { "status", "code", "message", "details?" } }`. Request and response types live in `@cherri/shared`, and the typed client is `createApiClient()`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` 🌐 · `/auth/login` 🌐 · `/auth/guest` 🌐 · `/auth/upgrade` · `/auth/refresh` 🌐 · `/auth/logout` 🌐 |
| Profile | `GET/PATCH /me` · `POST /me/onboarding` · `GET /me/export` · `DELETE /me` |
| Tracking | `GET /symptoms` 🌐 · `GET /logs` · `GET/PUT/DELETE /logs/:date` · `GET/POST /periods` · `PATCH/DELETE /periods/:id` |
| Insights | `GET /dashboard` · `/cycle` · `/insights` · `/wrapped?days=90` |
| Health checks | `GET /screenings` · `/screenings/history` · `GET/POST /screenings/:type` |
| Labs | `POST /labs/upload` (multipart `file`) · `POST /labs/manual` · `GET /labs` · `/labs/trends` · `DELETE /labs/:id` |
| Ask Cherri | `POST /ai/chat` (SSE, or `?stream=false`) · `GET /ai/sessions` · `GET/DELETE /ai/sessions/:id` · `POST /ai/parse-log` · `/ai/transcribe` · `/ai/myth-check` |
| Doctor report | `GET /reports/preview` · `POST /reports` · `GET /reports` · `GET /reports/:id/accesses` · `DELETE /reports/:id` · `GET /share/:token` 🌐 |
| Care & content 🌐 | `GET /care/resources` · `GET /care/nearby` (auth) · `GET /content/articles[/:id]` · `/content/myths` · `/content/phases` · `/content/help` |
| Other | `POST /demo/load` (fills an empty account with demo data) · `GET /health` 🌐 |

## Security and privacy
- Passwords hashed with argon2id. 15-minute JWTs. Refresh tokens rotate, and replaying an old one revokes the whole session family.
- **AES-256-GCM encryption** for notes, chat messages and titles, and doctor-report snapshots.
- AI providers get summaries, never raw logs. Personal details (phone, email, Aadhaar-like numbers) are stripped first.
- Share links store only a SHA-256 hash, expire, can be revoked, support view limits and log every view.
- Rate limits, helmet, a CORS allowlist, zod validation everywhere, upload type detection from the file's bytes, and request logs without bodies.
- DPDP Act: explicit consent at onboarding, full data export, and permanent deletion.

## Troubleshooting
- **Port already in use:** on some machines Docker or WSL hold ports 3000 and 4000, which is why Cherri uses **3100** (web), **4100** (API) and **5433** (Postgres).
- **`EADDRINUSE` on 3100 or 4100:** an earlier `pnpm dev` is still running, sometimes as a leftover Node process after its terminal closed. Stop it in PowerShell:
  `Get-NetTCPConnection -LocalPort 3100,4100 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`
- **Web styles didn't update after a change:** delete `apps/web/.next` and rebuild (Turbopack's cache can be stale).
- **Phone says it can't connect:** see "Running on your phone" above. Settings in the app shows the API URL it is using.
- **Scanned QR won't open on the phone:** the phone must be on the same Wi-Fi as the laptop. In Windows, set that Wi-Fi to a **Private** network and allow Node.js through the firewall. College or office Wi-Fi often blocks device-to-device traffic, so use your phone's hotspot for the laptop instead.
- **Prisma `EPERM` on Windows during build:** stop the running API first. It locks the Prisma engine file.
