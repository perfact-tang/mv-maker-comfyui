# Routing Examples

## Timed lyrics

Input: timestamped verse and chorus with a master track.

- Form: `music_video`.
- Preserve every lyric verbatim in timeline order.
- Use I2VA for performance and tail-frame continuation, FL2VA for a chorus reveal that must land on a hero composition, and Ref2VA when two performer identity cards must remain stable.
- Audio: `drive-audio` for supplied per-shot chunks.

## Fiction dialogue

Input: two characters argue, one hides a letter, and the other discovers it.

- Form: `short_drama`.
- Character descriptions lock identity, wardrobe, the letter, and opposing physical energy.
- Use I2VA for dialogue/reactions, FL2VA for the handoff from hidden letter to discovered close-up, and tail-frame continuity for the reaction shot.
- Preserve the reveal order and all relationship-changing dialogue.

## Product or knowledge blog

Input: a product article or factual blog with no on-screen person.

- Form: `promo`; factual article subtype: `editorial_explainer`.
- `characters` may be empty.
- Turn each claim into one visual proof or metaphor. Use FL2VA for assembly/cause-and-effect and Ref2VA for product plus material/style references.
- Do not invent claims, numbers, logos, demonstrations, or outcomes.
