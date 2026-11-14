# Look and feel: how asteroid-likes and space shooters draw, move and read

Read 2026-11-14 from wikis, reviews, art write-ups, interviews, devlogs, forum
threads, accessibility guidance and design essays, through a fetch tool that
summarises, so wording is paraphrased. No game source code was read and no asset
was copied. "(inferred)" marks my own reading, "(listing)" marks a fact taken
only from a search result summary of a page I could not or did not open, and
"(weak)" marks a page that read as machine-written or held a plain error. The
talks themselves were not watched.

## 1. How notable asteroid-likes and arena shooters look

- **Asteroids (1979), lines of light on black.** An XY vector monitor, chosen
  over raster for its sharper image and finer aiming; at most 26 rocks.
  Asteroids Deluxe tinted everything blue and made the rocks rotate. Owners call
  the real tube very bright, and emulated shots hard to see without added glow
  (listing). [Wikipedia Asteroids] [Forum listings]
- **Blasteroids (1987), kinds by behaviour.** Raster, with rocks that are
  normal, red (drop crystals), popcorn (swell when hit, never break), egg (hatch
  leeches) and seeker (home once shot). Its art is said to be digitised
  photographs (listing). [Wikipedia Blasteroids] [Review listings]
- **Super Stardust HD and Ultra, material picks the weapon.** Rock, gold and ice
  match Rock Crusher, Gold Melter and Ice Splitter, and the right one stops a
  rock splitting (listing). Rocks and blasts are the praised part, yet one
  critic says its blasts block play and have always tired the eyes.
  [Wikipedia Stardust] [Review listings] [Game Informer Ultra]
- **Geometry Wars, a programmer's look.** Shapes plotted on graph paper by a
  designer who is no artist, with simple particles as the flourish. A starfield
  proved impractical behind fast action, so a grid became the second layer;
  objects that matter get a faint shadow, the rest stays flat, and each enemy
  has its own spawn sound. [GD GeoWars]
- **Geometry Wars 2 and 3, more light, less reading.** One critic of the sequel
  lost orange arrows over snakes and purple fans behind blasts; another finds
  the blasts needlessly busy and his ship lost in them. Of the third, a critic
  says the old plain look kept play readable and the 3D one is impractical,
  though its sparks were toned down. [Kikizo] [AV Club] [Kritiqal]
  [WorthPlaying]
- **Asteroids: Recharged, faux vector plus neon.** Vector-style shapes with
  glow, heavy particles and nebula colour in place of black; rocks have soft
  curved outlines and sometimes the dent of a crashed saucer. One critic scores
  the look 7.5 and enjoys the mess when power-ups fill the screen with lasers.
  [WTMG Asteroids] [Tech-Gaming Asteroids]
- **Nova Drift, the same late-game problem.** Bright geometric ships with
  pulsing particles, easy to parse says one critic. Another says that late in a
  run explosions, neon and projectiles fill the screen until you lose your own
  ship, which the developer planned to address. [Rogueliker] [GameIndustry Nova]
- **Resogun, tuned for reading and still faulted.** Physics tuned for reading
  over realism, grid levels against curved enemies, few particles. Critics still
  found the boost bars too muted, a recharge sound drowned out, and rescued
  humans lost among the blasts. [GamingBolt Resogun] [Gamereactor Resogun]
- **Luftrausers, silhouettes in sepia.** A few shades of tan and nearly
  everything a silhouette, which one critic says makes shoot-or-dodge plain.
  Another finds it confusing at first; shake strength is a setting (listing).
  [PopMatters] [Push Square Luftrausers] [Review listings]
- **Lovers in a Dangerous Spacetime, flat and without black.** Pink ship,
  ocean-blue space, neon-green aliens. Early textured art felt busy, so the team
  went to simple shapes and flat colour, and avoided black because it deadened
  the world. [Kill Screen Lovers]
- **Minishoot' Adventures and Graceful Explosion Machine, restraint.** The first
  is called limited, high in contrast and free of distracting effects, each area
  telling you where you are. The second's crisp flat shapes separate ship from
  enemies, but big blasts hide survivors and levels that differ only in palette
  feel like one long stage. [Entertainium] [KeenGamer] [Switchaboo GEM]
- **Galak-Z, PixelJunk Shooter, Solar 2 (thin).** Galak-Z's director cites
  late-1970s spaceship anime for its stylised blasts. PixelJunk Shooter is
  called cartoony and crisp, its fluids the highlight; Solar 2 minimalist and
  calm (listing). [GamingBolt Galak-Z] [Review listings]
- **Ion Assault and Space Giraffe, the failures.** In the first, pale blue rock
  fragments vanish into pale blue particles and a pink world hides the pink
  ship. The second's psychedelic field drew 2/10 from a critic who could not
  find enemies in it, against 8/10 elsewhere; its PC version was calmed.
  [GameIndustry Ion] [Wikipedia Space Giraffe]
- **Cute, flat and light fields are rare.** Flewfie's Adventure sets flat
  paper-like sprites on very colourful grounds. Limbo puts light values behind
  and very dark ones in play, and Luftrausers' dark planes on tan do the same
  (inferred); Beast Breaker's artist found a white hero stood out on every
  ground. Players call white shots on white a poor choice, and say a space game
  built for dark backdrops loses its lane markings on light ones (listing).
  [Game Ramble] [GD visual confusion] [GD Beast Breaker] [Forum listings]

## 2. Rocks and materials

- **One light, and for a spinning sprite it sits overhead.** A vector-art guide
  warns against shading every edge: one light means shade on one side, and a
  light directly above survives flipping. Forum threads describe the
  alternative: the lit side turns with the sprite, and a per-sprite fix defeats
  batching in a Phaser thread (listing). [Kenney] [Art listings]
- **Moving light is for moving lights.** Dead Cells paints normal maps by hand
  so torches and spells add volume; Lovers bakes every glow into textures, which
  works because its camera never turns. [GD Dead Cells] [Asteroid Base]
- **Contrast says material.** Artists put metal at high contrast with bright
  highlights and lit edges, rock at low contrast with little highlight
  (listing). The guide adds marks: bolts, seams and thin diagonal glints for
  metal; cracks, chipped edges and moss for stone. [Art listings] [Kenney]
- **Ice and crystal.** Painters describe ice as see-through and lit from within,
  with crisp pale highlights on its edges; crystal as hard facets with edge
  highlights and a dark-to-light run across each face (listing). [Art listings]
- **Shape and behaviour carry the kind.** Design blogs agree: round reads
  friendly, square stable, triangular dangerous (listing). Blasteroids and Super
  Stardust add that a kind is learned from what it does. [Art listings]
  [Wikipedia Blasteroids]
- **Flat art needs outlines that add contrast.** Sable's director says flat
  shading removed the usual cues, so light, cast shadow and outlines carry form.
  A pixel-art guide's rule: an outline is darker than both object and ground;
  shades that work on a light ground vanish on a dark one, and only black works
  everywhere. [GD Sable] [Lospec]
- **Damage shows on the thing.** Players would rather watch cracks build up than
  read a bar (listing). Studios that use models as status displays tie each
  visible state to a threshold. [Forum listings] [GD characters as UI]

## 3. Backdrops that add depth without costing readability

- **Subdued by rule.** Lovers kept the backdrop quiet because the foreground is
  busy: a tiling nebula with little fine detail, stars in clumps that twinkle
  slowly, one faint glow layer in front, and an extra layer per area such as a
  green storm. [Asteroid Base]
- **Parallax wants a moving camera, and has costs.** Lovers warns that too much
  of it stops players judging speed; hobby devlogs use about three star layers,
  far ones smaller, dimmer and slower (listing); web guidance names parallax as
  a motion-sickness trigger. [Asteroid Base] [Art listings] [Val Head]
- **Separate by treatment.** Ronimo outlines and cel-shades what plays and
  paints what does not; it desaturates and blurs the background, lightens it
  just behind the play layer, and drains the colour from corpses. [Ronimo post]
- **Narrow range behind, wide range in front.** DOTA 2's ground stays within a
  narrow band of greys so units carry the contrast; the test is a desaturated
  screenshot. [GD visual confusion]
- **An identity per area.** Dead Cells gives interiors complementary palettes
  and exteriors analogous ones, painting textures in grey for a gradient map to
  colour. Beast Breaker reserves colours: yellow for safety, magenta only for
  enemy cores. Sable tunes fog per biome. [GD Dead Cells] [GD Beast Breaker]
  [GD Sable]
- **Named complaints.** A bright sun or nebula hid shots and range markers in
  two space games, and players asked for a dimmer (listing). Valve is said to
  darken only the top edge of the screen; players of another game want its
  vignette off, citing headaches (listing). [Forum listings]

## 4. Glow, bloom and additive effects

- **Glow began as the display.** Owners describe the vector tube as very bright,
  and Asteroids' shots as hard to see once that glow is gone (listing). The glow
  marked what to watch; bloom copies the look without that ranking unless it is
  rationed (inferred). [Forum listings]
- **Why bloom fails.** A 2008 essay holds up Ico as bloom chosen on purpose and
  lists games that put it on everything: it covers the screen, drowns fine
  detail and flattens the contrast between bright and dark. [Gangles]
- **One complaint, six games.** In Geometry Wars 2 and 3, Nova Drift, Stardust
  Ultra, Graceful Explosion Machine and Ion Assault a critic loses the ship or a
  threat inside effects, mostly ones the player's own shots and kills made
  (inferred). Fixes that shipped: fewer sparks, a calmer field. [Kikizo]
  [GameIndustry Nova] [WorthPlaying]
- **Additive light needs dark behind it.** Additive modes sum brightness: black
  is neutral and a plain Add blows out to white quickly, so over a white ground
  the sum clips and nothing shows (listing). [Demo Room] [Forum listings]
- **Glow without a filter.** Lovers uses no post-processing: glows are painted
  into textures and one faint glow plane lies over the scene. Forum advice
  agrees: a glowing variant of the sprite, or a blurred halo in the same texture
  (listing). [Asteroid Base] [Forum listings]
- **Brightness as rank.** Dead Cells gives enemies, projectiles and spells the
  top saturation, contrast and brightness; Astro Bot keeps blue lights for
  friends and red for foes. [GD Dead Cells] [PS Blog Astro]

## 5. Explosions, debris and particles

- **Three phases, with frame counts.** A VFX artist's rule for a cartoon blast:
  a first burst of 1 frame, 2 at most; the full-size shape held 4 to 5 frames,
  its shockwave showing the reach; then smoke and debris that linger without
  drawing the eye. [RTVFX cartoon]
- **Mistakes artists name.** A bright frame then a sudden fade reads as
  shrinking, so the core must keep growing; a sharp, long-lived ring steals the
  read from the centre; sparks that all die together look wrong, and smoke
  should outlast them. One 18-part blast lasts about half a second.
  [RTVFX cartoon] [RTVFX frag]
- **Drawn from circles.** A 2D primer builds a blast as a small light centre
  that grows, darker rings outside, then grey, then black, shrinking and
  breaking apart. A flash held too long reads as a lamp. [GD explosion]
- **Colour and count.** Sparks cool from white towards red, and the fade in
  alpha matters as much (listing). No source gives a count: Resogun's team calls
  its particles relatively few, and an artist warns that many small sparks cost
  a blast its momentum (listing). [Art listings] [GamingBolt Resogun]
- **Not every death explodes, and leftovers help.** Vlambeer's demo lets 33% of
  enemies burst harmlessly. A survey calls debris, decals and trails
  persistence: they keep a brief event on screen. [GD Vlambeer]
  [Game feel survey]

## 6. Game feel

- **The two talks.** Juice it or lose it adds tweens, stretch and squeeze to a
  Breakout clone; Jonasson calls juice "maximum output for minimum input". The
  Art of Screenshake makes about 30 small changes to a dull shooter, one a shake
  against the direction of fire; a recreation lists bigger bullets, muzzle
  flash, knockback, permanence and hit pause (listing). [GD juicy enough]
  [GD Vlambeer] [Feel listings]
- **Too much is measured.** One study, of 3,018 players (listing), found both no
  juice and extreme juice worse than medium and high. The survey reporting it
  adds that juice can hide what matters. [Kao study] [Game feel survey]
- **Shake with direction and decay.** The survey prefers an eased move in a
  meaningful direction to random jitter. A vendor's guide wants a spike that
  decays: 0.15-0.25 s for a hit, about 0.3 s for an explosion, positional before
  rotational, one 0-100% slider. [Game feel survey] [StraySpark]
- **Hit stop.** Sakurai freezes attacker and target equally, longer for stronger
  hits, shorter for projectiles, with a cap; the shake starts large, shrinks,
  and is scaled up when the camera is far. Tutorials suggest 2-3 frames for
  light hits, 4-6 for heavy, 10 or more for a kill, timed in seconds, not frames
  (listing). [Sakurai hit stop] [Feel listings]
- **Slow motion.** Holedown slows to a near halt where others freeze; Dusk Diver
  2 slows on an area's last enemy (listing). [Game feel survey] [Feel listings]
- **Reduced motion means less movement, not no feedback.** Xbox guidance: avoid
  camera shake or let players turn it off. WCAG does not count colour and
  opacity changes as motion. Val Head names movement across much of the screen,
  parallax and long travel as triggers, and fades, colour and small moves as
  safe. [XAG 117] [W3C 2.3.3] [Val Head]
- **Flash limits.** No more than three flashes in any second. A flash is a pair
  of opposing luminance changes of 10% or more whose darker state is below 0.80;
  small areas are exempt, up to a quarter of a 10-degree field, about 341 by 256
  px on a 1024 by 768 screen. [W3C 2.3.1]

## 7. Readability rules for busy action screens

- **A stated hierarchy.** Dead Cells ranks its screen: threats get the most
  saturation, contrast and brightness, walkable ground contrasts strongly,
  interactive things sit between, backgrounds blend. Resogun separates by shape.
  [GD Dead Cells] [GamingBolt Resogun]
- **Colour is the back-up.** About 8-10% of men confuse red and green. Put the
  meaning in a symbol, pattern or shape, colour second; orange against blue is
  the safest pair, safer with a lightness gap. Ion Assault failed here:
  fragment, particle and ship in one hue. [GAG colour] [GameIndustry Ion]
- **Roles survive a palette swap.** Downwell's palettes keep four roles, and an
  unsafe enemy is drawn with more of the highlight colour; one player still
  found some too low in contrast (listing). [Forum listings]
- **What the corner of the eye can read.** Beyond about 2 degrees from the gaze,
  vision catches light against dark, motion and flicker, not detail, shape or
  hue. So meters should be bold, change brightness as they fill, differ in shape
  from their neighbours, pulse when ready, and avoid digits. [GD peripheral]
- **Near the ship or in the corner.** The same article keeps the centre for
  action but allows marks where the player already looks, such as bars over
  heads. Resogun's bars sat in the eye-line and were still missed for being
  muted. [GD peripheral] [Gamereactor Resogun]
- **Telegraphs.** The core is a short delay before the attack, dressed with
  gathering particles, a rising sound and a flash. Geometry Wars 3 dips the
  field where enemies will arrive; its predecessor was faulted for arrows
  spawning on the player. [GD telegraph] [WorthPlaying] [Kikizo]
- **Small sizes and thumbs.** At 16 px eyes are 1-2 px and need the strongest
  contrast, and an outline eats pixels a small sprite cannot spare (listing).
  Fingers and buttons can cover a third of a small screen (listing).
  [Art listings] [Feel listings]

## 8. Mascots and pilots

- **A circle anyone can draw.** Kirby began as a placeholder blob, kept so
  anyone could draw him. His body squashes and stretches, but the gaps between
  his eyes and between eyes and mouth stay fixed, and his expression stays mild
  so he mirrors the player. [Wikipedia Kirby]
- **Eyes do the acting.** Astro's bots were built from basic shapes under a
  five-month deadline; the LED eyes change shape for each emotion, about 70
  creatures share that language, and for guest characters the eyes were treated
  as paramount. [PS Blog Astro]
- **Cute by proportion.** The baby schema (big head, big eyes, round face) is
  the usual recipe, and small shifts in where features sit change a face a lot
  (listing). Minishoot's ship has no face at all, yet a critic grew fond of it
  through its chirps. [Art listings] [Entertainium]
- **Fuzz lags and settles.** Follow-through: loose parts start late, trail the
  body and keep moving after it stops. For fur, animators stagger the tufts, and
  squash keeps volume (listing). [Wikipedia follow-through] [Art listings]
- **State on the character.** Studios that use characters as status displays tie
  each visible state to a threshold and keep cues consistent: a limping survivor
  with a cheerful greeting broke the effect. [GD characters as UI]

## 9. Presentation beats

- **A finale that explains the game.** Peggle's end-of-level Fever grew by
  layers from a joke; its makers say new players understood the game at that
  reward. Vampire Survivors' chest scenes borrow from slot machines, grow with
  rarity and can be skipped (listing). [Gamezebo Peggle] [Feel listings]
- **Words on hits.** A 45-person study found text alone barely improved on no
  effects, and rating words gave clearer progress but lowered the sense of
  mastery. Practice notes queue pop-ups one at a time, after the sound and flash
  (listing). [Juicy text] [Feel listings]
- **Low-life warnings.** Full-screen red hides the enemies you need to see.
  Players prefer a brief cue: Nier Replicant tints and slows for about a second
  at a quarter health. [Tildes]
- **Waves and sectors.** Geometry Wars announces each enemy type by sound. Hobby
  devlogs slide a wave banner in, hold it and slide it out (listing); no source
  gave a duration. [GD GeoWars] [Feel listings]

## 10. Mobile WebGL costs

- **Draw calls and batches.** Draw calls are costly in WebGL. A 2D web renderer
  batches sprites across up to 16 textures, hardware allowing, and a change of
  blend mode or object type breaks the batch. [Godot GPU] [Pixi tips]
- **Fill rate and transparency.** Every see-through layer is drawn in full, so
  overlap multiplies the work; if shrinking the window speeds the game up, fill
  rate is the limit. Lovers gained 5-10 fps on laptops by replacing layered star
  planes, mostly empty pixels, with particles. [Godot GPU] [Asteroid Base]
- **Filters and passes.** Tile-based phone GPUs handle full-screen passes badly,
  each tile needing its neighbours' results; the renderer's guide calls filters
  and masks expensive. [Godot GPU] [Pixi tips]
- **Drawn shapes and text.** Small vector shapes batch like sprites unless
  redrawn every frame; hundreds of complex ones should become textures; text
  that changes every frame is uploaded again each time. [Pixi tips]

## What this means for Asteroid Breaker

Ranked by how much each changes the picture for its cost; the numbers in
brackets are the sections each rests on.

- **1. Fix the value ladder per mode first (1, 3, 7).** Field quietest, then
  rocks, then pickups and strays, with shots, ship and warnings at the extreme;
  test the busiest moment in grey in every palette. Light: invert, as Limbo
  does, so the darkest inks go to shots and ship. Phone: only three steps
  survive.
- **2. Rocks: silhouette, one overhead light, material marks (2).** An outline
  family per kind, a lit core with a darker rim so spin never shows a wrong
  side, then marks: cracks for stone, seams and glints for iron, bright edges
  for ice, facets for crystal, a hot heart for volatile, field arcs for
  lodestone; cracks again at damage thresholds. Light: outline darker than fill
  and field. Phone: the smallest size keeps the family and one mark. Reduced
  motion: marks stay still.
- **3. Three sectors by what is drawn, not only by hue (3).** Up to three quiet
  layers in a narrow value band, plus one motif and one reserved accent each:
  dust lanes for the Inner belt, wreck plates for the Iron reach, charged cloud
  for the Storm. Light: features are slightly darker washes, never lighter.
  Phone: drop the finest layer. Reduced motion: no drift, twinkle or flicker.
- **4. Ration glow to four things (4, 10).** Shots, pickups, the engine and a
  volatile rock's heart, each a soft pre-blurred halo sprite, never a
  full-screen filter. Light: additive does nothing on cream, so the halo becomes
  a darker or more saturated tint, or a soft shadow: a second design, not a
  port. Phone: keep halos small, or overdraw climbs. Reduced motion: no pulse.
- **5. Make the pilot the largest readable thing on the ship (8).** A bigger
  canopy filled by the fuzzball, two high-contrast eyes at a fixed spacing, and
  a few states driven by play: squint under thrust, wide eyes near a rock, fur
  puffed on a hit, a bounce on a rescue; fur as a few tufts that lag a turn.
  Light: a pale pilot needs a ring of its own ink round the eyes. Phone: at 15
  px eyes are a pixel or two, so draw the ship larger than its hit circle and
  repeat big reactions in a bubble. Reduced motion: swap poses without tweens.
- **6. One explosion recipe, scaled by rock size (5).** Flash for 1-2 frames,
  full ring for 4-5, then shards of the rock's material and dust that dim as
  they drift; small rocks need not explode. Light: the flash is a dark or
  saturated ring, since white on cream is invisible. Phone: fewer, larger
  shards. Reduced motion: one still frame that fades by opacity.
- **7. Shake, kick and hit stop on a budget (6).** Positional shake along the
  hit, gone within 0.15-0.3 s; hit stop in milliseconds, kept for boulders,
  volatile chains and a lost ship; a brief slow-down for a sector's last rock;
  one strength slider. Reduced motion: all off, replaced by a short tint at the
  ship, which keeps any flash small and single.
- **8. Put state on and around the ship (7).** A thin ring for shield and
  cooldown that brightens as it fills and pulses once when ready, spare
  fuzzballs for lives, no digits near the ship. Light: read the ring by gap and
  thickness, not hue. Phone: clear of the thumb. Reduced motion: no pulse.
- **9. Telegraph by shape (7).** Comets and arrivals get an edge marker with a
  lead time; a volatile rock shows a fuse mark before it blows. Reduced motion:
  a still marker for the same lead time.
- **10. Leave headroom for the progression system (1, 4, 6).** Every neon game
  drew one complaint: the player's own effects bury the ship. Rank player-made
  effects below threats, fade them faster as counts rise, cap halos and
  particles per frame, and reserve one colour and one shape for danger.
- **11. Beats (9).** A sector title card built on the motif, a short flourish on
  a cleared wave, a rescue where the saved fuzzball's eyes do the work, a
  level-up panel that pauses the field. Reduced motion: cards cut in and out.

## What was skipped to keep the rule

- **Code, not opened.** GitHub pages (a MAME issue, a napari discussion,
  PixiJS's wiki), Greasyfork user scripts, shader listing sites, a recreation
  of The Art of Screenshake, MDN's WebGL practices page, and engine tutorials
  on hit stop, shake, bloom, starfields and particle explosions.
- **Opened, then dropped.** An Arm blog on mobile post-processing, a developer's
  blog on normal-mapping a rotating ship and an artist's breakdown of glow in a
  city game all carried shader code; nothing from them is used.
- **Would not open.** Backloggd, the Shmups forum, Polycount, ModDB, PSU,
  GameSpot, TweakTown, Trusted Reviews, Epic's news, Valve's wiki, Unity's
  manual, three game forums, Wikipedia's Nova Drift page, two Creative Bloq
  articles and a course handout on game feel (a PDF the tool could not read).
- **Not watched.** Both talks; the write-ups name few of their tweaks.
- **Not found.** A space shooter with a pale field; word from Nova Drift's
  developer on clarity; particle budgets; durations for banners or title cards;
  a smallest readable sprite size; fur under static charge; pilots drawn inside
  ships. Blasteroids, PixelJunk Shooter, Galak-Z and Solar 2 get a line each
  because reviews gave no more.

## Sources

- Wikipedia Asteroids: <https://en.wikipedia.org/wiki/Asteroids_(video_game)>
- Wikipedia Blasteroids: <https://en.wikipedia.org/wiki/Blasteroids>
- Wikipedia Stardust: <https://en.wikipedia.org/wiki/Super_Stardust_HD>
- Game Informer Ultra: <https://gameinformer.com/games/super_stardust_ultra/b/playstation4/archive/2015/02/24/an-overly-familiar-alien-invasion>
- GD GeoWars: <https://www.gamedeveloper.com/game-platforms/the-color-and-the-shape-bizarre-creations-on-i-geowars-i-sensible-aesthetic>
- Kikizo: <https://games.kikizo.com/reviews/xbox360/geometry-wars-retro-evolved-2-p2.asp>
- AV Club: <https://www.avclub.com/geometry-wars-retro-evolved-2-1798214562>
- Kritiqal: <https://kritiqal.com/articles/2016/12/17/geometry-wars-3-review>
- WorthPlaying: <https://www.worthplaying.com/article/2014/12/10/reviews/94370-xbox-one-review-geometry-wars-3-dimensions/>
- WTMG Asteroids: <https://waytoomany.games/2021/12/13/review-asteroids-recharged/>
- Tech-Gaming Asteroids: <https://tech-gaming.com/asteroids-recharged>
- Rogueliker: <https://rogueliker.com/nova-drift-review/>
- GameIndustry Nova: <https://www.gameindustry.com/?p=135813>
- GamingBolt Resogun: <https://gamingbolt.com/resogun-dev-diary-from-voxel-murder-to-resolution-gunning-in-1080p>
- Gamereactor Resogun: <https://www.gamereactor.eu/resogun-review/>
- PopMatters: <https://popmatters.com/180528-luftrausers-perfectly-balanced-chaos-2495671381.html>
- Push Square Luftrausers: <https://pushsquare.com/reviews/psn/luftrausers>
- Kill Screen Lovers: <https://killscreen.com/lovers-dangerous-spacetime-takes-chris-ware-outer-space-whether-he-wants-go-or-not>
- Asteroid Base: <https://www.asteroidbase.com/devlog/bringing-warmth-to-deep-space/>
- Entertainium: <https://entertainium.co/2024/04/15/review-minishoot-adventures>
- KeenGamer: <https://www.keengamer.com/articles/reviews/pc-reviews/minishoot-adventures-review-a-tiny-ship-with-huge-bullet-hell-energy>
- Switchaboo GEM: <https://switchaboo.com/graceful-explosion-machine-quick-review>
- GamingBolt Galak-Z: <https://gamingbolt.com/galak-z-the-dimensional-interview-a-modern-halo-and-far-cry-3-mixed-in-a-2d-shell>
- GameIndustry Ion (a review of Ion Assault HD): <https://www.gameindustry.com/?p=12239>
- Wikipedia Space Giraffe: <https://en.wikipedia.org/wiki/Space_Giraffe>
- Game Ramble: <https://gameramble.com/Flewfies-Adventure-PC-Review>
- GD visual confusion: <https://gamedeveloper.com/design/how-to-reduce-visual-confusion-in-your-game>
- GD Beast Breaker: <https://gamedeveloper.com/art/how-color-scripting-conveyed-the-emotional-arcs-of-beast-breaker>
- GD Dead Cells: <https://gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i->
- GD Sable: <https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability>
- GD characters as UI: <https://gamedeveloper.com/design/designing-characters-as-ui-in-i-state-of-decay-2-star-citizen-and-battletech-i->
- Kenney: <https://kenney.nl/knowledge-base/learning/improving-2d-vector-art>
- Lospec: <https://lospec.com/articles/pixel-art-outlines-part-2-using-color>
- Ronimo post (read in a copy; original on joostdevblog.blogspot.com, May 2015): <https://tanzaniangamiabooty.blogspot.com/2015/05/making-gameplay-stand-out-against-rich.html>
- Gangles: <https://gangles.ca/2008/07/18/bloom-disasters/>
- Demo Room: <https://thedemoroom.substack.com/p/blending-modes-additive-modes>
- PS Blog Astro: <https://blog.playstation.com/?p=395223>
- RTVFX cartoon: <https://realtimevfx.com/t/stylized-cartoon-explosion-overwatch-inspired/1767>
- RTVFX frag: <https://realtimevfx.com/t/stylized-frag-launcher-explosion-overwatch-inspiration/1894>
- GD explosion: <https://www.gamedeveloper.com/art/2d-game-art-for-programmers-back-with-a-bang->
- GD Vlambeer: <https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games>
- GD juicy enough: <https://gamedeveloper.com/design/video-is-your-game-juicy-enough->
- Game feel survey: <https://ar5iv.arxiv.org/html/2011.09201>
- Kao study (as the survey reports it; sample size from a listing): <https://www.x-mol.com/paper/1307980428882448384>
- StraySpark (a vendor's blog): <https://www.strayspark.studio/blog/camera-shake-game-feel-without-motion-sickness>
- Sakurai hit stop: <https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/>
- Gamezebo Peggle: <https://www.gamezebo.com/news/peggle-how-a-spark-started-a-fever/>
- XAG 117: <https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117>
- W3C 2.3.1: <https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html>
- W3C 2.3.3: <https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html>
- Val Head: <https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity/>
- GAG colour: <https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/>
- GD peripheral: <https://gamedeveloper.com/design/perceiving-without-looking-designing-huds-for-peripheral-vision>
- GD telegraph: <https://gamedeveloper.com/design/enemy-attacks-and-telegraphing>
- Wikipedia Kirby: <https://en.wikipedia.org/wiki/Kirby_(character)>
- Wikipedia follow-through: <https://en.wikipedia.org/wiki/Follow_through_and_overlapping_action>
- Juicy text: <https://arxiv.org/html/2512.13695>
- Tildes: <https://tildes.net/~games/wee/enough_with_the_red_screen_of_almost_death>
- Godot GPU: <https://docs.godotengine.org/en/4.5/tutorials/performance/gpu_optimization.html>
- Pixi tips (option names inline, no listings): <https://pixijs.com/8.x/guides/concepts/performance-tips>
- Review listings (search summaries; pages not opened or blocked): Stardust <https://gamespot.com/reviews/super-stardust-hd-review/1900-6173527/>, <https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/SuperStardustHD>; Blasteroids <https://www.uvlist.net/game-23-Blasteroids>, <https://www.exotica.org.uk/wiki/Lost_In_Translation/Blasteroids>; Luftrausers <https://backloggd.com/u/Kerosyn/review/208485/>; PixelJunk Shooter <https://www.gamespot.com/reviews/pixeljunk-shooter-review/1900-6243534/>, <https://tech-gaming.com/fire-and-rain-pixeljunk-shooter-review>; Solar 2 <https://gamebrain.co/game/solar-2>, <https://mashthosebuttons.com/review/solar-2-review>
- Forum listings (search summaries; pages not opened or blocked): vector glow <https://retropie.org.uk/forum/post/236574>, <https://forum.arcadecontrols.com/index.php/topic,2593.0.html>; white shots <https://itch.io/post/3137840>, <https://itch.io/post/3114429>; backdrops <https://www.sinsofasolarempire2.com/article/529967/backgroundwallpaper-issues>, <https://forum.cosmoteer.net/d/12500-removing-the-planet-sun-nebula>; vignettes <https://developer.valvesoftware.com/wiki/File:Postprocess_controller_vignette.jpg>, <https://community.focus-entmt.com/focus-entertainment/space-marine-2/ideas/8114-can-we-get-an-option-to-remove-the-vignette>; damage <https://www.galaxus.ch/en/page/games-dont-need-health-bars-32559>, <https://forums.fantasystrike.com/t/clearer-animation-of-block-damage-idea/1260>; blending <https://github-redirect.dependabot.com/napari/napari/discussions/3914>; glow sprites <https://gamedev.net/forums/topic/697930-bloom-shader-in-a-2d-game/5385289/>, <https://realtimevfx.com/t/beginner-need-help-w-blazblue-vfx/26380>; Downwell <https://liighteffog.blogspot.com/2017/11/downwell-packs-lot-into-few-pixels.html>, <https://itch.io/t/561408/extrasunlockables>, <https://itch.io/post/2655631>
- Art listings (search summaries; pages not opened or blocked): materials <https://polycount.com/discussion/191774/hand-painted-sculpt-defining-materials>, <https://www.creativebloq.com/digital-art/realistically-paint-character-frozen-ice-61515312>, <https://80.lv/articles/how-to-make-magical-hand-painted-crystal-sword-in-3d>, <https://www.belloflostsouls.net/?p=32616>; shape <https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent>, <https://dreamfarmstudios.com/shape-language-in-character-design/>; lit sprites <https://www.html5gamedevs.com/topic/39115-light2d-rotating-normal-map-issue/>, <https://www.construct.net/en/forum/construct-classic/help-support-using-construct-38/bumpmap-light-rotates-along-34864>; star layers <https://mookie4242.itch.io/asteroids-plus-20/devlog/527001/asteroids-plus-20-milestone-17-dynamic-background-part-1>; particles <https://docs.unity3d.com/Manual/particle-color.html>, <https://realtimevfx.com/t/stylized-frag-launcher-explosion-overwatch-inspiration-breakdown-posted/1894?page=2>; small sprites <https://www.sprite-ai.art/guides/how-to-create-16x16-pixel-art>; cuteness <https://www.creativebloq.com/character-design/10-tips-kawaii-character-design-514833>, <https://newrepublic.com/article/135244/cuteness-comes-age>; fur and squash <https://library.fiveable.me/2d-animation/unit-7/creating-natural-movement-follow/study-guide/5R2G5jvORYbtEA1l>, <https://blog.cg-wire.com/squash-stretch-principle>
- Feel listings (search summaries; pages not opened or blocked): screenshake recreation <https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects>; hit stop <https://uhiyama-lab.com/en/notes/godot/hit-feedback-hitstop/>; slow motion <https://tvtropes.org/pmwiki/pmwiki.php/Main/HitStop>; Vampire Survivors <https://store.epicgames.com/news/vampire-survivors-built-genre-autoshooter-bullet-heaven>; pop-ups <https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/>; wave banners <https://medium.com/@derekanderson-dev/ui-wave-system-unity-developer-8daf51db522f>; touch <https://www.flowlab.io/lab/blog/designing-for-mobile>
