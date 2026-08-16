# Directing Playbook

## 1. Classify the production

- `music_video`: lyrics, a song, a master music track, performance, beat-reactive montage, or lyric typography owns the timeline.
- `short_drama`: characters pursue wants under pressure; causality, dialogue, reactions, and spatial continuity own the timeline.
- `promo`: a product, brand, service, idea, event, argument, or learning outcome must be understood or desired. Use `form_subtype: editorial_explainer` for factual and knowledge-led articles.

When signals conflict, choose the form that owns the edit clock: music beats outrank plot, plot causality outranks claims, and verified claims outrank decorative narrative.

## 2. Select and lock style from meaning

Choose one primary visual grammar and at most one supporting grammar. Lock palette, material language, lighting direction, camera behavior, transition family, texture, typography policy, and audio policy across the project.

Before writing any character, create one project-wide visual style lock. Reuse its exact style prefix, negative prompt, background, lighting, rendering medium, proportion language, and character-sheet layout for every character. A character's role never authorizes a different art style. If character sheets look as though they belong to different productions, the style lock has failed and all affected prompts must be rewritten before storyboarding.

- Emotional lyrics: performance, symbolic environments, beat cuts, spatial typography only when words are part of the concept.
- Character narrative: readable blocking, reaction coverage, eyeline logic, motivated camera movement, recurring spatial anchors.
- Product/brand: authentic product evidence, negative space, material detail, controlled type, cause-to-benefit structure.
- Knowledge article: editorial explainer, concrete visual metaphors, one knowledge beat per shot, stable labels only when necessary.
- Tactile paper: layered depth, visible fibers and shadows, physically plausible stop-motion.
- Stylized 3D: strong silhouettes, character cards, expressive poses, environment-only scene anchors.
- Hand-drawn/live action: one continuous entity, real contact, traceable morphing, delayed handheld pursuit.

## 3. Preserve the source

Create a numbered coverage list before writing shots.

- Lyrics: every line remains verbatim and in order; do not translate or invent replacements.
- Fiction: preserve every causal event, relationship change, required reveal, and necessary dialogue. Compression may combine description but may not alter causality.
- Blog/explainer: preserve every claim, qualification, supporting example, and conclusion. Convert abstractions into visuals without changing the proposition.
- Promo copy: separate verified facts from concept language. Never invent claims, metrics, brand marks, or product behavior.

Map every coverage item to at least one `mvinfo.source_text`. Repeated source text is allowed for overlap; omitted source units are not.

## 4. Build characters and reference sheets

Include recurring people, creatures, mascots, or personified subjects that require identity continuity. Exclude anonymous crowds and one-frame silhouettes unless story-critical.

Write identity facts in this order: age impression and role; body and silhouette; face and skin/fur/material; hair; wardrobe with colors/materials; signature prop; posture and energy; lighting-safe identity anchors; do-not-change constraints. Keep identity facts stable across all image and video prompts.

For every recurring character, `characters[].description` is not a biography. It is the selected image workflow's complete Chinese prompt for one landscape production reference sheet. The sheet must contain a three-quarter full-body hero view, front/side/back full-body views, at least four facial-expression close-ups, and eye/hair-costume/prop detail studies. All views must depict the same person with identical identity, costume, colors, and proportions. Follow `character-reference-sheets.md` and preserve both Z-Image-Turbo and Krea2 Turbo variants in `reference_sheet`.

## 5. Segment and time

Use two levels:

- `storyboard` segment: a dramatic beat, verse/chorus block, location sequence, claim cluster, or campaign phase.
- `mvinfo` shot: one H3 generation unit with a single primary action and exact duration.

For untimed sources, allocate time by information and performance load, not raw paragraph size. Use 5 seconds for a clear visual beat or detail, 10 seconds for a normal action/dialogue exchange, and 15 seconds for a continuous performance, complex blocking, or deliberate reveal. Split rather than overload.

All shot timestamps are contiguous and monotonic. Sum shot durations to `director_plan.total_duration_seconds`. If the source ending falls between supported lengths, add an intentional visual/audio tail to reach the next 5-second boundary.

## 6. Direct continuity

For every shot, decide:

- incoming state: prior pose, direction, prop hand, light, weather, screen position, and audio phase;
- new information: the one reason this shot exists;
- outgoing state: the exact state handed to the next shot;
- cut logic: tail-frame continuation, action match, eyeline match, graphic match, beat hard cut, occlusion, or deliberate reset.

Use `New_Scene` only for a true visual reset. Use `Last_Frame_Continuity` when the previous output tail should seed the next I2VA/FL2VA first frame.

## 7. Audio ownership

- `music_video`: keep the supplied master track; do not invoke MiniMax Music 3.
- `qwen3-tts-audio-first`: for promo and fiction, Qwen3 TTS generates clear per-shot narration/dialogue from a locked narrator or character `voice_id`; MiniMax Music 3 generates instrumental score chapters only.
- `drive-audio`: the application mixes the exact Qwen3 voice at full level with Music 3 score at a lower level. This mixed shot audio dictates lip movement, action timing, and performance. The application discards H3's returned audio and remuxes the exact source mix into the final video.
- `native-audio`: legacy fallback only; do not emit it for new v4 non-MV projects.
- `reference-audio`: audio guides timbre, rhythm, or style without direct lock.
- `no-audio`: explicitly export a silent video. Do not use it merely because the user did not upload audio.

For MVs with master audio, align shots to the source timeline and prefer cuts at pauses, breaths, beats, or impacts. Never cut a required lyric mid-word unless the same vocal continues explicitly across the cut.

Qwen3 Voice Design consistency depends on keeping `voice_id`, `instruct`, reference text, language, seed, and saved Prompt stable. Music 3 must never receive narration/dialogue text and must be explicitly prompted for instrumental-only output.
