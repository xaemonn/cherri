# Cherri user guide and demo script

A step-by-step tour of every feature, in the order that makes a good demo video (about 8–10 minutes). Each step says what to click and what you should see, so you can also use it as a test checklist.

## 0. Start everything

```bash
pnpm db:up          # Postgres in Docker (localhost:5433)
pnpm db:migrate     # apply migrations (includes consults, PBAC, privacy PIN)
pnpm db:seed        # demo accounts + the demo doctor
pnpm dev            # API on http://localhost:4100, website on http://localhost:3100
```

| Who | Email | Password |
| --- | --- | --- |
| Ananya, 21 (irregular cycles, heavy periods, low iron) | `demo@cherri.app` | `cherri-demo-2026` |
| Meera, 27 (30 weeks pregnant, rising BP) | `pregnancy@cherri.app` | `cherri-demo-2026` |
| Dr. Kavya Rao (demo gynaecologist, verified) | `doctor@cherri.app` | `cherri-doctor-2026` |

Tip for recording: use two browser windows side by side, a normal one for Ananya and a private/incognito one for the doctor.

`pnpm db:seed` resets Ananya and Meera, so run it again before each take.

---

## 1. The homepage (http://localhost:3100)

1. The hero shows the new gold **CHERRI** logo and the headline. The buttons are **Log in or sign up** and **Try as a guest**.
2. Scroll to **Everything Cherri can do**: 21 features in four chapters, in order of importance:
   I. Real care from real doctors · II. Safety, privacy and emergencies · III. Understand your body · IV. For every stage of life.
   New features carry a black **NEW** tag. On a laptop, the chapter list on the left stays in view as you scroll. Clicking any card goes to log in.
3. Keep scrolling to the dark green **The Cherri app** section: three floating phone mockups (home, doctor chat, accident plan).
4. Click **Get the app on your phone** to open the download page (`/app`):
   - a QR code that opens Cherri's login on your phone,
   - Android steps (Chrome → ⋮ → *Install app*) and iPhone steps (Safari → Share → *Add to Home Screen*), switchable with tabs,
   - on Android Chrome, an **Install Cherri now** button can appear,
   - the native app preview steps (Expo Go) for developers.

   > The QR code needs your computer's Wi-Fi address, not `localhost`. Open `http://<your-ip>:3100/app` on the laptop, with the phone on the same Wi-Fi.

## 2. Log in as Ananya → Home

Log in with `demo@cherri.app`.

- A **Blood loss warning** card sits at the top: *Heavy menstrual bleeding (PBAC 128)*, with **Doctor report** and **Ask a doctor** buttons.
- Below the cycle wheel are three new tool cards: **Consult a doctor**, **Medicine guardian** and **Had an accident?**
- The small **Quick exit** pill is fixed in the top-right corner of every screen.

## 3. Heavy-bleeding meter (PBAC) on the Log page

1. Open **Log**. The **Blood loss (PBAC)** card opens by itself on period days; otherwise tap it to open it.
2. Tap **+** under *Fully soaked* pads twice and under *Large clot (₹5 coin)* once. The pad pictures fill to show light, half and fully soaked.
3. The line at the bottom updates live: *Today: 45 points, about 36 mL* (20 + 20 + 5).
4. There is also a menstrual-cup slider (mL) and a flooding counter.
5. Press **Save today**.

How it is scored (Higham 1990): pads 1/5/20, tampons 1/5/10, clots 1/5, flooding 5. Over **100 points or about 80 mL** in one period counts as heavy menstrual bleeding.

## 4. The doctor report leads with PBAC

Open **Doctor report**. The first block is **Menstrual blood loss · PBAC**: the score, mL, the heavy verdict, clots and flooding, and a bar for each period with the 100-point line marked. The FHIR export includes it as an Observation.

## 5. Medicine guardian (`/meds`)

1. Tap the **Livogen (iron)**, **Shelcal 500** and **Thyronorm 50** chips under *Try*.
2. Red and amber clash cards appear: *Calcium blocks iron absorption. Space them at least 4 hours apart…* and the thyroid-tablet spacing rules.
3. Each medicine gets a card saying when to take it (e.g. thyroid: first thing in the morning on an empty stomach, then no tea or breakfast for 45–60 minutes) and its food rules (tea, coffee, milk).
4. Press **Save** on a chip to add it to your medicines, which also puts it in the doctor report.
5. In the **Missed-pill helper**, type *I missed my pill by 30 hours*. The hours box fills itself and the advice changes to *One missed pill: you're still protected*. Try *Week 1*, more than 48 hours, and tick *I had sex without a condom…* to see **Emergency pill: recommended** and the link to the EC helper.

## 6. Emergency contraception triage (`/ec`)

1. Choose **Condom broke or slipped**, then **Yesterday**.
2. The risk banner shows **High / Moderate / Lower conception risk**, worked out from the cycle day (filled in from her log; you can type your own).
3. Three live countdown cards update every 30 seconds:
   - **Levonorgestrel** (72 h): bar banded 0–24 h ~95% · 24–48 h ~85% · 48–72 h ~58%,
   - **Ulipristal** (120 h),
   - **Copper IUD** (5 days, >99%).
4. **After the pill: what to expect** lists spotting, period timing, vomiting within 3 h, and when to test.
5. **Remind me in Cherri** saves a reminder for 21 days later. It appears on Home on that day. **Add to my calendar** downloads an `.ics` file titled only "Personal reminder".

## 7. Consult a doctor (`/consult`), as the patient

1. The topic cards are locked until you tick the **Safety check (required)** box ("I am not experiencing acute emergency symptoms…").
2. Pick **Lab report review**.
3. **Emergency trap demo:** type *I am soaking 2 pads an hour and feel dizzy*. A red **CRITICAL SYMPTOMS DETECTED** alert appears with **Call 112 / 108** buttons, and you can't continue.
4. Replace it with a normal question, e.g. *Ferritin 9 aaya hai aur periods heavy hain. Kya iron tablets lena chahiye?* You can also press **Record a voice note** to dictate in English or Hinglish (needs an AI key on the server).
5. **Review & share** shows the full **clinical snapshot** that will be attached: 90-day cycle history, flagged symptoms with severity, labs with out-of-range values highlighted, medicines, screening results and PBAC.
6. Tick **I agree to share this snapshot**. You'll see "Doctors typically reply within 4 to 12 hours." Press **Send to a doctor** to open the conversation page.

## 8. Doctor portal, as Dr. Kavya Rao

1. In the second window, log in as `doctor@cherri.app`. Doctors go straight to the **Doctor portal** (`/doctor`).
2. The **triage inbox** has three tabs, **Awaiting review / In consultation / Resolved**, each with a count. Every row shows the patient's name and age, the topic, how long she has been waiting, and clinical tags such as *PCOS · irregular cycles*, *Low ferritin / anaemia*, *Heavy bleeding · PBAC 128*.
3. Open Ananya's consult to get the split screen: **clinical snapshot on the left**, **conversation on the right**.
4. Write a reply, click **Recommend tests**, pick *Complete blood count (CBC)* and *Pelvic ultrasound*, then **Send reply**.
5. Click **Recommend in-person visit**. An amber "In-person visit recommended" message is sent.
6. Back in Ananya's window, refresh the consult: the doctor's name with a ✓, the test chips and the visit advice are all there.
7. **Emergency mid-chat:** Ananya types *now I have sharp one-sided pain and I fainted*. The red alert appears and **Send** is disabled. The server checks too: if such a message reaches it, the chat is **paused**, the doctor's inbox shows **Emergency reported**, and the chat only resumes after she taps *I am safe now / I have had emergency care*.
8. As the doctor, click **Mark as resolved**. The thread becomes read-only for both sides and moves to the *Resolved* tab.

## 9. Quick exit & screen shield

1. **Settings → Screen shield**: choose the disguise (**Weather**, the default, an **Encyclopedia article**, or **Blank notes**) and set a **4-digit PIN** (e.g. 2580).
2. On any page, tap **Quick exit** (top-right), or press **Esc twice**, or **Alt + Q**:
   - the screen switches to the disguise in about 15 ms,
   - the tab title becomes *Local Weather* / *Daily Notes* / *Monsoon of South Asia*, and the tab icon turns into a grey square,
   - the address bar shows `/w`, and pressing **Back** only shows more weather,
   - reloading the page stays locked.
3. To come back, tap the **⋮** menu in the disguise and enter the PIN. A wrong PIN shows "Incorrect"; after 5 tries a minute the server makes her wait. The right PIN opens Home.
4. With no PIN set, the account password unlocks it instead.

## 10. Mobile app (Expo)

`pnpm dev:mobile` with `EXPO_PUBLIC_API_URL=http://<your-ip>:4100/api`, then scan the QR code with Expo Go.

New on mobile: **Quick exit** pill on Home and More (weather cover + PIN, stays locked after restart), **PBAC** counters on the Log tab, and three new screens under **More**: **Consult a doctor** (safety box, emergency trap, snapshot preview, consent, thread), **Medicine guardian** (with the missed-pill helper) and **Had an accident?** (risk, countdowns, reminder). Set the PIN in **Settings → Privacy PIN**.

---

## Medical notes

- PBAC thresholds: Higham, Shaw & O'Brien 1990 (>100 points ≈ >80 mL).
- Missed-pill rules: FSRH (UK Faculty of Sexual & Reproductive Healthcare) guidance.
- EC efficacy bands: WHO randomised trial (Lancet 1998); ulipristal and Cu-IUD windows per FSRH.
- Cherri gives information, not a diagnosis. The doctor portal's demo doctor is fictional.
