# Mechanics: what Asteroids-likes and their neighbours do

Read 2026-11-14 from wikis, reviews, guides, store pages, interviews and
design essays, through a fetch tool that summarises each page, so all wording
is paraphrase; no game source code was opened and no asset copied.
"(inferred)" marks my own reading; "(listing)" marks a fact taken only from a
search result summary of a page I could not open; "(weak)" marks a page that
read as machine-written or held a plain error. Tags in square brackets are in
Sources.

## 1. The lineage and what each entry added

- **Asteroids (1979), the base and its regrets.** A large rock splits in
  two, twice; smaller pieces are faster and score more; at most 26 rocks
  exist, and at the cap a split gives one piece. The large saucer fires at
  random; the small one aims, to make the player move, and a shrinking
  timer shortens the gaps between saucers. Ed Logg tried no drag (too easy)
  and heavy drag (accidental deaths) and settled between. He would change
  hyperspace (button out of reach, about one return in six fatal) and the
  small saucer's first shot (section 2). [WP Asteroids] [Arcade Blogger]
- **Asteroids Deluxe (1981), a shield, a chaser, and fewer players.** A held
  shield bounces the ship off rocks: over ten seconds of charge, cut hard by
  each impact, not refilled until a ship is lost. The killer satellite is
  harmless until shot, then breaks into chasers. Wikipedia calls it much
  harder and less approachable; a 2024 review, no better than the original
  and best as a difficulty option. [WP Deluxe] [Game Hoard Deluxe]
- **Space Duel (1982), two ships on a tether.** One player may fly two
  linked ships: thrust on one drags the other and the pair spins. Two guns,
  but a hit on one can burn the tether and take the other. [WP Space Duel]
- **Blasteroids (1987), energy, ship forms, rock kinds, a map, a boss.** No
  lives: one energy pool is fuel and armour. The ship changes at will
  between fast, armed and armoured forms. Red rocks drop crystals that
  decay; popcorn rocks swell when hit and only need stopping; egg rocks
  loose leeches that home in and drain energy; seekers home once shot.
  Eight power-ups include a piercing shot, a spin that fires all round and
  a crystal magnet. A galaxy is 9 or 16 one-screen sectors reached from a
  map, then the boss Mukor. [WP Blasteroids] [PA Blasteroids]
- **Stardust and Super Stardust (Amiga, 1993-94), tokens, a map, mother
  ships.** The smallest fragments drop tokens (gun speed, lives, shield,
  energy); dying takes back some gun speed. The map shows a level's
  difficulty and special enemies before it is picked; a mother ship ends
  each of five worlds. A retro review of the sequel: beautiful, very hard,
  repetitive. [Aminet Stardust] [Dazeland Super Stardust]
- **Smaller entries.** Maelstrom (1992): a limited shield, power-ups, score
  multipliers. Comet Busters! (1991): each player picks one special,
  Hyperspace, Shields, Disruptor or Cloak. Astro Duel Deluxe (2017): a
  destroyed ship leaves its pilot adrift, to be run down by a rival.
  [WP Maelstrom] [MacRepo Maelstrom] [HOTU] [NL Astro Duel]
- **Asteroids (1998), hazards belong to the zone.** Three ships; 5 zones of
  15 levels; crystal rocks that regrow, energy rocks that return shots,
  rocks that cannot break; each zone's backdrop acts (a black hole pulls, a
  sun flares). Verdict: faithful, with additions that added little.
  [WP Asteroids 98] [Gamebits Asteroids 98]
- **Super Stardust HD (2007) and after, twin-stick, three weapons for three
  rocks.** Rock Crusher, Gold Melter and Ice Splitter each suit one rock
  kind and are upgraded apart. A boost makes the ship untouchable for a
  moment and recharges; bombs are few; a shield token takes one hit. Five
  planets of five phases, the fifth a boss; Metacritic 85. Delta cut the
  weapons to two. Ultra's reviewer praised very tight controls, noted that
  the player makes most of the danger by how rocks are cut, and found it
  the 2007 game again. [WP SSHD] [PSLS SSHD] [WP Delta] [Push Square Ultra]
- **Spheres of Chaos (1992, freeware 2007), the player sets the dials.**
  Most enemies split when shot; black holes pull or push; a boss follows
  each level. Options set enemy numbers, pickup frequency, effects, and a
  lock that holds the ship at screen centre. One review: "Asteroids on
  LSD", confusing at first, loved or hated. [SoC tips] [HOTU]
- **Asteroids: Recharged (2021), power-ups from saucers, one life.** Timed
  power-ups (spread, rail gun, reflector shield, big laser) drop only from
  UFOs. Arcade mode is one life; 30 challenges; co-op. Scores of 3/5, 6/10
  and 80/100. Complaints: one life undercuts a good run; power-up
  challenges turn on luck. [Recharged reviews] [Recharged listings]

## 2. Known faults of the genre and their fixes

- **Lurking: the slow tail was also an exploit.** Saucers could not aim
  across an edge, and the small saucer's first shot had been made to miss
  after testers found an instant aimed shot unfair. Players left one rock,
  sat at the far edge and shot saucers at 1,000 points each. Atari patched
  it; Deluxe's saucers shoot across edges. [WP Asteroids] [Arcade Blogger]
  [WP Deluxe]
- **The slow tail: every fix found is a clock that sends something.**
  Asteroids shortens saucer gaps; Defender's baiters exist so nobody
  lingers; Spheres of Chaos sends hostile ships, then swarms; an itch clone
  sends hunters sooner each wave; Sinistar's workers build the boss from
  crystals the player is slow to take. None shortens the hunt for the last
  pebbles; they tax it (inferred). [WP Asteroids] [WP Defender] [SoC tips]
  [itch Asteroid Blaster] [WP Sinistar]
- **Rotate-and-thrust is the biggest barrier.** Asteroids sold badly in
  Japan partly for its controls. In a summary of Nova Drift's Steam reviews
  the movement is the top complaint (weak); critics call it divisive but
  worth learning; a phone review took an hour to stop oversteering (weak).
  [WP Asteroids] [VaporLens] [Nova Drift reviews] [FinalBoss Nova Drift]
- **What other schemes changed.** Super Stardust moves on one stick and
  fires on the other, to praise. Recharged points the ship with the stick
  and thrusts on a trigger, which Gamezebo found more natural than the
  arcade's buttons. Solaroids offers classic, one-stick and two-stick modes
  and brakes when the stick is released (listing). [WP SSHD]
  [Push Square Ultra] [Recharged reviews] [Solaroids listing]
- **Spawn and wrap deaths.** An analyst still lists spawn deaths among
  Geometry Wars 2's faults. Recharged's rocks enter at the edges unwarned,
  yet Gamezebo called its deaths fair. Hyperspace was itself a random
  spawn; each thing that replaced it (shield, boost, dash) leaves the
  outcome to the player (inferred). [Critical-Gaming GW] [Recharged reviews]
- **One hit, or a buffer.** One hit: Asteroids, Geometry Wars, Recharged.
  Buffers: Deluxe's shield, Blasteroids' energy, Super Stardust's shield
  token (a guide rates it above an extra ship (listing)), Nova Drift's hull
  under a shield that regrows. [WP Deluxe] [WP Blasteroids]
  [SSHD listings] [Nova Drift reviews]
- **No rest.** Asteroids' testers from Space Invaders said it gave no
  break. Nova Drift's pause to pick a mod is praised as time to think.
  [WP Asteroids] [Nova Drift reviews]

## 3. Risk and reward systems

- **Geometry Wars 2, a multiplier that must be fetched.** Kills drop geoms,
  which raise an uncapped multiplier that survives death. Bizarre added
  them because guides to the first game said to circle the arena's edge,
  which the team found dull, and so casual players could score. An analyst:
  geoms leave no safe standing room. [Joystiq GW2] [Critical-Gaming GW]
- **Multipliers kept by a timer, or by not being hit.** Resogun's rises per
  kill and resets after a few seconds without one, and some humans are
  freed only if it is high enough at that moment. Super Stardust HD's grows
  with every kill, each step slower, and a hit breaks it, so a shield
  guards score too. [Resogun pages] [PSLS SSHD]
- **Escapes that pay.** Resogun's boost is an untouchable ram; each enemy
  struck refunds some boost, and it ends in a blast sized by the hits.
  Boosting through Super Stardust's point tokens multiplies them (listing).
  Null Drifter sells a dash that kills what it crosses. [Resogun pages]
  [SSHD listings] [XboxHub Null Drifter]
- **Meters filled by play.** Resogun's overdrive fills from cubes that
  kills drop; once full, more are wasted, so it is fired often. Shatter's
  shards fill a bar that both the big attack and the shield spend.
  [Resogun pages] [WP Shatter]
- **Grazing as experience.** In Psyvariar a bullet passing close gives
  experience, and each level-up grants a moment of invulnerability, so
  players graze on purpose to buy the next safe window. [WP Psyvariar]
- **Pac-Man CE DX, a train cashed in when the player dares.** Sleeping
  ghosts wake and follow; a longer train pays more and threatens more. A
  near miss slows time. A bomb sends ghosts home but lowers speed and the
  multiplier; Geometry Wars 2's bomb scores nothing. [WP Pac-Man CE DX]
  [WP GW RE2]

## 4. Rescue, escort and companions

- **Defender, something to protect.** Ten astronauts; landers lift them,
  and one carried to the top becomes a mutant. Shoot the lander, catch the
  falling astronaut, set it down. Lose all ten and the planet explodes;
  survive five waves and it returns. A scanner shows where everyone is.
  Jarvis wanted attack and defence at once, so the player keeps re-ranking
  what matters. [WP Defender]
- **Resogun, rescue with strict ways to fail.** Ten humans a level, each
  freed by killing marked keepers in time, sometimes in order, then carried
  and thrown into an exit. One is lost to a wrong order, a stray bullet, a
  gap, a kidnap, or the ship dying while carrying. They pay score,
  sometimes an upgrade or a ship. Critics: the rules go unexplained and the
  markers vanish in the noise. [WP Resogun] [Resogun pages]
- **Choplifter, Oids, PixelJunk Shooter: capacity and clumsiness.** 64
  hostages at 16 a trip, and landing on them kills them; eight a trip, and
  fuel for a full load; the way opens once every survivor is rescued or
  dead. [WP Choplifter] [WP Oids] [WP PixelJunk Shooter]
- **Galaga, lose a ship to gain a wingman.** A captured fighter costs a
  life; rescued, it flies beside the player: double fire, double target.
  Shoot its captor at the wrong time and it turns enemy. The rescue first
  paid an extra life; the designer changed it to a ship that fights and
  asked that the instruction card lead with it. [WP Galaga]
- **Flicky and Sonic 3D Blast, followers in a line.** Flicky's chicks trail
  in a chain; a longer chain delivered at once pays more; an enemy touching
  it scatters it. Sonic 3D needs five birds a section; a hit scatters them
  and some wander. Critics split between depth and a tedious fetch quest.
  [WP Flicky] [WP Sonic 3D]
- **Companions with jobs.** Gradius: up to four Options that add fire; the
  team tried over twenty ways for them to move, and later games let the
  player pick a formation. Star Fox 64: one wingman shows a boss's health,
  one advises, one finds routes; one shot down misses the next stage.
  Geometry Wars 3: a drone that collects geoms, or one that shoots.
  [WP Gradius] [WP Star Fox 64] [WP GW3]
- **What works (inferred).** The rescued pay in score, firepower,
  information, fuel or access. The liked versions give a window to recover
  and show where the rescued are; the resented ones kill by unexplained
  rules or make regathering the whole game.

## 5. Enemies and hazards in an asteroid field

- **Chasers are resented when they clump.** Deluxe's satellite pieces bunch
  and follow through the edges; with four shots in flight the reviewer
  calls it a clumsy chase and says ending the bunching might save the idea.
  [Game Hoard Deluxe]
- **Things that drain rather than kill.** Blasteroids' leeches drain
  energy; Shatter's loose bricks stun the paddle; de Blob's ink drains
  paint until washed off; Paper Mario's Fuzzies cling and drain until
  shaken off by a timed press. [WP Blasteroids] [WP Shatter] [WP de Blob]
  [Mario Wiki Fuzzy]
- **Black holes split opinion.** Spheres of Chaos: they pull or push, can
  be orbited, and enough of them make the field hard to cross. Nova Drift's
  singularities hurt but carry a healthy ship through. Astro Duel's black
  hole stage is its hard one. Jam players call a pull unfair when it acts
  at long range or bends shots (listing). [SoC tips] [WP Spheres]
  [Nova Drift reviews] [NL Astro Duel] [Jam comments]
- **Hazards on a schedule.** A sun that flares (1998); comets, mine trails
  and wandering black holes in Nova Drift, where a Hostile Universe option
  adds more by choice. [Gamebits Asteroids 98] [Nova Drift reviews]
- **Bosses: too easy and too long are both complaints.** IGN found
  Resogun's too easy; one Minishoot boss has six stages and restarts whole
  on a failure. Spheres' bosses shower pickups. [WP Resogun]
  [Minishoot reviews] [SoC tips]

## 6. Pickups and weapons

- **Recharged, timed and random.** A border round the screen counts down
  the active power-up and pickups drift to the ship; the luck of the drop
  is the main complaint. [Recharged reviews]
- **Tokens that change while they wait.** Super Stardust HD's weapon tokens
  cycle colour, so waiting picks the weapon; an extra-ship token left 10-15
  seconds becomes a shield; a shield token taken while shielded lets off a
  blast. Spheres of Chaos' triangles cycle slowly and change at once when
  shot. [PSLS SSHD] [SoC tips]
- **Banked, and taxed by death.** Gradius' capsules move a cursor along a
  bar; the player decides when to cash in, and better items sit further
  along. One arcade version sends capsule carriers after a death so the
  player can rebuild; Stardust takes back gun speed. [WP Gradius]
  [Aminet Stardust]
- **Matched weapons cost attention.** Super Stardust's three must each be
  learned and switched as rocks arrive; Delta went down to two.
  [Push Square Ultra] [WP Delta]
- **No bad pickups, and pickups come to the ship (inferred).** No asteroid
  game read has a harmful pickup; Nova Drift's trade-off wild mods are
  chosen from a menu. Each game with drops on a wrapping screen brings them
  in: drift (Recharged), homing (Nova Drift), a magnet (Blasteroids).
  [Nova Drift reviews] [PA Blasteroids]

## 7. Progression on this base

- **Nova Drift, three gear slots, then mods.** The first three level-ups
  are fixed: weapon, body, shield, one of each held. After that each level
  offers mods drawn at random from those unlocked; reviews count seven on
  offer with a few rerolls. Mods sit in short trees, over 200 by the
  store's count. Experience is sparks that kills drop and that home on the
  ship. [Nova Drift reviews] [Steam Nova Drift] [Nova Drift listings]
- **Nova Drift, builds differ by verb.** The weapon changes what the player
  does (beam, swords, homing salvo, shotgun, all-round pulse); bodies cloak
  or carry drones; shields reflect or warp. Rocks come first, then enemy
  ships, bosses at intervals, a final boss at wave 120, Endless after a
  win. [Nova Drift reviews] [Steam Nova Drift]
- **Nova Drift, complaints.** Controls first. The upgrade screen is much to
  take in, and on a phone its small text led to wrong picks (weak). A slow
  start, few enemy types, and an Endless that outruns levelling (weak).
  [Nova Drift reviews] [FinalBoss Nova Drift] [VaporLens]
- **Vampire Survivors, small steps often.** Three or four options a level;
  six weapons and six passives; stages end at 15, 20 or 30 minutes. One
  essay: a reward about every 23 seconds keeps pace, the pause rests the
  eyes, and choices weigh little because a refused option soon returns.
  [WP Vampire Survivors] [Boger VS]
- **20 Minutes Till Dawn and Brotato, four options.** 20 Minutes: one of
  four per level, manual aim, 20 or 10 minute runs; a critic found late
  builds alike. Brotato: four stat upgrades per level in four tiers (Max HP
  +3 to +12), a shop between waves, 16 primary stats, some capped (dodge
  60%). [WP 20MTD] [Brotato wiki]
- **Smaller arena games.** Null Drifter sells fire rate, bullet count,
  damage, speed and dash cooldown (listing) and is seen whole in an hour.
  Void Scrappers' top complaint is pool dilution: each unlock makes the
  wanted pick rarer (weak). Minishoot' Adventures gives a skill point per
  level, and has auto-fire, a speed setting and an invincibility switch.
  [XboxHub Null Drifter] [Null Drifter listing] [VaporLens] [Minishoot reviews]
- **Late-run reading.** Geometry Wars 2's clutter is rated moderate to
  heavy; players say Vampire Survivors turns unreadable late (listing);
  Housemarque cut effects from Resogun to reduce clutter.
  [Critical-Gaming GW] [VS listings] [WP Resogun]

## 8. Pacing and structure

- **Set shapes.** Super Stardust HD: 5 planets of 5 phases. Resogun: 5
  levels of 3 phases and a boss. Nova Drift: 120 waves. Brotato: 20 waves
  of 20 to 60 seconds, the last 90. Blasteroids and the 1998 game are in
  section 1. [WP SSHD] [WP Resogun] [Nova Drift reviews] [Brotato wiki]
- **Fixed-time modes, and modes that take a verb away.** Geometry Wars 2's
  Deadline is three minutes with unlimited lives, asked for so a director's
  son could play. Its Sequence is 20 set levels of 30 seconds, each with an
  easy way through and a higher-scoring one. Bizarre found limiting
  movement dull but limiting fire fun: Pacifism has no shots. Super
  Stardust's Impact has only boost. Pac-Man CE DX runs five or ten minutes.
  [WP GW RE2] [Joystiq GW2] [WP SSHD] [WP Pac-Man CE DX]
- **Assists and Endless.** Delta has Casual, Normal and Hardcore; Resogun
  five difficulties; Spheres a centre lock. Nova Drift's Endless opens only
  after a first win. [WP Delta] [WP Resogun] [HOTU] [Nova Drift reviews]
- **Phone sessions are short and shrinking.** A 2019 benchmark calls 7-8
  minutes a good average, down about a minute in a year; a 2025 one puts
  the median game at 5-6 (listing). [PGbiz sessions] [Session listings]

## 9. Mascots as mechanics

- **Yoshi's Island, the passenger is the life meter.** A hit knocks the
  baby off in a bubble and starts a countdown; catch him and play goes on.
  Stars refill the timer, to 30. Praised as a life system; several
  reviewers disliked the crying. [WP Yoshi's Island]
- **Kirby Mass Attack, a crew of ten as one character.** Fruit adds Kirbys.
  A hit turns one blue; a second turns it grey and it floats away unless
  dragged back. Doors need a head count. Levels were kept simple because
  steering a crew is already a lot. LocoRoco grows by one per berry, to 20;
  Pikmin's colours have jobs, and any left out at dusk are eaten.
  [WP Kirby Mass Attack] [WP LocoRoco] [WP Pikmin]
- **Katamari Damacy, size decides what sticks.** Smaller things stick, and
  animals that chase the ball flee once it outgrows them. [WP Katamari]
- **Static charge: jam games only.** In one, striking walls builds charge
  that pulls collectibles in faster, and too much discharges and pushes
  them away (listing). No commercial game built on static cling was found.
  [Static listings]

## What this means for Asteroid Breaker

Ranked by value for effort; the games named are the findings leaned on.

### Add

- **1. Give the crew a job.** A stray brought home flies in tow at once
  (Galaga, Gradius, Flicky) and adds one small visible thing. A hit knocks
  the last one loose in its bubble, to be caught again within seconds; only
  a hit with nobody in tow costs the ship (Yoshi's Island, Kirby). The
  mascot becomes the health bar. Risk: a tail is a bigger target.
- **2. Make the bailed-out pilot the next rescue** (Astro Duel; Galaga's
  switch from extra life to wingman). Both halves already exist.
- **3. Have rocks shed something to collect.** Fluff or sparks that fly to
  a near ship and feed the chain (geoms, Nova Drift). It pulls the player
  through the field, and it is the experience pickup a later system needs.
- **4. Put a clock on the tail of a wave.** Bring the comet sooner as a
  wave ages (saucer timer, baiters, Spheres), let the last small rocks lean
  toward the ship as lodestones do, and cap live rocks (Asteroids' 26).
- **5. Replace the Nova pickup with a charge the fuzzball builds.** Breaks
  and near misses fill a static meter (Resogun, Shatter, Psyvariar);
  spending it is the ring blast; charge is wasted when full. Risk: a third
  touch button, unless a full meter fires on the next dash.
- **6. Make the dash pay.** Dashing through fluff, a pickup or a stray's
  bubble doubles it or refunds recharge (Resogun, Super Stardust).
- **7. Put strays in danger, with warning.** A stray in a comet's path,
  marked at the edge, with a fair window (Defender). Avoid Resogun's
  unexplained failures.
- **8. Make each sector's boulder a set piece** that sheds rock kinds and
  ends in a shower of pickups (Mukor, Spheres): short, not a pushover.
- **9. One backdrop hazard per sector.** A flare on a timer, or a mild
  short-range pull that also bends rocks and shots (1998, Spheres).
- **10. A three-minute mode for phones,** unlimited ships, score only
  (Deadline); later a no-fire mode on dash and crew alone (Pacifism).

### Change

- **Let a shot cycle a waiting pickup within its group** (Spheres, Super
  Stardust). Drops become choices, a rehearsal for picking one of a few.
- **Four small ones.** A Shield taken while shielded bursts (Super
  Stardust); pickup timers show at the screen's edge (Recharged); part of
  the chain survives a lost ship (Geometry Wars 2); lodestones do not bunch
  (Deluxe's satellite).
- **On touch, lead with stick aim and braking on release** (Solaroids);
  keep rotate-and-thrust as the option.

### Remove or decline

- **Nova as a pickup,** if the meter is built; **Extra ship as a common
  drop,** once crew in tow absorb hits.
- **Weapons matched to rock kinds.** They need a switch control, Delta cut
  them back, and they would fight later build choices.
- **Bad pickups, shooting saucers, hyperspace.** The lineage has no bad
  pickups, the comet does the saucer's job, and hyperspace is its own
  designer's regret.

### Leave alone

- **The whole field on one screen,** which Spheres needs a centre lock to
  imitate; **the dash**, the kind of escape every successor moved to;
  **all-good pickups**.
- **Each wave waiting for the first move.** It answers the oldest
  complaint, no break, and is where a choice screen can later sit.
- **Hand-written waves.** Borrow Sequence's rule for them: an easy way
  through and a higher-scoring one.

### Hooks a progression system will want

- **A collected experience object** with a pickup radius (Magnet is that
  stat), and **a safe moment to choose:** the wait before a wave.
- **Named numbers:** shots a second (7), shots in flight (6), shot speed
  and pierce; turn rate, thrust, drag; dash length (0.22 s) and recharge
  (2.5 s); pickup radius and duration; chain window (1.5 s); crew size;
  charge rate; drop luck. Brotato caps such stats.
- **Slots, not a flat pool:** Nova Drift's weapon, body and shield; here
  perhaps one perk per crew fuzzball. Short trees and three or four
  large-print options avoid pool dilution and unreadable menus.
- **Events to hang effects on:** on break, chain step, dash, pickup,
  rescue, near miss, crew knocked loose.
- **A decision on timed pickups.** Spread, Rapid and Lance are what these
  games sell as permanent mods; keep them as short surges over a build.
- **An Endless with a finish line,** since levels fall behind scaling, and
  scores kept apart by build as they are by speed (inferred).

## What was skipped to keep the rule

- **Kept shut for the no-code rule:** a disassembly of the Asteroids arcade
  program (so the rocks-per-wave figures it gives are left out), a
  programmer's article series on rebuilding Asteroids, a gamedev.net
  journal entry, an engine-forum thread on touch controls, a developer
  blog's design notes for a survivors game, a Nova Drift mod's page, The
  Cutting Room Floor's Maelstrom page and the page of its open-source port.
- **Would not open (403, 404, 429, blocked or cut short):** Niche Gamer,
  GameGrin, God is a Geek, Prima Games, GameSkinny, TrueAchievements,
  ModDB, Eurogamer, IGN, VideoGamer, GamesRadar, Windows Central, Loot
  Level Chill, Game Industry Library, Epic's news page, and Wikipedia on
  Asteroids: Recharged, Comet Busters! and Gradius' Options.
- **Thin or not found:** Asteroids' respawn rule and rocks per wave in
  prose; Maelstrom's items; Asteroids Hyper 64 (its Wikipedia address gave
  the 1979 article); Space Duel's enemies; what each Resogun human gives;
  Nova Drift's experience curve and its designer's own account (a podcast
  only); Galactic Glitch and Badland beyond listings; any commercial game
  about static cling; any game that shortens the slow tail itself.

## Sources

- Aminet Stardust (1994 review text): <https://ftp.fau.de/mirrors/aminet/docs/rview/Stardust.txt>
- Arcade Blogger: <https://arcadeblogger.com/2018/10/24/atari-asteroids-creating-a-vector-arcade-classic/>
- Boger VS: <https://jboger.substack.com/p/the-secret-sauce-of-vampire-survivors>
- Brotato wiki: <https://brotato.wiki.spellsandguns.com/Stats>, <https://brotato.wiki.spellsandguns.com/Upgrades>, <https://brotato.wiki.spellsandguns.com/Waves>
- Critical-Gaming GW: <https://critical-gaming.squarespace.com/blog/2008/9/15/geometry-wars-evolutionary-design.html>
- Dazeland Super Stardust: <https://www.dazeland.com/en/Amiga/Super_Stardust.html>
- FinalBoss Nova Drift (weak): <https://finalboss.io/nova-drift-on-mobile-kept-me-up-way>
- Game Hoard Deluxe: <https://thegamehoard.com/2024/05/10/asteroids-deluxe-arcade>
- Gamebits Asteroids 98: <https://www.gamebits.net/psx/asteroid>
- HOTU (Home of the Underdogs): Spheres of Chaos <https://www.homeoftheunderdogs.net/game.php?id=3419>, Comet Busters! <https://homeoftheunderdogs.net/game.php?id=4541>
- itch Asteroid Blaster (store page only): <https://rossgrams.itch.io/asteroidblaster>
- Jam comments (listing): <https://itch.io/jam/gmtk-2018/rate/299985>
- Joystiq GW2: <https://www.engadget.com/2008-09-05-joystiq-interview-a-bizarre-interview-about-geometry-wars-2.html>
- MacRepo Maelstrom: <https://www.macintoshrepository.org/4478-maelstrom>
- Mario Wiki Fuzzy: <https://www.mariowiki.com/Fuzzy>
- Minishoot reviews: <https://www.gamespew.com/2024/04/minishoot-adventures-review/>, <https://buried-treasure.org/2024/04/minishoot-adventures/>
- NL Astro Duel: <https://www.nintendolife.com/reviews/switch-eshop/astro_duel_deluxe>
- Nova Drift listings (listing): <https://nichegamer.com/reviews/nova-drift-review>, <https://www.mejoress.com/en/nova-drift-super-mods-unlock-stats/>
- Nova Drift reviews: Hardcore Gamer <https://hardcoregamer.com/reviews/review-nova-drift/327733/>, Lords of Gaming <https://lordsofgaming.net/2025/05/nova-drift-review-a-unique-retro-rogue-lite>, Pocket Gamer <https://www.pocketgamer.com/nova-drift/review/>, Game Chronicles <https://gamechronicles.com/nova-drift-early-access-review-pc>, Rogueliker <https://rogueliker.com/nova-drift-review/>
- Null Drifter listing (listing): <https://www.playstationcountry.com/null-drifter-ps4-review/>
- PA Blasteroids: <https://www.pixelatedarcade.com/games/blasteroids>
- PGbiz sessions: <https://www.pocketgamer.biz/data-and-research/71692/five-key-takeaways-gameanalytics-h1-2019-mobile-benchmark-report/entry/2/>
- PSLS SSHD: <https://www.playstationlifestyle.net/2008/07/04/super-stardust-hd-trophy-guide>
- Push Square Ultra: <https://www.pushsquare.com/reviews/ps4/super_stardust_ultra>
- Recharged listings (listing): <https://www.nintendo.com/store/products/asteroids-recharged-switch/>, <https://www.trueachievements.com/game/Asteroids-Recharged/reviews>
- Recharged reviews: TheXboxHub <https://www.thexboxhub.com/asteroids-recharged-review/>, Pure Nintendo <https://purenintendo.com/review-asteroids-recharged-nintendo-switch/>, Gamezebo <https://www.gamezebo.com/reviews/asteroids-recharged-switch-review-out-of-this-world/>
- Resogun pages: PlayStation Blog tips <https://blog.playstation.com/archive/2013/11/29/resogun-out-today-expert-tips-for-taking-on-the-leaderboards/>, Gamereactor review <https://www.gamereactor.eu/resogun-review/>
- Session listings (listing): <https://gameindustrylibrary.com/documents/gameanalytics-mobile-gaming-benchmarks-2025>
- SoC tips (the game's own site): <https://spheresofchaos.com/p/tips.php>
- Solaroids listing (listing): <https://www.moddb.com/games/solaroids-prologue/features/twin-stick-support-is-here-everyone-is-now-armed-and-dangerous>
- SSHD listings (listing): <https://forum.blu-ray.com/showthread.php?p=567142>, <https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/SuperStardustHD>
- Static listings (listing): <https://mwmwmw.itch.io/ru226>, <https://digitpenguin.itch.io/staticsock>
- Steam Nova Drift: <https://store.steampowered.com/app/858210/Nova_Drift/>
- VaporLens (weak, machine summaries of Steam reviews): Nova Drift <https://vaporlens.app/app/858210/nova_drift>, Void Scrappers <https://vaporlens.app/app/2005210/void_scrappers>
- VS listings (listing): <https://itch.io/post/6809917>, <https://www.gamesasylum.com/2022/11/25/vampire-survivors-review/>
- XboxHub Null Drifter: <https://www.thexboxhub.com/null-drifter-review/>
- WP tags are English Wikipedia articles, at `https://en.wikipedia.org/wiki/` plus: Asteroids `Asteroids_(video_game)`; Deluxe `Asteroids_Deluxe`; Space Duel `Space_Duel`; Blasteroids `Blasteroids`; Maelstrom `Maelstrom_(1992_video_game)`; Asteroids 98 `Asteroids_(1998_video_game)`; SSHD `Super_Stardust_HD`; Delta `Super_Stardust_Delta`; Spheres `Spheres_of_Chaos`; Sinistar `Sinistar`; Defender `Defender_(1981_video_game)`; Choplifter `Choplifter`; Oids `Oids`; PixelJunk Shooter `PixelJunk_Shooter`; Galaga `Galaga`; Flicky `Flicky`; Sonic 3D `Sonic_3D_Blast`; Gradius `Gradius` and `Gradius_(video_game)`; Star Fox 64 `Star_Fox_64`; GW RE2 `Geometry_Wars:_Retro_Evolved_2`; GW3 `Geometry_Wars_3:_Dimensions`; Resogun `Resogun`; Psyvariar `Psyvariar`; Pac-Man CE DX `Pac-Man_Championship_Edition_DX`; Shatter `Shatter_(video_game)`; Yoshi's Island `Yoshi%27s_Island`; Kirby Mass Attack `Kirby_Mass_Attack`; LocoRoco `LocoRoco`; Pikmin `Pikmin_(video_game)`; Katamari `Katamari_Damacy`; de Blob `De_Blob`; Vampire Survivors `Vampire_Survivors`; 20MTD `20_Minutes_Till_Dawn`
