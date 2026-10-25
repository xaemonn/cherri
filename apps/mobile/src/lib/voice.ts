import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useState } from 'react';
import { api } from './api';
import { formWithFile } from './files';

/** Record a voice note with expo-audio and transcribe it with Whisper on the server. */
export function useVoiceNote() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');

  async function start() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error('Microphone permission is needed for voice notes.');
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setState('recording');
  }

  async function stop(): Promise<string> {
    await recorder.stop();
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    const uri = recorder.uri;
    if (!uri) {
      setState('idle');
      throw new Error('Recording failed. Please try again.');
    }
    setState('transcribing');
    try {
      const form = await formWithFile('audio', uri, 'voice-note.m4a');
      return (await api.ai.transcribe(form)).text.trim();
    } finally {
      setState('idle');
    }
  }

  return { state, start, stop };
}
