# H3 Routing and Prompt Contract

## Installed skill routing

Use `h3-prompt-writing` as the mandatory technical grammar. Draw only the relevant pre-production rules from the matching installed workflow:

| Route | Use for | Preserve |
| --- | --- | --- |
| `3d-animation-short-generator` | stylized narrative animation | character/scene locks, spatial anchors, per-second action, continuity handoffs |
| `music-video-subtitle-generator` | lyrics, performance, beat-reactive text | master-audio ownership, exact lyrics, short shots, tail/head or beat-cut stitching |
| `brand-promo-video-generator` | brands, apps, services | source truth, verified claims, asset provenance, readable CTA |
| `minimalist-product-ad-generator` | physical product launch | product fidelity, independent visual anchors, one action per beat, restrained typography |
| `papercraft-stop-motion-explainer` | tactile educational paper | layered diorama depth, paper physics, mechanism clarity |
| `paper-collage-explainer-generator` | editorial metaphor and B-roll | halftone collage identity, piecewise assembly, tactile SFX policy |
| `handdrawn-live-video-generator` | live-action/rough glowing drawing fusion | real contact, one traceable morphing entity, delayed handheld camera |
| `co-op-game-intro-generator` | two-player game opening/menu | fixed identity mapping, readable UI hierarchy, approved copy timing |

This director Skill produces plans and JSON. Do not inherit Hub/canvas generation gates or claim that media was generated.

## Mode selection

### I2VA

Require one usable first-frame source. For `Last_Frame_Continuity`, prefer the previous shot's actual `last_frame`; otherwise use the current shot's generated `image`.

Prompt shape:

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] ...

overall_soundscape: ...

non_diegetic_music: ...
```

### FL2VA

Require a first-frame source plus `last_frame_image_prompt`; the runtime later stores the target image as `generated_assets.target_last_frame`.

Prompt shape for duration `S.SS`:

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the S.SS-second mark of the target video.

integrated_multimodal_description: [Shot 1] ...

overall_soundscape: ...

non_diegetic_music: ...
```

Describe the observable path from Picture 1 to Picture 2. Narrow pose, object, camera, lighting, and composition differences progressively; land exactly on Picture 2.

### Ref2VA

Declare one or two reference slots in `generation_plan.reference_images`, according to the references genuinely needed by the shot. A single-reference shot declares only `<Picture 1>`; never duplicate or invent `<Picture 2>` merely to fill a slot. Each declared slot needs `label`, `purpose`, and `prompt`; use `source_character` when a project character image should resolve automatically.

Write these six sections in order:

```text
subject_definitions:
...

summary:
[reference generation] ...

retention_analysis:
...

detailed_description:
...

overall_soundscape:
...

non_diegetic_music:
...
```

Keep `<Subject N>`, `<Picture N>`, and speaker `(Sx)` labels stable. Use fixed retention markers: `fully_preserved`, `partially_preserved`, `attribute_transfer`, or `weak_reference`.

## Shared writing rules

- Write structural prose, sound design, and music descriptions in Chinese; preserve dialogue, lyrics, and visible text in the original language. Keep fixed H3 protocol labels and field names in English.
- First shot has no cut timestamp. Later internal cuts use `[Shot N] At MM:SS.mmm, ...` with strictly increasing times inside the clip.
- Express camera movement naturally in Chinese, including movement type, meaningful amplitude, and speed.
- Put dialogue/lyrics only in `<d>[Language] ...</d>`.
- Use `overall_soundscape` for ambience, actions, and non-verbal human sounds.
- Use `non_diegetic_music` for audience-only score; write `N/A` when absent.
- Never append an extra free-floating style paragraph after the final field.

## Duration mapping

| Seconds | Frames |
| ---: | ---: |
| 5 | 141 |
| 10 | 260 |
| 15 | 379 |
