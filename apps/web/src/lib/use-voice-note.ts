'use client';

import type { Language } from '@cherri/shared';
import { useRef, useState } from 'react';
import { api } from './api';

const EXTENSIONS: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3' };

export type VoiceLanguage = 'en' | 'hi' | 'kn';

/** Whisper detects English and Hinglish well on its own; Hindi and Kannada are more accurate when named. */
export function voiceLanguageFor(language: Language | undefined): VoiceLanguage | undefined {
  return language === 'kn' || language === 'hi' ? language : undefined;
}

/** Record a voice note in the browser and transcribe it with Whisper on the server. */
export function useVoiceNote() {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const supported = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (event) => chunks.current.push(event.data);
    rec.start();
    recorder.current = rec;
    setState('recording');
  }

  function stop(language?: VoiceLanguage): Promise<string> {
    return new Promise((resolve, reject) => {
      const rec = recorder.current;
      if (!rec) return reject(new Error('Not recording'));
      rec.onstop = async () => {
        rec.stream.getTracks().forEach((track) => track.stop());
        setState('transcribing');
        try {
          const type = rec.mimeType.split(';')[0] || 'audio/webm';
          const form = new FormData();
          form.append('audio', new Blob(chunks.current, { type }), `voice-note.${EXTENSIONS[type] ?? 'webm'}`);
          resolve((await api.ai.transcribe(form, language)).text.trim());
        } catch (error) {
          reject(error);
        } finally {
          setState('idle');
          recorder.current = null;
        }
      };
      rec.stop();
    });
  }

  return { state, supported, start, stop };
}
