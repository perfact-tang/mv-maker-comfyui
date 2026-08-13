import type { CharacterProfile, H3ShotReferenceImage } from '../types/mv-data';

const normalizeIdentity = (value: unknown): string => (
  String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase()
);

const characterIds = (character: CharacterProfile): string[] => (
  [character.id, character.character_id]
    .map(normalizeIdentity)
    .filter(Boolean)
);

export const resolveReferenceCharacter = (
  characters: CharacterProfile[],
  reference: Pick<H3ShotReferenceImage, 'source_character' | 'source_character_id'>,
): CharacterProfile | undefined => {
  const requestedId = normalizeIdentity(reference.source_character_id);
  if (requestedId) {
    const byId = characters.find((character) => characterIds(character).includes(requestedId));
    if (byId) return byId;
  }

  const requestedIdentity = normalizeIdentity(reference.source_character);
  if (!requestedIdentity) return undefined;

  return characters.find((character) => (
    normalizeIdentity(character.name) === requestedIdentity
    || characterIds(character).includes(requestedIdentity)
  ));
};

export const resolveReferenceImage = (
  characters: CharacterProfile[],
  reference: H3ShotReferenceImage,
): { dataUrl: string; filename: string; source: 'manual' | 'character'; character?: CharacterProfile } | undefined => {
  if (reference.asset?.dataUrl) {
    return { ...reference.asset, source: 'manual' };
  }

  const character = resolveReferenceCharacter(characters, reference);
  const dataUrl = character?.generated_assets?.image;
  if (!character || !dataUrl) return undefined;

  return {
    dataUrl,
    filename: `${character.name}.png`,
    source: 'character',
    character,
  };
};
