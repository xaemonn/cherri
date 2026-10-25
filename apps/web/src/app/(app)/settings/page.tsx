'use client';

import { addDays, CAMOUFLAGES, COMPANION_TONES, LANGUAGES, LIFE_STAGES, todayIn, type CompanionTone, type Language, type LifeStage } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Download, EyeOff, KeyRound, LogOut, Trash2, UserRound } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { FieldError, Input, Label, PasswordInput, Select } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { saveTextSize, TEXT_SIZES, useTextSize } from '@/lib/preferences';
import { CAMOUFLAGE_OPTIONS, saveCamouflage, useCamouflage } from '@/lib/shield';

const STAGE_LABELS: Record<LifeStage, string> = {
  CYCLE: 'Tracking my cycle',
  TTC: 'Trying to conceive',
  PREGNANCY: 'Pregnant',
  POSTPARTUM: 'Postpartum',
  PERIMENOPAUSE: 'Perimenopause',
  MENOPAUSE: 'Menopause',
};
const TONE_LABELS: Record<CompanionTone, string> = { BESTIE: 'Bestie', BIG_SIS: 'Big sis', CLINICAL: 'Straight facts' };
const LANGUAGE_LABELS: Record<Language, string> = { en: 'English', hi: 'हिंदी (शुद्ध देवनागरी)', hinglish: 'Hinglish', kn: 'ಕನ್ನಡ' };

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const { setLang } = useLanguage();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    lifeStage: user?.lifeStage ?? 'CYCLE',
    language: user?.language ?? 'en',
    companionTone: user?.companionTone ?? 'BESTIE',
    avgCycleLength: user?.avgCycleLength ?? 28,
    avgPeriodLength: user?.avgPeriodLength ?? 5,
    dueDate: user?.dueDate ?? '',
    deliveryDate: user?.deliveryDate ?? '',
  });
  const [account, setAccount] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const textSize = useTextSize();
  const camouflage = useCamouflage();
  const [pin, setPin] = useState('');
  const [tab, setTab] = useState<'profile' | 'privacy' | 'account'>('profile');

  if (!user) return null;
  const today = todayIn(user.timezone);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const { dueDate, deliveryDate, ...rest } = profile;
      setUser(
        await api.me.update({
          ...rest,
          name: profile.name.trim() || undefined,
          ...(profile.lifeStage === 'PREGNANCY' && { dueDate: dueDate || null }),
          ...(profile.lifeStage === 'POSTPARTUM' && { deliveryDate: deliveryDate || null }),
        }),
      );
      await queryClient.invalidateQueries();
      toast('Profile saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function upgrade(event: React.FormEvent) {
    event.preventDefault();
    try {
      setUser((await api.auth.upgrade(account)).user);
      toast('Account secured with your email');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not upgrade.');
    }
  }

  async function savePin(event: React.FormEvent) {
    event.preventDefault();
    try {
      setUser(await api.me.setPin({ pin }));
      setPin('');
      toast('Privacy PIN saved');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the PIN.');
    }
  }

  async function exportData() {
    const data = await api.me.exportData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cherri-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Settings" title="You, your way" />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'profile', label: 'Profile', icon: UserRound },
          { id: 'privacy', label: 'Privacy & shield', icon: EyeOff },
          { id: 'account', label: 'Account', icon: KeyRound },
        ]}
      />
      {tab === 'profile' && (
      <>
      <Card>
        <h2 className="text-xl font-semibold">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <Label>Name</Label>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label>
            <Label>Life stage</Label>
            <Select value={profile.lifeStage} onChange={(e) => setProfile({ ...profile, lifeStage: e.target.value as LifeStage })}>
              {LIFE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <Label>Cherri’s vibe</Label>
            <Select value={profile.companionTone} onChange={(e) => setProfile({ ...profile, companionTone: e.target.value as CompanionTone })}>
              {COMPANION_TONES.map((t) => (
                <option key={t} value={t}>
                  {TONE_LABELS[t]}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <Label>Language</Label>
            <Select value={profile.language} onChange={(e) => {
                const nextLang = e.target.value as Language;
                setProfile({ ...profile, language: nextLang });
                if (nextLang === 'hi' || nextLang === 'en') setLang(nextLang);
              }}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <Label hint="days">Usual cycle length</Label>
            <Input type="number" min={15} max={90} value={profile.avgCycleLength} onChange={(e) => setProfile({ ...profile, avgCycleLength: Number(e.target.value) })} />
          </label>
          <label>
            <Label hint="days">Usual period length</Label>
            <Input type="number" min={1} max={15} value={profile.avgPeriodLength} onChange={(e) => setProfile({ ...profile, avgPeriodLength: Number(e.target.value) })} />
          </label>
          {profile.lifeStage === 'PREGNANCY' && (
            <label>
              <Label hint="from your scan or doctor">Due date</Label>
              <Input type="date" min={addDays(today, -21)} value={profile.dueDate} onChange={(e) => setProfile({ ...profile, dueDate: e.target.value })} />
            </label>
          )}
          {profile.lifeStage === 'POSTPARTUM' && (
            <label>
              <Label>Baby’s birth date</Label>
              <Input type="date" max={today} value={profile.deliveryDate} onChange={(e) => setProfile({ ...profile, deliveryDate: e.target.value })} />
            </label>
          )}
        </div>
        <FieldError>{error}</FieldError>
        <Button className="mt-5" onClick={() => void saveProfile()} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Text size</h2>
        <p className="mt-1 text-sm text-ink-soft">Makes everything in Cherri bigger on this device.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TEXT_SIZES.map((size) => (
            <Chip
              key={size.value}
              selected={textSize === size.value}
              onClick={() => saveTextSize(size.value)}
            >
              {size.label}
            </Chip>
          ))}
        </div>
      </Card>
      </>
      )}

      {tab === 'privacy' && (
      <Card id="shield">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <EyeOff className="size-5 text-cherry" /> Screen shield
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          What appears when you tap <strong>Quick exit</strong>, press <kbd className="rounded border border-line bg-cream px-1.5 text-xs">Esc</kbd> twice or{' '}
          <kbd className="rounded border border-line bg-cream px-1.5 text-xs">Alt</kbd>+<kbd className="rounded border border-line bg-cream px-1.5 text-xs">Q</kbd>. To come back, open the
          ⋮ menu on the disguise and enter your PIN.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {CAMOUFLAGES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => saveCamouflage(c)}
              aria-pressed={camouflage === c}
              className={`rounded-2xl border p-3 text-left transition-colors ${camouflage === c ? 'border-olive-deep bg-olive-soft' : 'border-line bg-paper hover:bg-cream'}`}
            >
              <p className="font-semibold">{CAMOUFLAGE_OPTIONS[c].label}{c === 'WEATHER' && ' (default)'}</p>
              <p className="text-xs text-ink-soft">Tab shows “{CAMOUFLAGE_OPTIONS[c].title.split(' – ')[0]}”. {CAMOUFLAGE_OPTIONS[c].hint}</p>
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-cream p-4">
          <p className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4" /> Privacy PIN {user.hasPin ? <span className="text-sm font-medium text-olive-deep">· set</span> : <span className="text-sm font-medium text-ink-soft">· not set</span>}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {user.hasPin
              ? 'Cherri unlocks only with this 4-digit PIN after a quick exit.'
              : user.isGuest
                ? 'Without a PIN, anyone can reopen Cherri after a quick exit. Set one now.'
                : 'Until you set one, your account password unlocks Cherri.'}
          </p>
          <form onSubmit={savePin} className="mt-3 flex flex-wrap gap-2">
            <Input
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4 digits"
              aria-label="New 4-digit PIN"
              className="max-w-36 tracking-[0.4em]"
            />
            <Button type="submit" disabled={pin.length !== 4}>
              {user.hasPin ? 'Change PIN' : 'Set PIN'}
            </Button>
            {user.hasPin && (
              <Button
                variant="ghost"
                onClick={async () => {
                  setUser(await api.me.removePin());
                  toast('PIN removed');
                }}
              >
                Remove PIN
              </Button>
            )}
          </form>
        </div>
      </Card>
      )}

      {tab === 'account' && (
      <>
      {user.isGuest && (
        <Card tone="ochre">
          <h2 className="text-xl font-semibold">Keep your data safe</h2>
          <p className="mt-1 text-sm text-ink-soft">You’re using Cherri as a guest. Add an email so you can log in on any device. Everything you’ve logged stays.</p>
          <form onSubmit={upgrade} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input type="email" required placeholder="Email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
            <PasswordInput required minLength={8} placeholder="Password (8+ chars)" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
            <Button type="submit">Save account</Button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-semibold">Privacy & data</h2>
        <p className="mt-1 text-sm text-ink-soft">Your notes and chats are encrypted. You can take everything with you, or erase it for good.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void exportData()}>
            <Download className="size-4" /> Export my data
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              router.replace('/');
            }}
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
        <div className="mt-6 rounded-3xl bg-cherry-soft p-4">
          <p className="font-bold text-cherry-deep">Delete my account permanently</p>
          <p className="text-sm text-cherry-deep/80">This erases every log, report and chat. Type DELETE to confirm.</p>
          <div className="mt-3 flex gap-2">
            <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder="DELETE" className="max-w-40 border-cherry/40" />
            <Button
              variant="primary"
              className="bg-cherry hover:bg-cherry-deep"
              disabled={confirmDelete !== 'DELETE'}
              onClick={async () => {
                await api.me.remove();
                await logout();
                router.replace('/');
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
      </Card>
      </>
      )}
    </div>
  );
}
