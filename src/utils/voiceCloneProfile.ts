import type { VoiceProfile } from '../types/mv-data';

export const shouldUseQwen3VoiceClone = (profile: VoiceProfile, requireVoiceClone = false) => (
  requireVoiceClone
  || profile.generation_mode === 'voice-clone'
  || (!profile.generation_mode && Boolean(profile.reference_audio))
);

export const hasConfirmedFixedVoiceReference = (profile?: VoiceProfile) => Boolean(
  profile
  && profile.reference_audio?.data_url
  && profile.status === 'ready'
  && profile.preview_audio
);
