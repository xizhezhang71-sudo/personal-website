# Scroll choreography — revised depth and surface treatment

Local site: D:/其他文件/website. HTML, CSS and JS retain their existing separate files.

## Camera and words

Scroll coordinates are viewport heights relative to .signal-run. Opening desktop camera uses a 35-degree FOV, distance 6.0 and target height 1.10. Its position is 1.85 units below that target (about 17 degrees upward), giving a visible low-angle composition. The camera advances from 0.15 to 0.95 and reaches the head/shoulders close-up by TECHNOLOGY (distance 3.55, target height 1.65, camera 0.55 below target). Narrow screens use distances 6.8 and 4.8.

Word cues: INTO PLAY 0.35–0.95; TECHNOLOGY 0.95–1.65; CREATIVITY 1.65–2.40; PRODUCT 2.40–3.10. TECHNOLOGY now adds 0.85 radians of model rotation and a 0.20-unit leftward move. Rotation continues through CREATIVITY and PRODUCT. The robot then moves left between 2.55 and 4.65.

The new manifesto is semantic HTML, with art, technology, research and design in strong elements. Its independent stylesheet is assets/css/manifesto.css; its scroll cues and update function are in assets/js/manifesto.js. It enters from right to left over 2.95–3.67, holds for reading, then rises 65vh and fades over 4.05–4.87. Selected Work begins rising at 4.35, overlapping the final text exit to avoid a blank interval, and completes at 5.65. It has zero horizontal translation, a 78vh initial vertical offset, 60% initial scale and 1.3-screen fade/grow duration. The reel remains inert until fully docked. Reverse scroll retraces the sequence. Reduced motion and the no-WebGL fallback show the manifesto in normal document flow.

When All Work reaches 72% of viewport height, the robot returns from offscreen left in close-up. The first 28% of the remaining journey brings it into the left composition. Over the remaining 72%, it moves right, pulls back and restores the opening pose, angle and surface phase. At the page bottom the camera and placement match the opening. The footer retains 92svh height and the archive retains its existing 3×3 grid.

The hand sequence, camera, words and surface masks follow scroll position; scrolling backward retraces the sequence. Following the user's latest request, a separate gentle idle sway runs while the robot is visible: spine roll about 1.5 degrees, spine pitch about 1 degree, a smaller upper-spine roll and head counter-motion. Original bone quaternions are restored before every pose evaluation, preventing drift. Feet stay planted. The idle render loop stops during Selected Work and when the tab is hidden, and resumes for the archive return. Reduced motion disables idle sway.

## Surface, lighting and cursor — November 2026 reference revision

Reference: https://www.getlayers.ai/templates?layer=clarix and the user's eight supplied close-up photos. The saved public video was previously sampled every second; the contact sheet was reviewed again for this change. This is a local visual reconstruction, not the template's source shader.

Observed features: cobalt/ultramarine glossy shells, cyan contour lighting, white specular accents, local rose/magenta dot regions, a regular tiny square lattice rather than triangle edges, and larger pastel blue/pink square dots on a neutral pale background.

The renderer now uses one depth-writing opaque skinned surface. A screen-aligned 3.1 CSS-pixel lattice mixes continuously into the lit shell through a feathered spatial mask. Light lattice gaps are composited against the scene's paper color, retaining the outer silhouette; this is a halftone shading treatment, not an exposed triangular wireframe or a translucent shell. The old duplicated wire mesh and randomly sampled CPU point cloud were removed. Surface normals, scroll phase and rig angle determine blue/magenta regions, with a cyan Fresnel contour and retained physical highlights. No material playback timer runs.

Lighting: cool ambient hemisphere, white upper key, cyan rear-side rim and a restrained pink side fill. The page paper is #edf3f3 with near-black text and cobalt accents. The shader's paper color is the linear-color equivalent so the lattice gaps blend with the background.

The background and cursor ripples share one regularly spaced square-dot field. Pointer activation changes from 550ms/65px to 120ms/14px, with at most five overlapping waves, 1700ms lifetime and 260px travel. Wave displacement and blue/pink/cyan tint modify the existing field. Rendering stops after the last wave ends. Reduced motion retains the static field and disables waves; returning from a hidden tab restarts only a single static render.

## Selected reel

Reference: https://pro.reactbits.dev/docs/components/vertical-reel?browse=components
The public page currently labels this component Momentum Ring. This is a local reconstruction of its public Preview and Customize layout, not imported premium source.

Five projects now populate the reel (the first five entries of work-data.js). The supplied Customize screenshot sets aspect 1.45, curvature .64, camera distance 2.9, tilt 0 degrees, gap 23px, corner radius 13px, dim .58, motion blur .85 and speed .05. The local ring maps the normalized curvature to an angle that exposes two cards on each side of the front card. Card sizing is fitted to the available width, instead of limiting cards to .42 of rail height; desktop cards collectively span the rail. Narrow screens retain a readable large center card and clipped neighbors, with all five items available. Edge fading is removed. Autoplay remains off.

The work-reveal entrance now runs from 4.35 to 5.65 viewport heights, rising vertically after the manifesto. The data-reel-ready flag becomes true only after the entrance is complete and the sticky panel has reached its stop. Wheel, drag, keyboard, buttons and links share this gate; before docking the wheel continues scrolling the document. WebGL failure enables the static fallback reel.

The existing nine-project archive and footer remain after Selected Work.


## Verification for camera return revision

Browser checked: early TECHNOLOGY close-up, robot still visible at the left edge during the last part of the work entrance, five-card reel dock, wheel switching without document scroll after docking, All Work left close-up, and final right-side opening composition. No browser warnings or errors were observed during the pass.


## Manifesto revision validation

Verified desktop opening low-angle framing, model movement during TECHNOLOGY, manifesto readability and four bold words, vertical reel entrance with zero horizontal translation, and interaction gating.


## Current override: TECHNOLOGY / manifesto synchronization

TECHNOLOGY and manifesto entrance both start at 0.95 viewport heights. The manifesto and the robot lateral move share the same smoothstep over 0.72 viewport heights, completing at 1.67. The robot then holds its left-side translation while scroll-driven rotation continues. At 4.65 the text rises/fades and the robot resumes exiting left; both finish at 5.50. These shared cues live in STORY in assets/js/manifesto.js. Selected Work retains its vertical entrance at 4.95. This timing supersedes earlier manifesto timing notes.


## Frame-fit revision

Removed RESPONSIBILITY. PRODUCT occupies 2.40–3.70. The robot completes only 28% of its leftward exit during the manifesto entrance (previously 48%), leaving it further right during the hold. The remaining 72% happens with the text exit. Orbit radius is reduced and each complete word is clamped to the camera frustum at its current depth, with a safety margin.


## PRODUCT handoff (current timing)

PRODUCT ends at STORY.leaveStart = 3.70 viewport heights. The same cue immediately begins the manifesto upward fade and robot leftward exit, completing at 4.55. Selected Work enters from 4.00 to 5.30. PRODUCT duration derives from the shared cue, preventing a gap if this timing changes. This supersedes earlier exit timings.


## Three-cue sequence and two-gesture hold

PRODUCT removed; CREATIVITY spans 1.65–2.75 and now owns the final orbit. Camera pushes from 0.10–0.55. Robot travels from right to center through 1.65, then left through 2.40. Manifesto enters 2.05–2.40. Complete manifesto holds for two distinct forward wheel bursts (180ms idle defines the end of a burst); after the second finishes, smooth document scrolling runs its upward exit and robot left exit, followed by the reel. Reverse input clears the gesture counter. Scrollbar, keyboard and reduced-motion navigation remain available.


## Complete word orbits

All three cues share separate phases: first 22% fades in, 22–82% completes exactly one clockwise 2π orbit, final 18% fades out after returning to the front. INTO PLAY moves from screen center toward the robot during its fade-in only. Depth testing remains enabled for rear-side occlusion. Progress remains scroll-driven and reversible.


## Direct scroll / About two-panel revision

The timed 2.2-second advance and wheel-burst timers are removed. In the exit interval, 360 normalized wheel pixels (three standard 120px notches) map directly from holdAt 3.30 to exitEnd 4.90. Browser checks recorded 3.838, 4.371, 4.900, with the second value unchanged while input stopped. Trackpad deltas remain proportional; device notch sizes vary. CREATIVITY has no upward offset; it circles behind the model and travels left with its orbit center.

About uses assets/css/about.css and .about-story: a right-hand thinking medium shot with portrait placeholder and biography, then a left-hand close-up with hip/support and open-palm introduction alongside three practice notes. Camera distance changes from 6 to 4.05. Scrolling reverses the pose and layout. Existing gleam.svg is used only as a clearly labeled abstract portrait placeholder.
