import { ArrowRight, BellRing, EyeOff, Mic, Smartphone } from 'lucide-react';
import { SunRays } from '@/components/brand/decor';
import { ChatScreen, PhoneFrame, SafetyScreen, TodayScreen } from '@/components/landing/phone-mockups';
import { InView } from '@/components/motion/reveal';
import { ButtonLink } from '@/components/ui/button';

const PERKS = [
  { icon: Mic, text: 'Log by voice in Hinglish, Hindi or Kannada' },
  { icon: EyeOff, text: 'Quick exit and PIN lock on a shared phone' },
  { icon: BellRing, text: 'Discreet reminders: your calendar just says “Personal reminder”' },
  { icon: Smartphone, text: 'One account across the website and your phone' },
];

/** The mobile app, shown as three floating phones. */
export function MobileShowcase() {
  return (
    <section id="app" className="relative mx-3 scroll-mt-24 overflow-hidden rounded-[44px] bg-forest px-5 py-20 text-cream sm:mx-6 sm:px-10">
      <SunRays className="absolute -top-32 -left-32 size-120 animate-spin-slow text-ochre/10" count={24} spread={360} inner={30} outer={48} width={2} />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.25fr]">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-ochre-soft/80 uppercase">The Cherri app</p>
          <h2 className="text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.05] font-medium">
            Your health, <span className="accent-italic text-ochre-soft">in your pocket.</span>
          </h2>
          <p className="mt-5 max-w-md text-lg text-cream/80">
            Everything on this website, on your phone: log in seconds, chat with a doctor, check a medicine at the chemist’s counter, and hide it all in one tap.
          </p>
          <ul className="mt-7 space-y-3">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-[15px]">
                <span className="grid size-9 place-items-center rounded-full bg-cream/10">
                  <p.icon className="size-4 text-ochre-soft" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/app" variant="cream" size="lg">
              Get the app on your phone <ArrowRight className="size-5" />
            </ButtonLink>
          </div>
          <p className="mt-3 text-sm text-cream/60">Free · Android & iPhone · takes under a minute</p>
        </div>

        <InView className="relative flex h-[520px] items-center justify-center">
          <PhoneFrame label="Cherri home screen" className="absolute top-10 left-[2%] z-0 hidden -rotate-6 animate-float [--tilt:-6deg] sm:block">
            <TodayScreen />
          </PhoneFrame>
          <PhoneFrame label="Doctor chat" className="relative z-10 animate-float [animation-delay:-2s]">
            <ChatScreen />
          </PhoneFrame>
          <PhoneFrame label="Emergency contraception countdown" className="absolute top-14 right-[2%] z-0 hidden rotate-6 animate-float [--tilt:6deg] [animation-delay:-4s] sm:block">
            <SafetyScreen />
          </PhoneFrame>
        </InView>
      </div>
    </section>
  );
}
