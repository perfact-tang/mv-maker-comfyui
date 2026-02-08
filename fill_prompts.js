
const fs = require('fs');

const structurePath = 'structure_draft.json';
// We will overwrite the draft file as the user requested "Regenerate" and is looking at this file.
const outputPath = 'structure_draft.json'; 

let structure;
try {
    structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
} catch (e) {
    console.error("Error reading structure_draft.json:", e);
    process.exit(1);
}

// Helper to set prompts
function setPrompts(segmentIndex, promptList) {
    if (structure.storyboard[segmentIndex] && structure.storyboard[segmentIndex].mvinfo) {
        structure.storyboard[segmentIndex].mvinfo.forEach((item, idx) => {
            if (promptList[idx]) {
                if (item.type === 'New_Scene') {
                    item.image_prompt = promptList[idx].image;
                }
                item.video_prompt = promptList[idx].video;
            }
        });
    }
}

// --- PROMPTS DATA ---

// Segment 1 Prompts (Intro - Verse 1)
const seg1Prompts = [
    {
        image: "Cinematic shot, medium close-up, elegant woman sitting by a rain-streaked window at night, city lights bokeh in background, neo-soul vibe, warm rhodes piano atmosphere, moody lighting, cyan and magenta neon accents, 8k resolution, Wong Kar-wai style.",
        video: "Slow zoom in, the woman hums softly with subtle head movement, rain falling heavily on the glass, neon lights flickering in the background, soft focus shifts, high quality."
    },
    { video: "Camera slowly tracks around her, she looks out at the rainy city, her reflection visible in the wet glass, moody atmosphere, slow smooth motion." },
    { video: "She closes her eyes, enjoying the music, snaps her fingers softly to the beat, warm light highlights her face against the cold blue city background." },
    { video: "She turns slightly, showing her profile, deep in thought, city lights blur into beautiful bokeh in the background, cinematic lighting." },
    { video: "She looks down at her hands, expression of nostalgia, faint reflection of red neon light on her skin, symbolizing the fire she once had." },
    { video: "Camera focuses on her eyes, intense gaze, slight zoom in, red light intensifies in the background, dramatic lighting contrast." },
    { video: "She shivers slightly as if cold, wraps her arms around herself, blue and cyan tones dominate the lighting, conveying a winter feeling." },
    { video: "She turns away from the window, becoming a silhouette against the bright city lights, the room behind her is dark and silent." },
    { video: "Wide shot of the room from behind her, showing the empty space, she stands alone in the silence, cinematic composition." },
    { video: "She straightens her posture, a look of confidence returns to her face, lighting shifts from cold blue to warm gold, revealing her strength." },
    { video: "She walks slowly across the room, leaving the window and the noisy world behind, focus follows her movement, velvet textures visible in room." },
    { video: "She touches the velvet fabric of a furniture piece, calm and peaceful expression, smooth camera movement following her hand." },
    { video: "She approaches a large armchair, transitioning to the next scene, atmosphere becomes regal and settled." }
];

// Segment 2 Prompts (Chorus)
const seg2Prompts = [
    {
        image: "Wide shot, modern luxury apartment interior, dark velvet armchair as a throne, purple and gold ambient lighting, protagonist standing near the chair, sophisticated atmosphere, cinematic realism.",
        video: "She sits down gracefully on the velvet armchair, slow motion, the fabric moves elegantly, lighting emphasizes the purple and gold tones."
    },
    { video: "She settles into the chair, leans back comfortably, embodying the 'King of the Night', relaxed and regal posture." },
    { video: "Medium shot, she looks directly at the camera with a confident smile, regal posture, soft rim lighting creating a halo effect." },
    { video: "Camera pans slowly, showing the dark, rich textures of the room, she remains the focal point in the velvet darkness." },
    { video: "Close up on her face, dramatic lighting, she looks empowered, singing along with the lyrics, 'my own King', confident expression." },
    { video: "She rests her head on her hand, relaxed, dominating the space, deep purple shadows surround her, moody and atmospheric." },
    { video: "Camera moves towards a large ornate mirror in the room, preparing for the transition to the reflection scene." }
];

// Segment 3 Prompts (Verse 2 - Male Rap / Mirror)
const seg3Prompts = [
    {
        image: "Over-the-shoulder shot, looking into a large ornate mirror, reflection shows a stylish man in a suit instead of the woman, sultry vibe, low light, smoke swirling, cinematic duality.",
        video: "The man in the reflection gestures as if rapping, cool and relaxed vibe, smoke swirls around him, the woman watches her reflection."
    },
    { video: "Reflection man adjusts his tie or holds a drink, relaxed demeanor, the real woman mimics the vibe, rhythmic movement to the beat." },
    { video: "Smoke swirls around the reflection creating a 'fog', the man waves it away, cool and indifferent expression." },
    { video: "Camera focuses on the boundary between the real woman and the reflection, blurring the line between them, building the image brick by brick." },
    { video: "The reflection starts to fade or merge, woman touches the mirror glass, a moment of self-reconciliation and connection." },
    { video: "Back to the woman's face in the mirror (or real), peaceful expression, soft lighting returns, 'beauty in the quiet'." },
    { video: "She turns away from the mirror, walking back towards the center of the room, leaving the reflection behind." },
    { video: "She sways slowly to the beat, dancing alone in the room, happy and content in her solitude." },
    { video: "Silhouette of her dancing against the window, strong presence, 'never alone' vibe, city lights in background." },
    { video: "She stops dancing, walks to the window and looks out one last time, 'my night, my way'." }
];

// Segment 4 Prompts (Outro)
const seg4Prompts = [
    {
        image: "Exterior shot, view of the apartment window from outside, rain falling, the apartment is a warm glowing box in a cold blue city, cinematic night scene.",
        video: "Camera starts close to the window seeing her inside, then begins to slowly pull back, rain falling heavily."
    },
    { video: "Continued pull back, revealing more of the building facade, rain intensifies, the warm light of the window contrasts with the cold city." },
    { video: "The building stands tall like a modern fortress, other lights in the city flicker or go out, emphasizing the isolation and height." },
    { video: "Wide shot of the cityscape, the 'Castlevania' building is the main subject, majestic and tall against the night sky." },
    { video: "The lights in the apartment slowly turn off, the building fades into the night, screen fades to black." }
];

// Apply prompts
setPrompts(0, seg1Prompts);
setPrompts(1, seg2Prompts);
setPrompts(2, seg3Prompts);
setPrompts(3, seg4Prompts);

fs.writeFileSync(outputPath, JSON.stringify(structure, null, 2));
console.log('Prompts populated successfully in ' + outputPath);
