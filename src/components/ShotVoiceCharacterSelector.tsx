import { useState } from 'react';
import { CheckCircle2, ImageOff, UserRound, Volume2, X } from 'lucide-react';
import type { CharacterProfile, VoiceProfile } from '../types/mv-data';
import { hasConfirmedFixedVoiceReference } from '../utils/voiceCloneProfile';

interface ShotVoiceCharacterSelectorProps {
  characters: CharacterProfile[];
  narrator?: VoiceProfile;
  selectedVoiceId?: string;
  disabled?: boolean;
  onSelect: (voiceId: string) => void;
}

export const ShotVoiceCharacterSelector = ({ characters, narrator, selectedVoiceId, disabled = false, onSelect }: ShotVoiceCharacterSelectorProps) => {
  const [open, setOpen] = useState(false);
  const selectedCharacter = characters.find((character) => character.voice_profile?.voice_id === selectedVoiceId);
  const selectedProfile = selectedCharacter?.voice_profile || (narrator?.voice_id === selectedVoiceId ? narrator : undefined);
  const selectedName = selectedCharacter?.name || (selectedProfile ? '旁白' : '尚未选择人物');
  const imageUrl = selectedCharacter?.generated_assets?.image;
  const selectedReady = hasConfirmedFixedVoiceReference(selectedProfile);

  const choose = (voiceId: string) => {
    onSelect(voiceId);
    setOpen(false);
  };

  return <>
    <div className={`rounded-xl border p-3 ${selectedProfile ? 'border-cyan-300/20 bg-cyan-500/5' : 'border-amber-300/25 bg-amber-500/5'}`}>
      <div className="flex gap-3">
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-cyan-300/30 bg-black/40 transition hover:border-cyan-300/70 disabled:opacity-50">
          {imageUrl ? <img src={imageUrl} alt={selectedName} className="h-full w-full object-cover" /> : selectedProfile ? <UserRound size={30} className="text-cyan-200/60" /> : <ImageOff size={26} className="text-gray-600" />}
          <span className="absolute inset-x-0 bottom-0 bg-black/75 py-1 text-center text-[9px] font-bold text-cyan-200">选择人物与音色</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-white">{selectedName}</p>
            {selectedReady ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-300"><CheckCircle2 size={10} />固定音色已创建</span> : <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] text-amber-300">固定音色未创建</span>}
          </div>
          <p className="mt-1 truncate font-mono text-[9px] text-cyan-300">{selectedProfile?.voice_id || '没有绑定 voice_id'}</p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-400">{selectedProfile?.instruct || '请选择人物展示中已经建立专属音色的人物，或选择项目旁白。'}</p>
          {selectedProfile?.preview_audio && <audio controls src={selectedProfile.preview_audio} className="mt-2 h-7 w-full" />}
        </div>
      </div>
    </div>

    {open && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-4xl rounded-2xl border border-cyan-300/30 bg-[#121923] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><h3 className="text-lg font-bold text-white">选择本镜头的说话人物</h3><p className="mt-1 text-xs text-gray-400">选择只绑定人物图片、voice_id 和固定音色；关闭窗口后点击“生成配音”才运行 Voice Clone + ASR。</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>
        <div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          {narrator && <button type="button" disabled={!hasConfirmedFixedVoiceReference(narrator)} onClick={() => choose(narrator.voice_id)} className={`overflow-hidden rounded-xl border text-left transition ${selectedVoiceId === narrator.voice_id ? 'border-cyan-300 bg-cyan-500/10 ring-1 ring-cyan-300/50' : 'border-white/10 bg-black/30 hover:border-cyan-300/40'} disabled:cursor-not-allowed disabled:opacity-40`}>
            <div className="flex aspect-video items-center justify-center bg-black/50"><UserRound size={34} className="text-cyan-200/60" /></div>
            <div className="p-3"><p className="font-bold text-white">旁白</p><p className={`mt-1 text-[9px] ${hasConfirmedFixedVoiceReference(narrator) ? 'text-emerald-300' : 'text-amber-300'}`}>{hasConfirmedFixedVoiceReference(narrator) ? '固定音色已创建' : '先创建旁白固定音色'}</p></div>
          </button>}
          {characters.map((character, index) => {
            const profile = character.voice_profile;
            const selected = profile?.voice_id === selectedVoiceId;
            const ready = hasConfirmedFixedVoiceReference(profile);
            return <button type="button" key={`${character.id ?? character.character_id ?? character.name}-${index}`} disabled={!ready} onClick={() => ready && profile && choose(profile.voice_id)} className={`overflow-hidden rounded-xl border text-left transition ${selected ? 'border-cyan-300 bg-cyan-500/10 ring-1 ring-cyan-300/50' : 'border-white/10 bg-black/30 hover:border-cyan-300/40'} disabled:cursor-not-allowed disabled:opacity-40`}>
              <div className="flex aspect-video items-center justify-center overflow-hidden bg-black/50">{character.generated_assets?.image ? <img src={character.generated_assets.image} alt={character.name} className="h-full w-full object-cover" /> : <UserRound size={28} className="text-gray-600" />}</div>
              <div className="p-3"><p className="truncate font-bold text-white">{character.name}</p><p className="mt-0.5 truncate text-[9px] text-gray-500">{character.role || '人物'} · {profile?.voice_id || '没有专属音色'}</p><p className={`mt-1 flex items-center gap-1 text-[9px] ${ready ? 'text-emerald-300' : 'text-amber-300'}`}><Volume2 size={10} />{ready ? 'Voice Design 固定音色已创建' : '先在人物展示创建固定音色'}</p></div>
            </button>;
          })}
        </div>
      </div>
    </div>}
  </>;
};
