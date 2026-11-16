# Descriptions and site copy: how game sites, stores and solo developers write about games

Research notes for the text style guide. Collected 2026-11-16.

## Scope and method

The subject is the prose around games: card blurbs, taglines, store descriptions, category descriptions, landing-page copy, portfolio write-ups and small site furniture (404s, footers, empty states). The questions are how long each kind of text is, what shape its sentences take, which words it uses, what it says and what it leaves out.

How the text was collected:

- Every quotation below was fetched in this session. Most pages were fetched as raw HTML with `curl` and the text was extracted locally, so the quotes are the page's own characters and not a model's paraphrase. Steam text came from the store's `appdetails` JSON, and App Store descriptions from the iTunes lookup JSON; both return the listing text verbatim.
- The WebFetch tool, which answers through a small model, was tried only for pages curl could not reach, and it failed on every one of them. So no quotation below has passed through a summarising model.
- Where a site refused the request or returned only an empty shell, the entry says so and nothing is quoted from it. Headless Chrome was tried once each on three blocked sites and met a bot check each time; that was not pursued.
- One statement is from memory and is labelled so (in 4.1).
- Word counts were made by splitting on spaces. "Fragment" means a phrase with no finite verb or no subject; "sentence" means a full clause.
- Typos and odd spacing inside quotes are the source's own ("of of", "ll keep you", "loosing", "dosis").
- Text in square brackets inside quotation marks is a template of mine, such as "[Name] is a [genre] where you …". So are the short pattern names such as "Label: sentence" and "X meets Y". They are not quotations.
- Every quoted string of three characters or more was checked by script against the saved copies of the fetched pages; the only strings not found were those templates.

Reach summary:

| Group                                | Reached                                                                                                                                                                                                                                                            | Not reached                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1. Web game portals                  | Poki, CrazyGames, Coolmath Games, Armor Games, Kongregate, itch.io                                                                                                                                                                                                 | Newgrounds (HTTP 403, then a bot check)                                                                                  |
| 2. Stores                            | Steam (23 games), App Store (12 apps), Google Play (4 apps), Apple Arcade landing page                                                                                                                                                                             | none                                                                                                                     |
| 3. Newspaper and curated homes       | New York Times Games (9 game pages), The Guardian, Puzzmo (8 game pages), The Washington Post, The New Yorker, LinkedIn Games, Apple News+                                                                                                                         | The Atlantic, Merriam-Webster (both behind a bot check)                                                                  |
| 4. Solo developers and small studios | Zach Gage, Orteil, Bennett Foddy, Pippin Barr, Michael Brough, Nicky Case, Lucas Pope, Farbs, Jake Gordon, Terry Cavanagh, grapefrukt, Zachtronics, Draknek & Friends, and 17 more in shorter notes; Simon Tatham's per-puzzle text through a mirror of the source | neal.fun (bot check); Simon Tatham's own page (connection refused); a few sites whose pages hold no text without scripts |

About 50 sites and stores were read in all, and 39 individual store listings within them. The ones read most closely, with several pages each: Poki, CrazyGames, Coolmath Games, Armor Games, itch.io, Steam, the App Store, the New York Times, Puzzmo, the Washington Post, the New Yorker, Tatham, Zach Gage, Orteil, Pippin Barr, Lucas Pope, Farbs, Jake Gordon and Zachtronics.

---

## Group 1: web game portals

### 1.1 Poki

Fetched: https://poki.com/ , https://poki.com/en/puzzle , https://poki.com/en/snake , https://poki.com/en/g/solitaire-ultimate , https://poki.com/en/g/brick-breaker , https://about.poki.com/ , and a made-up URL for the 404.

Site level:

- Title tag: "Free Online Games at Poki - Play Now!"
- Meta description (28 words): "Play free online games at Poki, the #1 website for instant web games. Explore exclusive titles, popular favorites, and new game releases every day - no download needed!"
- Search box prompt, on every page: "What are you playing today?"
- Footer line, on every page: "Let the world play"
- Home page "What is Poki?" (three short paragraphs):
  > Poki is a platform where you can play free online games instantly in your browser. No installs, no downloads, just click and play on any device.
  >
  > We’re a 65-person team based in Amsterdam, building Poki since 2014 to make playing games online as easy and fast as possible.
  >
  > That’s why we don’t just host browser games, we play them too. Every game is tested, tweaked, and genuinely enjoyed by the team to make sure it’s worth your time.
- Home page one-line game blurbs (a list under "Poki exclusive games"), each "Title: sentence":
  > Drive Mad: Control your car over uneven tracks where speed alone won’t save you. Balance and timing matter more than anything. This is the most popular car game on Poki, with a Poki Score of 10/10.
  >
  > Level Devil: Starts simple, then tricks you with fake platforms and sudden traps that catch you off guard.
  >
  > Subway Surfers: A smooth endless runner where dodging trains and obstacles keep your run alive.
  >
  > Retro Bowl: A mix of action and management where every decision affects your progress across a full season.
- Home page one-line category blurbs, same "Name: sentence" form:
  > Puzzle games: Solve puzzles that make you think before you move across 250+ games. Puzzle games test how quickly you can notice what repeats and use it to win.
  >
  > Shooting games: Aim fast and survive long enough to win the round before someone else takes you out. There are 110+ games to explore on Poki. Some games reward accurate aim, others are about how fast you can shoot.

About site (about.poki.com), a different and looser voice:

- Title: "Poki - Let the world play"
- > We let the world play
  >
  > Because play is how we learn. That’s why we’re creating the ultimate online playground. Free and open to all.
- Stats each get a dry aside: "3.5 million hours of play per day" / "Who knew there were that many hours in a day?"; "34 languages localized for fun" / "From Arabic to Zhōngwén. A tailored experience for the whole wide world."
- Button labels are chatty: "Wanna play?", "Let's roll!", "So... what's next?", "Nice...", "Pssst... we're hiring!"

Category page (Puzzle):

- Title tag: "Play Puzzle Games: Think, Solve & Beat Every Level 🧩"
- Meta description: "Sharpen your mind with puzzle games on Poki! Solve brain-teasing challenges online, from matching tiles to logic problems and wordplay. Play now and discover your next favorite brain workout!"
- On-page description, three paragraphs, opening sentence 6 words:
  > Puzzle games challenge your problem-solving skills. In these logic-based games, each challenge has one right answer and your job is to find it.
  >
  > Some challenge you to clear objects on a board before it fills up. Others give you a fixed set of rules or clues and ask you to work through them step by step until only one answer fits.
  >
  > Play 250+ free puzzle games on Poki with types like block games, jigsaws, number puzzles and many more. Just don't be surprised when "one more game" turns into 10!
- Then a "Reason" table, one fragment or sentence per game: "Sort colors at your own pace with no timers or penalties"; "Every number must fit perfectly or the whole board breaks"; "Use logic clues to reveal hidden images step by step".
- Sub-type paragraphs lead with an imperative that states the mechanic: "Place numbers into the correct spots while following strict rules." "Merge 2 matching pieces to create a higher-value one, then keep merging to reach a target tile or score."
- FAQ answers are flat: "Yes. All browser puzzle games are free to play on Poki."

Category page (Snake), same template:

> Snake games put you in control of a long, moving character that must move through tight spaces, tricky paths or crowded arenas without crashing.
>
> Some games are about growing as long as you can, while others make you solve levels, or survive against other players.
>
> Play 20+ free snake games on Poki and test how long you can last.

Game page, new template (Solitaire Ultimate, released October 2026):

- Title tag: "Solitaire Ultimate - Play Online for Free! | Poki"
- Meta description: "Play Solitaire Ultimate on the most popular website for free online games! Poki works on your mobile, tablet, or computer. No downloads, no login. Play now!" (boilerplate; the same sentence with the game name swapped in)
- Lede (40 words, two sentences, no closing full stop in the fetched text):
  > Solitaire Ultimate is a card game where you sort cards to clear the table in Klondike, Spider or FreeCell. Every deal has a solution, with hints and Undo to help you find your next move and build a winning streak
- "How to play Solitaire Ultimate", three paragraphs, imperative and second person:
  > Clear the cards by moving them into the order required by your chosen game. Click or tap a card to play, or drag it where you want it to go. The game highlights your first moves to show where cards can go.
  >
  > Before moving a card, check what's underneath it and where it can go next. In Klondike, moving a stack might uncover a face-down card.
- Features as "Label: sentences" bullets, labels in sentence case with numerals: "3 solitaire games: …", "Daily Challenge: Play a new card layout each day, with the same cards for every player.", "Unlockable card designs: Winning unlocks 25 styles across card backs, card faces and table colors."
- In-game labels are quoted and capitalised as they appear on screen: "Draw 1", "Draw 3", "Daily", "Style", Undo.
- Controls line: "Click or tap to play!"
- FAQ: "How do you turn hints off?" / "Go to the menu option and toggle "Show where cards go" off."

Game page, old and new text side by side (Brick Breaker, released 2019):

- New lede (42 words): "Launch a ball upward and smash through row after row of bricks before any of them reach the bottom of the screen. Keep the ball in play with your paddle, clear every level and don't let a single brick get past you."
- Older paragraph still under it (40 words): "Showcase your Arkanoid skills in Brick Breaker! Move the paddle left and right to keep the ball in play. You must react quickly to hit the ball as it bounces on every wall. The goal is to clear every brick!"
- Meta description, older still: "Brick Breaker invites you to a vibrant arcade game where you destroy colorful blocks. Aim precisely, bounce balls strategically, and clear each level. Break through now!"
- Controls line contradicts the rest: "Move the spaceship using your mouse or finger."

404: the title tag is "404 not found" and the meta description is "Sorry, the page you requested does not exist on this site." The body shows only the normal navigation; no message of its own was in the fetched HTML.

Shape and habits:

- Ledes are two sentences, 40 to 42 words. The newer ones open either "[Game] is a [genre] game where you [verb]…" or with a bare imperative; the second sentence adds one reassurance or one stake.
- Second person throughout; imperative for instructions. Contractions are used ("don't", "won't", "you'll").
- Numerals always, including small ones ("3 solitaire games", "5 most popular", "2 matching pieces"), and "N+" for counts ("250+ games").
- Exclamation marks survive in title tags, meta descriptions and older text; the newer body copy has almost none (one per page, on a joke).
- Emoji only in title tags and star ratings.
- The claims are countable where the old text's were adjectives: "Every deal has a solution" against "vibrant arcade game".
- The three layers on one page (meta, new lede, old paragraph) show the site's own shift from invitation-and-adjective copy to goal-and-mechanic copy.

### 1.2 CrazyGames

Fetched: https://www.crazygames.com/ , /c/card , /c/arcade , /game/classic-solitaire , /game/atari-breakout , /game/daily-solitaire-challenge , https://about.crazygames.com/ , and a made-up URL for the 404.

Site level:

- Title tag: "Free Online Games on CrazyGames | Play Now!"
- Meta description (22 words): "Play free online games at CrazyGames, the best place to play high-quality browser games. We add new games every day. Have fun!"
- About site meta: "CRAZYGAMES.COM - The go-to browser game platform, just play!" and headline "Where 60 million players come to play the best browser games."
- Home page shelves each carry a heading and a one-line subtitle. These are the most hand-written lines on the site:
  - "Train your brain" / "Puzzles and challenges that keep you thinking"
  - "Adrenaline rush" / "Buckle up. Pure action, reflexes, and adrenaline"
  - "With friends" / "Friends welcome. Rivalry encouraged."
  - "5-minute fun" / "Quick games made for your next break"
  - "Timeless classics" / "Get nostalgic with games everyone grew up with"
  - "Just relax" / "Sit back and enjoy the moments where everything clicks"
  - "Deep progress" / "Deep games with progression you'll want to master"
  - "Leaderboards" / "Compete with other players and reach the top"
- Team bios on the about page are joke job titles: "Founder and browser game guru", "Tech shaman", "Head gamer", "Frontend magician".

Category pages:

- Card, title tag: "Free Card Games Online ♥️♣️ Play on CrazyGames". Intro (20 words): "Play a range of fun card games in your web browser, featuring classics like rummy, poker, solitaire (patience), and Uno!"
- Card, first body line: "Shuffle yourself into some fun and enjoy free online card games — no hassle, no downloads, just pure fun on your browser or phone."
- Card, meta description, in Title Case: "Play the Best Online Card Games for Free on CrazyGames, No Download or Installation Required. 🎮 Play Spider Solitaire and Many More Right Now!"
- Arcade, intro in Title Case (25 words): "Experience the Golden Age of Arcade Games for Free in Your Browser. From Retro Classics to Modern Hits, Find Addictive Arcade Games in This Collection."
- Category bodies are essays that name-drop games so each name can be a link: "And who doesn't like the addictive lure of an endless game like Helix Jump or Drift Boss?" One heading on the Card page is mislabelled "Browse Our Puzzle Games".
- FAQ definition: "Card games are played using playing cards and are split into various main categories."

Game pages:

- Classic Solitaire (portal-written, released 2019), opening:

  > Classic Solitaire game - the time-tested card game.Classic Solitaire brings all the fun and enjoyment of this iconic card game to your web browser. The rules and gameplay remain the same – you have to move your cards around and try to match them by suit and number. This version of solitaire is fun to play and easy to pick up.
  >
  > Of all the free games available, this is certainly one of the best.

  It goes on: "Users can have hours of fun playing this classic card game. If you are bored or want to pass some time, why not play classic solitaire…" and ends "This free online title is fantastic and the game of classic solitaire ll keep you entertained for hours." Features list: "A fun and classic Solitaire to play", "Three game modes", "An undo button feature". Controls: "Drag left mouse button to move the card."

- Atari Breakout, opening (55 words, three sentences):

  > Atari Breakout is an updated version of the legendary Breakout game by Atari. The aim of the game is to bat the ball at the colored blocks until there are none left, while making sure the ball does not pass your paddle. Enjoy this classic game with power-ups to boost you to the next level.

  Then "How do you Play Atari Breakout?", "Game Modes", "About Atari Breakout" (a history paragraph: "Atari Breakout is a retro arcade game produced in 1976…"), "Game Tips".

- Daily Solitaire Challenge (developer-supplied, 2026):
  > Daily Solitaire Challenge puts a fresh spin on classic Klondike Solitaire. Rather than simply completing deals, each day introduces a unique challenge that puts your strategy, planning, and card management skills to the test.
  >
  > With guaranteed solvable decks, smooth and responsive controls, and a clean, premium interface, the game offers a refined solitaire experience. Whether you’re a casual player or someone who enjoys thoughtful, strategic gameplay, Daily Solitaire Challenge delivers a satisfying daily puzzle to master.

404:

> GAME OVER
>
> Oops, you've reached a dead end!
>
> The page you're looking for doesn't exist.
>
> Go back home
>
> ...or try some of our most popular games:

Shape and habits:

- Game descriptions open "[Game] is a/an [adjective] [genre]…" or "[Game] puts a fresh spin on…". The game's name is repeated in almost every paragraph and every heading ("How do you Play Atari Breakout?", "About Atari Breakout"); in the Classic Solitaire text the phrase "classic solitaire" or "Classic Solitaire" appears five times in four short paragraphs.
- Third person for the game ("the game offers", "Users can have hours of fun"), second person for the instructions.
- Superlatives are routine and unsupported: "certainly one of the best", "fantastic", "legendary", "iconic", "time-tested", "Addictive".
- The "Whether you're a casual player or someone who…" sentence and the triplet "strategy, planning, and card management skills" are the marks of filler.
- Title Case is used for whole sentences in meta descriptions and one category intro.
- Emoji in every title tag.
- The 404 and the shelf subtitles are in a different, lighter voice than the game and category bodies.

### 1.3 Coolmath Games

Fetched: https://www.coolmathgames.com/ , /0-snake , /0-minesweeper , /0-atari-breakout , /c/classic-games , /c/card-games , and a made-up URL for the 404. Category bodies are rendered by script; their descriptions were read from the page's metadata and embedded JSON.

Site level:

- Title tag: "Cool Math Games - Free Online Games for Learning and Fun"
- Meta description (41 words): "Coolmath Games is a brain-training site for everyone, where logic & thinking & math meets fun & games. These games have no violence, no empty action, just a lot of challenges that will make you forget you're getting a mental workout!"
- Other self-descriptions in the page data: "Coolmath Games is the leading online games portal for learning and critical thinking games." and "Free online math games, cool puzzles, and more".

Category descriptions (one or two sentences):

- Classic: "Whether you’re in the mood for Checkers, Chess, Snake or Asteroids, this free collection of games will take you back to the good old days."
- Card: "Shuffle the cards up and start playing one of the many fun card games here at Coolmath Games. From classics to modern games, there is tons of variety."
- Card, playlist text: "Take game night to the next level with our card games playlist! Here you will find fast-paced games like Crazy Eights and 31. Along with this, you can also play classic card games like Solitaire and Hearts."

Game pages:

- Snake. Title tag: "Snake Game - Slither Your Way to Success". Meta description (28 words): "Play snake game online, the classic retro arcade game. Chase after the apples but don't hit the wall, or eat your own tail. How long can you survive?"
- Snake, "How to Play Snake" (37 words, then a paragraph on what is different):
  > Eat as many apples as you can to grow as long as possible. Use the arrow keys to control your Snake and the spacebar to pause. Be careful not to hit the wall or eat your tail!
  >
  > Coolmath’s Snake game is different from most. When you eat an apple, your tail grows by four blocks instead of the usual one. The Snake also moves quicker than the classic game, so you’ll have to think fast! How long can you survive?
- Snake, tips headings are imperatives of two to four words: "Master the sharp turns", "Be patient", "Hug the wall", "Utilize the zig-zag", "Stay Focused".
- Minesweeper, meta description (28 words): "Play a classic game of Minesweeper online now. Search tiles to uncover clues, figure out where all the mines are, and flag all of the mines to win."
- Minesweeper, instructions:
  > The goal of Minesweeper is to clear all of the squares on the board that don’t have mines, and flag all of the mines. Left-click your mouse to reveal hidden squares. Use the numbers you find to figure out where the mines are: each number tells you how many of the surrounding 8 tiles (up/down, left/right, or diagonal) are mines. Once you've figured out where a mine is, right-click to place a flag there. How fast can you clear the entire board?
- Atari Breakout, meta description (28 words): "Break the boxes and don't lose the ball in four different modes of the classic Atari Breakout. What's the highest score you can get in this old-school game?"
- Atari Breakout, mode notes: "Standard Breakout, but you have to bounce TWO balls at once. Twice as much to think about."
- Each page credits a person: "Game content reviewed by Jonathan Keefer".
- A plain-spoken notice: "This game is exclusively available through a publisher who has built ads into the game files. Because of this, we are unable to remove the ads for subscribers, like we do for all the other pages of the site."

404: "Oops – We couldn't find that page" then "Want to try something else? Some games you might like:".

Shape and habits:

- Each of the three games is given its goal as an imperative or as "The goal of [game] is to…" (Snake and Minesweeper in the body, Breakout in its meta description), then the controls. Each has a closing question somewhere: "How long can you survive?", "How fast can you clear the entire board?", "What's the highest score you can get in this old-school game?"
- All three meta descriptions are 28 words in two or three sentences. Two open "Play…" and two end on the question.
- The Minesweeper instructions are one 82-word paragraph that holds the goal, both controls, the number rule and the question.
- "we" for the site, "you" for the player; contractions throughout; the tone is a patient teacher ("Not to worry though, we have some beginner tips to help out!").
- The game's name is treated as a proper noun for the thing on screen: "your Snake", "the Snake's ultimate move".
- Numerals are mixed: "four blocks", "four different modes", but "8 tiles", "4 different modes" in the same site.
- One exclamation mark per paragraph is normal.
- The long tail under the lede (tips, strategy, FAQ, "What You Learn") is where the search padding sits; the opening 30 to 40 words are tight.

### 1.4 Armor Games

Fetched: https://armorgames.com/ , /category/puzzle-games , three game pages (/ducky-sokoban-dx-game/19731 , /frogs-arent-fresh-game/19721 , /how-hungry-game/19729), and an old URL that now returns the 404.

Site level:

- Title tag: "Play Free Games Online at Armor Games"
- Meta description: "Play free online games at Armor Games! We're the best online games website, featuring shooting games, puzzle games, strategy games, war games, and much more..."
- News post, in the site's own voice: "Hello Friends! We have just released our newest collection of Flash games for Steam, the Sushi Cat Legacy Collection."

Category description (Puzzle), 45 words, written with some relish:

> Prepare to achieve greatness with these tricky titles or scratch your head in dismay. Puzzle games can bamboozle the best of us, so be sure to have a sharp mind and an adventurous spirit before testing your skills against any of the games included here.

Game pages. The description is the developer's own text; the portal wraps it in a fixed prefix for search ("Ducky Sokoban DX, a free online Puzzle & Skill game brought to you by Armor Games.").

- Ducky Sokoban DX:
  > Ducky Sokoban DX is a colorful recreation of of the classic box-pushing puzzle game, "Sokoban." The object of the game is to place each piece of bread on a basket. Each basket can hold only one piece of bread. When all baskets are filled, you win!
  >
  > Ducky comes with a somewhat wide selection of level packs from Sokoban history around the internet, with individual puzzles ranging from easy to devilish. I've tried to sort the included packs such that easier ones are closer to the top!
  >
  > If you've never played a Sokoban game before, I recommend "Microban" as a good starting point.
- How Hungry?:
  > Hans the Horse is very hungry. In fact, he’s so hungry that he could eat a... carrot! And it’s your job to feed him.
  >
  > In this silly block‑pushing game, you will help Hans get all the treats on each island. Sounds simple, but hold your horses just yet! Think through your steps first. It’s quite a thinky game!
  >
  > There are 36 levels, and each of them is a clever hand‑crafted brain teaser.
- Frogs Aren't Fresh: "Frogs Aren't Fresh is a cozy, logic puzzle game, where you complete increasingly complex laundry orders! Take your time, and figure out the placement order to make sure everyone gets their clothes the way they like them." Its demo list ends on a joke item: "5. Lots of laundry..."
- Controls are written as a key list: "Z to undo a move. hold to rewind faster!"; "Z or Right Click = Undo;" "R = Restart the level. You can undo a restart."

404:

> 404: Oh Noes!
>
> The page requested was not found! If you're looking for a game, try using the search box in the header or visiting the search page.
>
> Sushi Cat gets lost sometimes, too.
>
> But he always finds his way back by browsing new games.

Shape and habits:

- Developer descriptions are three short paragraphs: what it is (or a character hook), how much of it there is, one personal aside. First person singular appears ("I've tried to sort…", "I recommend…").
- Honest hedges that portal copy never uses: "a somewhat wide selection".
- Numbers are concrete: "36 levels", "12 mind-bending levels", "30-60 minutes of gameplay".
- The 404 uses a house character and still gives the practical way out first.

### 1.5 Kongregate

Fetched: https://www.kongregate.com/ (redirects to /en) and /en/puzzle-games. A game page URL guessed from the old scheme redirected to the home page, so no game description is quoted.

- Title tag: "Play Free Online Games on Kongregate – The Ultimate Gaming Platform"
- Meta description and footer line (17 words): "Kongregate is a portal for free online games that features user-created content, chat, badges, and player achievements."
- Home page welcome block:
  > Looking for the best place to play free online games? Kongregate offers thousands of games across genres, from action-packed shooters to immersive role-playing adventures. Whether you enjoy competitive strategy games, fast-paced arcade thrills, or relaxing puzzles, we have something for every gamer.
  >
  > Kongregate is also a hub for indie developers, featuring unique games you won’t find anywhere else. Support independent creators and explore hidden gems that redefine online gaming. New titles are added weekly, so there’s always something fresh to play.
  >
  > Start exploring our massive game library now and find your next gaming obsession on Kongregate!
- Category header (Puzzle): "Explore our collection of Puzzle games. From classics to new releases, find your next favorite game." Meta: "Enjoy hand-picked Puzzle games. Play free in your browser, earn badges, and compete on leaderboards only on Kongregate."
- Category essay, opening: "Puzzle games have challenged curious minds for centuries. Early jigsaws and crosswords set the stage, then classics like Tetris carried that spirit to screens worldwide."
- Empty search field: "Search for your favorite games..."
- Cards carry no blurb: title, star rating, play count ("368.3K plays") and an emoji tag ("⭐ Top", "🔥 Hot").

Shape and habits: the older one-line self-description is a plain definition with a four-item list. The newer welcome block is the purest boilerplate in the set: a rhetorical question, a "from … to …" range, "Whether you enjoy … we have something for every gamer", "hidden gems", "redefine", "your next gaming obsession". Nothing in it could not be said of any other portal.

### 1.6 itch.io

Fetched: https://itch.io/ , https://itch.io/docs/general/about , a made-up URL for the 404, the tag pages /games/tag-arcade , tag-puzzle , tag-card-game , tag-solitaire , tag-breakout , tag-minesweeper , tag-snake , and the game pages kenney.itch.io/kenney-solitaire , renanlecaro.itch.io/breakout71 , pawn-games.itch.io/minesweeper , hempuli.itch.io/a-solitaire-mystery , managore.itch.io/breaker , sirmilkman.itch.io/two-table-solitaire , krystman.itch.io/breakout-hero .

Site level:

- Title tag: "Download the latest indie games - itch.io"
- Home page line (14 words): "itch.io is a simple way to find and share indie games online for free."
- Social description: "itch.io is a simple way to find, download and distribute indie games online. Whether you're a developer looking to upload your game or just someone looking for something new to play itch.io has you covered."
- About page, opening: "itch.io is an open marketplace for independent digital creators with a focus on independent video games. It’s a platform that enables anyone to sell the content they've created." Later: "We're not your typical digital storefront…" and, on the pricing risk, "You might be thinking “that sounds pretty risky, what if everyone sets it to zero?” That’s a risk we're willing to take…" Signed "Thanks, — The itch.io team".
- Tag page footer line: "Explore games tagged solitaire on itch.io · Upload your games to itch.io to have them show up here."
- Empty tag description: "Suggest description for this tag".
- 404: "We couldn't find your page" with one link, "Go to itch.io", and an art credit.

Card blurbs. Each game card shows a title, an optional one-line blurb written by the developer, the author and a genre tag. Across the seven tag pages above (first page of each, 243 distinct games):

- 231 of 243 have a blurb; 12 leave it empty.
- Length: median 7 words, mean 7.8, range 1 to 20. 88 are five words or fewer, 89 are six to ten, 40 are eleven to fifteen, 14 are longer.
- Closing punctuation: 118 none, 69 full stop, 40 exclamation mark, 4 question mark.
- Opening word: 79 start with an article ("A", "An", "The"), 66 of them with "A". The next most common openers are the genre nouns themselves ("Minesweeper" 9, "Snake" 5, "Breakout" 3). Bare imperatives are a minority ("Break", "Play", "Find", "Stack", "Help").
- 37 use "you" or "your"; 12 start lower-case; 6 use emoji; 5 contain "classic", "addictive", "best" or "fun".
- 21 are built on a named cross ("X but Y", "X meets Y", "X + Y").

Blurbs by formula, all verbatim:

- "A [adjective] [genre]" noun phrase: "A collection of curious solitaires"; "A friendly and forgiving solitaire variant."; "A game of occult solitaire"; "A disobedient solitaire card game"; "A roguelike minesweeper adventure"; "A high speed low-poly racing game."; "A game about colliding and merging balls"; "A carnivorous worm simulator"; "40-card solitaire with multiple game modes"; "Elegant mahjong solitaire with a Playdate spin".
- The cross: "Minesweeper but it's a roguelike."; "Minesweeper meets Dungeon Crawler Roguelike"; "Minesweeper if it was actually about mining"; "The world's only game of Tetris... that's also Minesweeper"; "Sudoku x minesweeper hybrid"; "Breakout + Platformer"; "Automation + Brick Breaker"; "a blend of breakout, space invaders and ikaruga"; "Find the exit in this Nonogram meets Minesweeper puzzle game."
- Imperative, verb first: "Stack monsters into delightful combos."; "Break bricks and buy lots of upgrades!"; "Unlock and upgrade an assortment of brick-breaking balls!"; "Help Bobby sort his bug collection in this variant solitaire"; "Break bricks, catch coins, upgrade, repeat for 7 levels without loosing your one ball."; "Read the clues. Build a kingdom. Fight what you uncover. Minesweeper meets real-time strategy."
- Plain statement of fact: "Minesweeper pure and simple"; "A true to the original Klondike Solitaire game."; "Free Solitaire" / "120 variants, no ads, editor, customizable"; "A PICO-8 Racing Game"; "A smooth & free solitaire experience ♠️".
- Joke or aside: "Mamono Mower" / "Minesweeper-Lawnmowing sim crossover. Finally!"; "Cavern Sweeper" / "Lots of monsters in this here cave, huh"; "Break The Tower" / "Or fall trying."; "Babataire EX" / "Complete nonsense in the spirit of Baba Is You"; "SNAKE SNAKE SNAKE" / "SNAKE WITH MORE SNAKES"; "Serpentes" / "brainmelting snake"; "Snaklipse" / "lunar snake!"; "Uncanny Cat Golf" / "i'm still amazed by it!"

Game page descriptions:

- Kenney Solitaire (38-word opening, then two bulleted lists):

  > Kenney Solitaire offers a completely free & smooth solitaire experience. You can choose between 1-card or 3-card drawing and adjust the theme and visuals. Feel free to share the game with everyone, perfect for those short in-between breaks!

  Features are bare noun phrases: "1-card and 3-card drawing", "Every deal can be completed", "Card & background themes", "Tutorial", "Jazz background tracks", "Auto movement & auto completion". Controls are "Key: Action": "Left click (or spacebar): Interact", "F11: Toggle fullscreen (desktop only)".

- Breakout 71:

  > Break all the bricks, catch all the coins that fall off. At the end of each level, you get to pick an upgrade between 3 choices, that will carry over for all the next levels. If you play well (clear level quickly, always hit something, never miss a coin), you'll get more choices.

  And one line of technical detail in the same breath: "The game is super lightweight, it's all handwritten javascript and mostly procedural."

- Minesweeper (Pawn Games), the whole description: "Just a simple attempt at pixel art and a casual game." / "Like it? Leave a rating :)"
- Two-Table Solitaire: "A friendly variant of solitaire that's designed to be challenging, but still forgiving." / "I hope you enjoy it :)" then "How To Play:" as four rule bullets, each one sentence: "Stack cards by alternating colors with descending values.", "Sort 4 piles of cards ordered from A to K at the top to win".
- A Solitaire Mystery: "A collection of 30 mysterious solitaires, with more potentially being added in the future. The solitaires included vary from fairly standard cardgames to funky reimplementations of other games in solitaire form." Then credits, ending "Game implemented using Löve2D".
- BREAKER (Daniel Linssen), all lower case with capitals for emphasis: "a blend of BREAKOUT, SPACE INVADERS and IKARUGA" / "deflect BLUE bullets while BLUE" / "9 bosses and 3 minibosses" / "30+ unlockable palettes".
- Breakout Hero, "How to Play": "You control the pad at the bottom of the screen. You need to destroy the bricks by hitting them with a ball. If the ball leaves the bottom of the screen you lose." Power-ups as "Colour = Name - effect": "Orange = Slow - Slows down time".

Shape and habits:

- The blurb is a label, not a pitch: most are an article plus a noun phrase, and half have no closing punctuation.
- Developers hedge and shrug: "fairly standard", "Just a simple attempt", "with more potentially being added in the future", "and stuff".
- Features are bare noun phrases, three to five words, no verbs and no adjectives of praise.
- Stack and tooling get one clause, at the end.
- Emoticons (":)") appear where a portal would put an exclamation mark.
- Numerals always: "7 levels", "3 choices", "30 mysterious solitaires", "15 levels".

### 1.7 Newgrounds

Not reached. https://www.newgrounds.com/games and https://www.newgrounds.com/games/browse/genre/puzzle both returned HTTP 403 to curl and to WebFetch, and headless Chrome was given a bot-check page. Nothing is quoted.

---

## Group 2: stores

### 2.1 Steam

Fetched through https://store.steampowered.com/api/appdetails?appids=ID (English, US), which returns the "short description" shown at the top of the store page and beside search results, and the "About this game" body. Store page for any entry: https://store.steampowered.com/app/ID .

Short descriptions, verbatim, with word counts:

| Game (app ID)                                  | Words | Short description                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14 Minesweeper Variants (1865060)              | 6     | "Minesweeper but the rules are changing."                                                                                                                                                                                                                                                                 |
| Hexcells (265890)                              | 12    | "Hexcells is an ambient logic puzzle game for PC, Mac and Linux."                                                                                                                                                                                                                                         |
| ISLANDERS (1046030)                            | 12    | "ISLANDERS is a minimalist strategy game about building cities on colorful islands."                                                                                                                                                                                                                      |
| holedown (1268370)                             | 13    | "Bounce bounce bounce bounce BOUNCE BOUNCE BOUNCE your way to the planet core!"                                                                                                                                                                                                                           |
| Super Hexagon (221640)                         | 14    | "Super Hexagon is a minimal action game by Terry Cavanagh, with music by Chipzel."                                                                                                                                                                                                                        |
| Shatter (20820)                                | 19    | "Shatter is a retro-inspired brick-breaking game that merges familiar action with unique twists and a modern crafted production approach."                                                                                                                                                                |
| A Solitaire Mystery (3743220)                  | 22    | "A collection of mysterious solitaires. The solitaires included vary from fairly standard cardgames to funky reimplementations of other games in solitaire form."                                                                                                                                         |
| Balatro (2379780)                              | 23    | "The poker roguelike. Balatro is a hypnotically satisfying deckbuilder where you play illegal poker hands, discover game-changing jokers, and trigger adrenaline-pumping, outrageous combos."                                                                                                             |
| The Solitaire Conspiracy (1424980)             | 29    | "We need your help, Spymaster. Join a world of near-future spies and take on a supervillain in this supercharged take on classic Solitaire. Precision engineered for replayable espionage action."                                                                                                        |
| The Zachtronics Solitaire Collection (1988540) | 30    | "The Zachtronics Solitaire Collection is here! Inside you will find all seven Zachtronics solitaire games, updated with new 4K graphics, plus one brand new Tarot-themed solitaire variant only available here."                                                                                          |
| SHENZHEN SOLITAIRE (570490)                    | 31    | "NO ENGINEERING, ALL PROCRASTINATION! SHENZHEN SOLITAIRE is a brand-new solitaire variant originally developed for SHENZHEN I/O, and is now available as a standalone game! It's simple but challenging, and oddly addictive."                                                                            |
| Ballionaire (2667120)                          | 31    | "BALLIONAIRE is a fast-paced, kinetic roguelike where strategy meets physics to create outrageous wealth! Find and exploit game-breaking synergies as you theorycraft your way to victory. Welcome to the autobonker genre!"                                                                              |
| Breakout: Recharged (1714190)                  | 32    | "The original brick breaker returns with its toughest challenge yet. Survive as long as you can in arcade or take on one of 50 challenges picking up game-changing power-ups along the way."                                                                                                              |
| BALL x PIT (2062430)                           | 34    | "BALL x PIT is a brick-breaking, ball-fusing, base-building survival roguelite. Batter hordes of enemies with ricocheting balls and gather the riches of the pit to expand your homestead, generate resources and recruit unique heroes."                                                                 |
| Shatter Remastered Deluxe (1937230)            | 39    | "Relive the award-winning classic that redefined the brick-breaking genre. Shatter returns in stunning 4K resolution running at 120fps, with a modernised UI, and multiple visual improvements. Re-experience the highly acclaimed original soundtrack, remixed and remastered in 5.1 surround sound."    |
| Solitairica (463980)                           | 40    | "Solitairica takes RPG combat and challenging roguelike progression to a fresh new place—the world of solitaire! Using a variety of magical items and powerful spells, battle your way through a horde of ever-changing enemies and defeat the horrible Emperor Stuck."                                   |
| Dorfromantik (1455840)                         | 41    | "Dorfromantik is a peaceful building strategy and puzzle game where you create a beautiful and ever-growing village landscape by placing tiles. Explore a variety of colorful biomes, discover and unlock new tiles and complete quests to fill your world with life!"                                    |
| Peglin (1296610)                               | 43    | "Peglin is a Pachinko Roguelike - Fight enemies by collecting special orbs and popping pegs to deal damage. Acquire special relics that radically change the game and ensure no two runs are the same. Aim carefully to survive in this unique turn-based RPG!"                                           |
| Regency Solitaire (351090)                     | 43    | "Experience romantic Regency England in this sumptuous solitaire game. Play your cards right as you tour historic London, Brighton and Bath, and help Bella create a dazzling ballroom. Unlock gameplay features with your makeover project and improve Bella’s chances of finding true love!"            |
| Vampire Survivors (1794680)                    | 44    | "Mow down thousands of night creatures and survive until dawn! Vampire Survivors is a gothic horror casual game with rogue-lite elements, where your choices can allow you to quickly snowball against the hundreds of monsters that get thrown at you. Be the bullet hell!"                              |
| Asteroids: Recharged (1700890)                 | 46    | "How long can you survive the depths of space in this fresh revival of the classic arcade shooter, all while grooving to an original score by Megan McDuffee. Pilot solo or recruit a friend for local co-op across 30 unique challenges or the endless arcade mode."                                     |
| Mini Metro (287980)                            | 51    | "Mini Metro is a strategy simulation game about designing a subway map for a growing city. Draw lines between stations and start your trains running. As new stations open, redraw your lines to keep them efficient. Decide where to use your limited resources. How long can you keep the city moving?" |
| Snakebird (357300)                             | 56    | "Do you like puzzles, fruit and the notion of crossing a snake with a bird for no good reason? If the answer to at least one of those questions is yes, then Snakebird might be the game for you. Solve your way through this headscratcher of a puzzle game and help the snakebirds sate their hunger."  |

Counts over these 23:

- Length: 6 to 56 words; median 31. Six are under 20 words and all six are one sentence.
- The definition sentence "[Name] is a/an [adjectives] [genre] [where/about/that]…" is in 12 of the 23: it is the first sentence in 9 (Hexcells, ISLANDERS, Super Hexagon, Shatter, Ballionaire, BALL x PIT, Dorfromantik, Peglin, Mini Metro) and the second in 3 (Balatro, SHENZHEN SOLITAIRE, Vampire Survivors).
- The other first sentences: 4 are a slogan or announcement ("The poker roguelike.", "NO ENGINEERING, ALL PROCRASTINATION!", "We need your help, Spymaster.", "The Zachtronics Solitaire Collection is here!"); 4 are an imperative ("Bounce…", "Relive…", "Experience…", "Mow down…"); 2 are a question (Asteroids: Recharged, Snakebird); 4 are some other statement or fragment ("Minesweeper but the rules are changing.", "A collection of mysterious solitaires.", "The original brick breaker returns…", "Solitairica takes RPG combat…").
- "a [genre] game about [gerund]" is the quiet indie formula: "about building cities on colorful islands", "about designing a subway map for a growing city".
- 9 of 23 contain an exclamation mark and 6 end on one; 1 ends on a question (Mini Metro). The six shortest have no exclamation mark except holedown, whose whole line is a joke.
- Compound adjectives pile up in the louder ones: "hypnotically satisfying", "game-changing", "adrenaline-pumping", "fast-paced, kinetic", "brick-breaking, ball-fusing, base-building".
- "classic" appears in 3; "unique" in 4; "addictive" once, hedged ("oddly addictive").

"About this game" bodies:

- Length: 12 words (Hexcells, which repeats its short description and stops) to 604 (The Solitaire Conspiracy). Typical is 100 to 300.
- Usual order: one framing paragraph (premise or "X is a…"), one paragraph on what you do, a bulleted feature list, then any note from the developer.
- Mini Metro, 392 words, three plain paragraphs before any list, in present tense and second person, ending on the game's own arc:
  > In Mini Metro, you take on the task of designing the subway layout for a rapidly expanding city. Your city starts with three stations. Draw routes between these stations to connect them with subway lines.
  >
  > …
  >
  > Eventually your network will fail. Stations will open too quickly. Commuters will crowd the platforms. How long the city keeps moving is up to you.
- Balatro: "Balatro is a poker-inspired roguelike deck builder all about creating powerful synergies and winning big." Bullets are fragments: "The definitive poker roguelike experience."; "Endless possibilities - every pick-up, discard and joker can dramatically alter the course of your run."
- SHENZHEN SOLITAIRE, 107 words in all. Four bullets, each ending in an exclamation mark, two of them jokes with a real number inside: "Over 98% of deals are solvable!"; "Win 100 games and become immortal! (with a Steam Achievement)". Then a note telling owners of the parent game not to buy it.
- The Zachtronics Solitaire Collection: each included game gets one definition line, "Name: A [type] where/using…": "Shenzhen Solitaire: A FreeCell-inspired solitaire variant with a three-color deck based on mahjong tiles"; "Cluj Solitaire: An original solitaire variant where you can “cheat” by placing cards wherever you want, so long as you’re careful".
- 14 Minesweeper Variants opens "The title explains what it is." and then numbers its features 1 to 6 as plain sentences: "Every level can be completed by logic. Guessing is not required."; "The hint system tells you where to focus on when you get stuck, while it does not simply tell the solution."
- Super Hexagon follows its one-line description with "Important facts about Hexagons:" and a list of true but useless facts ("Though hexagon may appear to be a difficult word to rhyme, there are actually dozens of words that rhyme with it.").
- Vampire Survivors: one definition ("Vampire Survivors is a time survival game with minimalistic gameplay and roguelite elements."), one mood paragraph ("Hell is empty, the devils are here, and there's no place to run or hide."), then "Starting Tips" as practical bullets: "Take your time to grab gems and items, they won't disappear."
- Peglin gives the comparison outright: "Peglin plays like a combination of Peggle and Slay the Spire."
- ISLANDERS opens with "A quick note from the developers:" and "You want to build beautiful cities without investing hours on end into stressful resource management? Say no more! ISLANDERS should be right up your alley."
- Snakebird: "Snakebird is a very simple but deceptively challenging puzzle game about assuming the right shapes for the task at hand, be it pushing, lifting, teleporting or just defying the laws of physics." Feature bullets begin "Over fifty challenging levels".
- holedown's body is the publisher-style opposite of its tagline: "Dig deep underground by shooting balls and breaking blocks, traversing your way to the planet cores. With limited shots per round and some blocks fixed firmly to the wall, thoughtfully strategize and aim for maximum impact."
- The licensed revivals (Breakout: Recharged, Asteroids: Recharged, Shatter Remastered Deluxe) are the adjective-heavy end: "The grandfather of brick-breaking games is back with some of the toughest challenges yet!"; "will forever change what you expect from a brick-breaking title"; "stunning 4K resolution"; "the highly acclaimed original soundtrack".

Shape and habits:

- Game names are often set in capitals by their own makers (SHENZHEN SOLITAIRE, ISLANDERS, BALL x PIT, BALLIONAIRE) or in lower case (holedown); the store title and the prose agree with each other.
- Numerals for counts in every listing ("50 challenges", "30 unique challenges", "8 difficulties", "10 distinct worlds", "9 unique bosses", "over 20 unusual solitaire cardgames"); Snakebird's "Over fifty" and Zachtronics's "seven" are the only spelled-out counts.
- Feature bullets come in three forms: a bare noun phrase ("Multiple modes to play through including Story, Endless, Boss Rush, and Time Attack Mode."), "Label: explanation", or an imperative ("Collect and upgrade powerful orbs and relics…").
- Solo and two-person developers state a fact and stop (Hexcells, Super Hexagon, 14 Minesweeper Variants). Publisher-backed pages add adjectives and a lore paragraph.

### 2.2 App Store (iPhone and iPad)

Fetched: each app's page on apps.apple.com for the title and subtitle, and https://itunes.apple.com/lookup?id=ID for the description text.

Subtitles (the line under the app name; limit 30 characters):

| App                                           | Seller                | Subtitle                         |
| --------------------------------------------- | --------------------- | -------------------------------- |
| Solitaire (id359917414)                       | MobilityWare          | "Fun Classic Klondike Card Game" |
| Microsoft Solitaire Collection (id1103438575) | Microsoft Corporation | "Play Classic Solitaire Games!"  |
| Sudoku.com - Number Games (id1193508329)      | Easybrain Ltd         | "Logic puzzles and mind games"   |
| Good Sudoku by Zach Gage (id1489118195)       | STFJ LLC              | "Sudoku that loves you"          |
| Flipflop Solitaire (id1256860418)             | STFJ LLC              | "A new solitaire by Zach Gage"   |
| holedown (id1297270249)                       | webbfarbror AB        | "A Ball Bouncer With Depth"      |
| Snake '97: retro phone classic (id438052745)  | dsd 164 B.V.          | "Play Snake like it's 1997!"     |
| Ballz (id1139609950)                          | Ketchapp              | "Bounce balls and break blocks"  |
| Bricks Breaker Quest (id1288430163)           | MOBIRIX               | "Relax your mind!"               |
| Minesweeper Q (id421576027)                   | Yi-Lun Lin            | "The classic puzzle game"        |

All ten are three to six words. Six are noun phrases, four are imperatives. The big publishers' subtitles are keyword strings in Title Case ("Fun Classic Klondike Card Game"); the small developers' are a claim with a point of view ("Sudoku that loves you") or a pun ("A Ball Bouncer With Depth").

Descriptions, opening lines:

- Solitaire, MobilityWare (635 words):

  > Solitaire by MobilityWare is the ORIGINAL maker of Solitaire free for iPad and iPhone. After more than 10 years on the App Store we are STILL improving our card game with fun new features. Make sure to try out our unique Daily Challenges!
  >
  > The addictive game you’ve been playing on your computer for years now goes wherever you do. Whether you know it as Patience, Klondike, or just Solitaire, this popular game is one of the best games around.

  Sections are marked "== How to Play ==" and "== Features ==". The how-to is clear and short: "Tap or drag cards to arrange them in descending order with alternating colors. When you can, move cards up to the foundation to sort all of the suits from Ace to King." Features are "Label: benefit": "Winning Deals: Play deals where you know there is at least one winning solution".

- Microsoft Solitaire Collection (402 words):

  > Join millions of players worldwide in the most played Solitaire game in history - now featuring MORE great games to play!

  Bullets: "5 favorite Solitaire game modes", "5 NEW Challenges every day", "Choose your Difficulty". Feature names are capitalised as proper nouns: Daily Challenges, Weekly Rewards, Events, Trophies, Achievements, Difficulty. Closing claim: "With so much to play, Microsoft Solitaire Collection is the perfect app for anyone."

- Sudoku.com, Easybrain (285 words):

  > Have fun and train your brain with one of the most downloaded sudoku apps in the AppStore! Millions of people play sudoku daily and it’s truly a game for everyone! The Sudoku.com app has thousands of classic sudoku puzzles to help you keep your brain active, unwind from stress or relax. Install to play now!

  One line worth keeping from it: "Playing Sudoku.com on mobile is as good as with a pencil and paper."

- Good Sudoku by Zach Gage (656 words):

  > You’ve never played Sudoku like this.
  >
  > Good Sudoku turns your iOS device into an AI powered Sudoku genius whose only mission is to help you learn and love this classic game.
  >
  > Whether you’ve never tried Sudoku, or you play every day, Good Sudoku’s elegant layout, intelligent hint system, and busywork reducing tweaks will help you play better and have more fun.

  Bullets are plain: "Optional tools to reduce busywork", "5 levels of difficulty". Then a first-person-plural section: "We put everything we could into making the best digital Sudoku game ever released:" followed by what was actually built ("We wrote a puzzle generator from scratch to create over 70,000 of the highest quality puzzles you’ll see anywhere. We spent weeks figuring out how to generate intricate and complex puzzles you won’t find in other Sudoku apps.").

- Flipflop Solitaire, Zach Gage (468 words), set as short separate lines:

  > From the creator of Sage Solitaire, comes a new Solitaire variant that breaks all the rules!
  >
  > 100% of deals are solvable!
  >
  > Like its footwear namesake — Flipflop Solitaire is unrestrictive, creating a new game for fans of spider, klondike and other traditional Solitaires.
  >
  > In Flipflop you can stack down, up, or even both ways on a single stack!
  > Need to stack an 8 on a 7, or a club on a spade? No problem!
  >
  > - but -
  >
  > Be careful, you can only move a stack of a single suit!
  > It's fun and freeing, but still challenging and captivating.
  >
  > It's Flipflops for your brain.

  Section headers are jokes: "------WHATS IN THE “BOX”?"

- Minesweeper Q, a one-person app (240 words):

  > Classic Minesweeper game for iOS.
  > Standard game rules with best, smoothest, very fast interface.
  >
  > We will keep our best to improve this game, since we are also devotees of minesweeper !

  Features are bare fragments: "First tap luck", "3 classic difficulty", "Fully configurable, board size & number of mines.", "Fast launch time".

- Snake '97, a small studio (233 words):

  > Play Snake like it is 1997. This is a remake of the original Snake, complete with dot-matrix display and monotone sounds.
  > Rewind time and get a dosis of nostalgia that is as addictive (and frustrating) as the original.
  >
  > Play Snake '97 and be prepared to lose some productive hours.

  Features with asides in brackets: "original monotone sounds (bleep bleep)", "go through the walls! (Snake 2)", "a high score that cannot be reset (just like…".

- holedown (197 words): the same publisher-style paragraph as on Steam.
- Bricks Breaker Quest, MOBIRIX (214 words). Opens "Relax your mind!" then "How to play" as four one-line rules: "The ball flies to wherever you touched.", "Break the bricks and never let them hit the bottom.", "Find best positions and angles to hit every brick." Features: "Tons of stages", "Easy to play, Simplest game system, Designed for one handheld gameplay."
- Ballz, Ketchapp (103 words): "Relax your brain with the champion of time killer!" then "Swipe your finger to throw the balls and break the bricks." and "Very easy to play but very hard to reach high scores. Don't forget the angle is the key point!"
- Simon Tatham's Puzzles, iOS port by Greg Hewgill (95 words): "This is a collection of 38 single-player puzzle games for the iPhone and iPad. Included games are:" followed by the names, separated by hyphens, and nothing else.
- Solitaire Stories, an Apple Arcade title (300 words): "Welcome to Solitaire Stories, home of the world’s greatest card game! Solitaire Stories offers all of the classic gameplay that fans of the card game have come to know and love…" and "But why stop there?"

Shape and habits:

- Big-publisher listings: 285 to 635 words; capitals for emphasis (ORIGINAL, STILL, MORE, WINS, NEW, FREE); "millions of players"; "one of the best"; "addictive"; "train your brain"; a call to install; a feature list of branded nouns; a subscription upsell block.
- Small-developer listings: 95 to 250 words; a one-sentence definition; a fragment list; sometimes non-native English left as it is; one human line ("since we are also devotees of minesweeper").
- Zach Gage's listings are long but read as a person talking: a short hook line on its own, one concrete rule explained by example ("Need to stack an 8 on a 7, or a club on a spade? No problem!"), a real number ("100% of deals are solvable!"), and a section on how the game was made, in "we".
- The how-to-play text is the best writing in the publisher listings: one or two imperatives that state the whole rule.

### 2.3 Google Play

Fetched: https://play.google.com/store/apps/details?id=PACKAGE&hl=en_US for com.mobilityware.solitaire, com.microsoft.microsoftsolitairecollection, com.easybrain.sudoku.android and name.boyle.chris.sgtpuzzles.

Short descriptions (the one-liner under "About this game"; limit 80 characters):

- Solitaire - Classic Card Games (MobilityWare): "Classic Solitaire Game - Play Original Klondike Solitaire Card Games to Relax"
- Microsoft Solitaire Collection: "Enjoy classic Solitaire game modes plus fun match-3, arcade & puzzle games!"
- Sudoku.com - Sudoku Puzzle (Easybrain): "Sudoku puzzle games with number challenges for brain and logic training!"
- Simon Tatham's Puzzles (Chris Boyle's Android port): "40 classic single-player logic puzzles, playable offline, generated on demand"

Long descriptions, openings:

- MobilityWare: "Solitaire by MobilityWare is the original & best free Solitaire card game!" then "Experience the timeless fun of Solitaire with MobilityWare’s Solitaire game, the most popular and original Solitaire card game on the Play Store. Join over 100 million Solitaire players enjoying the ultimate Solitaire card game experience." Bullets use suit symbols and repeat the keyword in every line: "♠ Use Solitaire hints and unlimited undos to enhance your Solitaire card games skills." "♠ Effortlessly move Solitaire cards with intuitive tap and drag controls." "♥ Replay daily deals for endless classic Solitaire fun and rewards!" The word "Solitaire" appears 5 times in the two-sentence second paragraph.
- Easybrain: "Sudoku free puzzle is a popular classic number game to train your brain. Solve daily sudoku and have fun! Thousands of number games to explore. Install the sudoku free app to start now!" The phrase "sudoku free puzzle" is used as if it were a noun.
- Microsoft: identical to its App Store text.
- Simon Tatham's Puzzles (the whole description is four short paragraphs):
  > This is Simon Tatham's open-source collection of 40 single-player logic puzzle games, ported to Android. It will always be free, with no ads, and playable offline.
  >
  > See the screenshots for the full list of 40 different games. They're all generated on demand with adjustable size and difficulty, so you'll never run out of puzzles.
  >
  > Various control options for small screens: on-screen arrow keys (can be enabled in Settings), pinch to zoom, and a button to swap press/long-press.
  >
  > Beta testers welcome! Join beta tests with the button on this listing.

Shape and habits: the Play Store text of the big publishers is the most keyword-stuffed writing in this whole study; the same publisher's App Store text is cleaner, which shows the padding is written for the store's search and not for the reader. The open-source port says what it is, what it will never do, and how to get help, in 80 words.

### 2.4 Apple Arcade landing page

Fetched: https://www.apple.com/apple-arcade/ .

- Meta description (26 words): "Apple Arcade is a game subscription service with hundreds of fun games — all without ads or in-app purchases. Share with up to five family members."
- Headline tiles: "Fun for all. All on iPhone." / "Enjoy hundreds of games." / "No ads. No in-app purchases. No interruptions."
- Section head: "Action. Adventure. Puzzles. Let the gaming begin."
- Body: "Apple Arcade gives you unlimited, uninterrupted access to the games you love. Brainteasers, magical quests, endless runners, action-packed sports, beloved classics, and more — with amazing new releases and updates added all the time. It’s the most fun place on your phone, ready to enjoy whenever and wherever."
- FAQ head: "Questions? Answers."
- Feature paragraphs start with a bold imperative of two or three words and then explain: "Game your way. Explore titles curated just for you." "Play with friends. Experience social features that make gaming more fun."

Shape and habits: very short declarative fragments with full stops, in threes ("No ads. No in-app purchases. No interruptions."); the promise is stated as what is absent; em dashes join a list to its payoff; spelled-out small numbers ("up to five people"); no exclamation marks at all.

---

## Group 3: newspaper and curated game homes

### 3.1 The New York Times Games

Fetched: https://www.nytimes.com/crosswords (the hub; game cards are drawn by script and were not in the HTML) and the pages of nine games, whose description metadata was read: /games/wordle/index.html , /games/connections , /games/strands , /puzzles/spelling-bee , /puzzles/sudoku , /puzzles/tiles , /puzzles/letter-boxed , /games/pips , /crosswords/game/mini .

One-line descriptions (from each page's description tags):

| Game            | Words | Description                                                                                                                       |
| --------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| Wordle          | 14    | "Guess the hidden word in 6 tries. A new puzzle is available each day."                                                           |
| Connections     | 14    | "Group words that share a common thread. A new puzzle is available each day."                                                     |
| Strands (short) | 8     | "Find hidden words and uncover the day’s theme."                                                                                  |
| Strands (long)  | 23    | "The objective? Use every letter on the board to find today’s linked words plus their hidden theme. A new puzzle is added daily." |
| Spelling Bee    | 9     | "How many words can you make with 7 letters?"                                                                                     |
| Sudoku          | 11    | "This popular logic puzzle is a numbers game, minus the math."                                                                    |
| Tiles           | 10    | "Have a stress-free moment, courtesy of our soothing matching game."                                                              |
| Letter Boxed    | 17    | "Create words using letters around the square. Solve the puzzle in as few words as you can."                                      |
| Pips (short)    | 11    | "Every domino has a spot. Can you find where each belongs?"                                                                       |
| Pips (long)     | 20    | "Find the right spot for every domino in this relaxing game for all skill levels. New puzzles are added daily."                   |
| The Mini        | 17    | "All the fun of the larger New York Times Crossword, but you can solve it in seconds."                                            |

Title tags mostly give the name alone ("Wordle — The New York Times"); two carry a tagline: "Strands: Uncover Words." and "Play Pips, our new dominoes game."

Site level:

- Subscription line: "Upgrade your downtime with full access to The Crossword, The Mini, Spelling Bee and more."
- "About New York Times Games", on every game page (55 words):
  > Since the launch of the Crossword in 1942, The Times has captivated solvers by providing engaging word and logic games. In 2014, we introduced the Mini Crossword — followed by Spelling Bee, Letter Boxed, Tiles, Wordle, Connections and more. We strive to offer puzzles for all skill levels that everyone can enjoy playing every day.
- Hub meta description, visibly older: "Play the Daily New York Times Crossword puzzle edited by Will Shortz online. Try free NYT games like the Mini Crossword, Ken Ken, Sudoku & SET plus our new subscriber-only puzzle Spelling Bee."

Shape and habits:

- 8 to 17 words for the short form; one or two sentences, always complete, always with a full stop or question mark. No exclamation marks in any of the eleven.
- Four of the nine games lead with an imperative that is the whole rule (Wordle "Guess", Connections "Group", Strands "Find", Letter Boxed "Create"), and Pips does in its longer form. Spelling Bee is a question, and the short Pips line ends on one. Three describe the feeling or the positioning instead of the rule (Sudoku, Tiles, The Mini).
- Numerals for the facts of the game: "6 tries", "7 letters".
- The second sentence, when there is one, is about cadence ("A new puzzle is available each day."), not about quality.
- Game names are proper nouns with capitals, and the big ones take the article: The Crossword, The Mini.
- People are named: "Edited by Sam Ezersky".

### 3.2 The Guardian

Fetched: https://www.theguardian.com/crosswords .

- Title tag: "Crosswords | Online and free | The Guardian"
- Meta description: "Free crosswords that can be completed online by mobile, tablet and desktop, and are printable. Daily easy, quick and cryptic crosswords puzzles."
- The hub describes nothing. Each puzzle is a type label and a serial number: "Quick crossword No 17,638", "Cryptic crossword No 30,165", "Quiptic crossword No 1,408", "Sudoku 7,524 easy", "Killer sudoku 1,048".
- The one promotional line on the page: "Play the Guardian's daily word game and share your score with your friends" with a button "Play Wordiply".
- Help text is plain and names the address: "For technical problems email userhelp@theguardian.com".
- Prize results are a list of names and towns: "Jude Barker, Nottingham".

Shape and habits: sentence case for everything, including puzzle types after the first word ("Quick cryptic", "Killer sudoku"); numbers with thousands separators; no adjectives. The assumption is that a reader who wants a cryptic knows what one is.

### 3.3 Puzzmo

Fetched: https://www.puzzmo.com/today and the game pages /game/spelltower , /game/pile-up-poker , /game/typeshift , /game/crossword , /game/really-bad-chess , /game/bongo , /game/memoku , /game/circuits . The pages /about, /games and /manifesto returned an empty shell. Two guessed slugs returned the not-found page.

Site level:

- Title and footer line: "Puzzmo — The place for thoughtful puzzles."
- Meta description: "Play the best daily puzzles on Puzzmo"
- First-visit prompt: "Play your first game!"
- A featured game's card: "(not) solitaire" / "A passively massively multiplayer card game …with achievements"
- Daily recap, headed "Yesterday's News": "The toughest clue in the Cross|word was 28A: Bone that grows inside a tendon. 12% of players requested a hint for KNEECAP!"
- Status labels on cards are one word: "Unplayed", "Bonus", "Experimental".
- Not found: "Cannot find this page." with a link "Go home".

Per-game pages. Each has a headline, a one or two sentence standfirst, then sections whose headings are themselves lines of copy:

| Game             | Headline                                                      | Standfirst                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SpellTower       | "Get to know our hit word search game, SpellTower"            | "SpellTower is word search but with strategy. Clearing the board feels really good."                                                                                                                                         |
| Really Bad Chess | "Really Bad Chess is chess, but with chaos."                  | "Every day is a unique and wacky board. Play daily to explore your unfair advantage."                                                                                                                                        |
| Typeshift        | "Typeshift is anagrams with a literal twist."                 | "In this free daily word puzzle, getting the last word is always possible."                                                                                                                                                  |
| Pile-Up Poker    | "Try your hand at Pile-Up Poker. It’s solitaire meets poker." | "Start your day with free deals of our enticing poker game."                                                                                                                                                                 |
| Circuits         | "Wordplay, wired differently."                                | "Circuits takes word association games to the next level. Not only do you need to guess the correct word pair, you need to make sure every word pair connects with all the others."                                          |
| Memoku           | "Flip, Match, and Solve Our Newest Game: Memoku!"             | "Inspired by the classic memory game, Memoku invites you to match pairs of numbers, but there's a twist – like Sudoku, no number can appear in the same row, column, or box twice."                                          |
| Bongo            | "Meet Bongo: A Word Game By Seth Godin"                       | "Bongo challenges you to build a better board out of twenty five tiles. There’s always a better board."                                                                                                                      |
| Crossword        | "Play Puzzmo’s free daily crossword right here."              | "Our free, daily "midi" crosswords are an approachable redesign on the classic, with helpful features you won’t find anywhere else: All clues have easier hints, and spaces in multi-word answers are depicted in the grid." |

Section headings in the same pages: "Fairness is overrated." (Really Bad Chess); "Being shifty is the name of the game." (Typeshift); "Sudoku gets flipped on its head" (Memoku); "If you like mini crosswords, you’re gonna love our daily midi." (Crossword); "Connect the Circuits".

Body text, two samples:

> Our free daily SpellTower game is a two-dimensional grid of letters that looks like your typical word search puzzle. But unlike a traditional word search, you can change directions, cross your own path, go diagonal, and even spell backwards!

> Sudoku has been a staple of newspaper sections since 1979. It’s a classic for a reason. But even classics can use a tune-up now and then. Enter Memoku.

Subscription copy: "Can’t get enough Puzzmo? Subscribers get access to our entire game archive! No need to worry about running out of puzzles when an especially lazy Sunday rolls around."

Shape and habits:

- The house formula is "[Game] is [a game everyone knows], but with [one word]": "word search but with strategy", "chess, but with chaos", "anagrams with a literal twist", "solitaire meets poker". Four of eight headlines or standfirsts use it.
- The second sentence says how it feels, in plain words: "Clearing the board feels really good."
- First person plural ("our hit word search game", "we think games should be full of surprise and delight"), contractions and an occasional "gonna".
- The pages are two voices stitched together. The headlines and section heads are short and dry. The paragraphs under them carry the search phrases ("Our free daily SpellTower game", "Puzzmo’s free daily Really Bad Chess game", "our free, daily captivating word puzzle game that challenges your vocabulary, spatial reasoning, and wit"). "free daily" or "free, daily" appears in the headline, standfirst or first paragraph of four of the eight (SpellTower, Typeshift, Really Bad Chess, Crossword).
- Numbers are spelled out in running text ("twenty five tiles", "three queens") and given as numerals for scores and stats ("11,147", "12% of players", "27-tile word").
- Puns sit in headings, one per page, and are not explained.

### 3.4 The Washington Post

Fetched: https://www.washingtonpost.com/games/ .

- Title tag: "Crosswords & Games - The Washington Post". Meta description: "Play Washington Post's crossword puzzles online for free."
- One tagline under each game name:

| Game               | Tagline                                         |
| ------------------ | ----------------------------------------------- |
| Crossword          | "You know it. You love it."                     |
| Mini Crossword     | "5x5 bite-sized crossword"                      |
| Untangled          | "Make every letter count"                       |
| Half Chance        | "Make your best guess"                          |
| Keyword            | "One word to spell ’em all"                     |
| Wridges            | "A next-level word search"                      |
| On the Record      | "A quotable news quiz"                          |
| Sudoku             | "Number. Order. Logic."                         |
| Block Champ        | "10x10-style Tetris inspired game"              |
| Word Wipe          | "Form words to clear rows, score, & advance"    |
| Outspell           | "A scrabble-esque game with twists & surprises" |
| Blackjack          | "Beat the dealer. 21 wins automatically."       |
| Mahjongg Solitaire | "Match tiles to clear the board"                |

- Shelf label for the licensed games: "Other popular games" / "More than 100 card, puzzle, word games and more".

Shape and habits: 3 to 8 words, median 4. Five are imperatives, six are noun-phrase labels (three of them starting "A"), and two are staccato fragments with full stops. Single phrases take no full stop; lines made of two or three clipped sentences keep theirs. The Post's own games get wit ("One word to spell ’em all"); the licensed ones get a plain mechanic ("Match tiles to clear the board"). None says "fun", "free" or "classic".

### 3.5 The New Yorker

Fetched: https://www.newyorker.com/puzzles-and-games-dept (redirects to /crossword-puzzles-and-games).

- Title tag: "The New Yorker’s Crossword Puzzles and Trivia Games". Meta description: "Solve daily and weekly crosswords, both traditional American offerings and British-style cryptics, that range from easy to difficult, and play our “Name Drop” trivia quiz."
- The games are each described by a question:
  - Laugh Lines: "Can you guess when these New Yorker cartoons were originally published?"
  - Catalogues: "Can you sort the items into the correct order?"
  - Shuffalo: "Can you make a longer word with each new letter?"
  - Name Drop: "Can you guess the notable person in six clues or fewer?"
- The crosswords are each described by a fragment that starts "A puzzle":
  - "A challenging puzzle."
  - "A puzzle that ranges in difficulty, with the occasional theme."
  - "A puzzle with a few clues loose."
  - "A puzzle for lovers of wily wordplay."
  - "A bite-size crossword, for a quick diversion."
- Notices: "Good news, cartoon fans: you can now play Laugh Lines, our cartoon-history game, every day."; "We’ve added some hints and explainers to make this puzzle a little less cryptic."
- Link labels are full phrases ending in a guillemet: "Play today’s game »", "Solve the latest puzzle »", "Browse our archive »", "Questions about our crosswords, cryptics, or quizzes? Get answers »".

Shape and habits: two fixed moulds, used without exception: "Can you [verb] …?" for games and "A puzzle [qualifier]." for crosswords. Full stops on fragments. Numbers spelled out ("six clues or fewer", "nine comedians"). "fewer", not "less". The verb for a crossword is "solve", for a game "play". Jokes are small and inside the description ("a few clues loose", "a little less cryptic").

### 3.6 LinkedIn Games

Fetched: https://www.linkedin.com/games/ .

- Meta description: "Play free puzzle games on LinkedIn. Connect with your professional network through shared experiences. Try Pinpoint, Crossclimb, Queens, Tango, and Zip today!"
- Heading and standfirst: "Connect over fun, daily games" / "Prep your mind for the workday and compare results."
- One tagline per game, shown above the name:

| Game        | Tagline                       |
| ----------- | ----------------------------- |
| Wend        | "Weave through words"         |
| Patches     | "Piece it together"           |
| Mini Sudoku | "The classic game, made mini" |
| Zip         | "Complete the path"           |
| Tango       | "Harmonize the grid"          |
| Queens      | "Crown each region"           |
| Pinpoint    | "Guess the category"          |
| Crossclimb  | "Unlock a trivia ladder"      |

Shape and habits: seven of eight are imperatives of three or four words, and the verb is chosen to echo the game's name or theme (Queens crown, Patches piece, Tango harmonizes). No full stops, sentence case, no adjectives except "classic" once.

### 3.7 Apple News+ puzzles

Fetched: https://www.apple.com/apple-news/ .

- Feature bullet: "Solve daily puzzles created exclusively for Apple News+."
- Section, 31 words: "Apple News+ includes original mini and full-size crossword puzzles, ranging in difficulty from easy to challenging. New crosswords are available daily, and you can take on past games from the archive."
- Comparison table row: "Exclusive daily puzzles".

Shape and habits: the puzzles are described only by size, difficulty range, cadence and archive. Third person for the product, "you" once.

### 3.8 Not reached

- The Atlantic (https://www.theatlantic.com/games/): a "Please hold a moment…" connection check to curl; WebFetch could not fetch the host.
- Merriam-Webster (https://www.merriam-webster.com/games): HTTP 403 to curl and to WebFetch; a browser check page in headless Chrome.

Nothing is quoted from either.

---

## Group 4: solo developers' and small studios' own sites

### 4.1 Simon Tatham's Portable Puzzle Collection

The collection's own page (https://www.chiark.greenend.org.uk/~sgtatham/puzzles/) could not be reached: TLS failure and connection refused, from curl and from WebFetch. The per-puzzle text below was fetched instead from the build file of the Android port, which copies the collection's source: https://raw.githubusercontent.com/chrisboyle/sgtpuzzles/main/app/src/main/jni/CMakeLists.txt . Each puzzle is declared there with a DISPLAYNAME, a DESCRIPTION and an OBJECTIVE. (From memory, unverified: the collection's index page shows each puzzle's name with its OBJECTIVE sentence beneath it.)

39 entries were parsed. A sample, as "Name | DESCRIPTION | OBJECTIVE":

- Mines | "Mine-finding puzzle" | "Find all the mines without treading on any of them."
- Solo | "Number placement puzzle" | "Fill in the grid so that each row, column and square block contains one of every digit."
- Same Game | "Block-clearing puzzle" | "Clear the grid by removing touching groups of the same colour squares."
- Pegs | "Peg solitaire puzzle" | "Jump pegs over each other to remove all but one."
- Fifteen | "Sliding block puzzle" | "Slide the tiles around to arrange them into order."
- Bridges | "Bridge-placing puzzle" | "Connect all the islands with a network of bridges."
- Black Box | "Ball-finding puzzle" | "Find the hidden balls in the box by bouncing laser beams off them."
- Flood | "Flood-filling puzzle" | "Turn the grid the same colour in as few flood fills as possible."
- Inertia | "Gem-collecting puzzle" | "Collect all the gems without running into any of the mines."
- Map | "Map-colouring puzzle" | "Colour the map so that adjacent regions are never the same colour."
- Tents | "Tent-placing puzzle" | "Place a tent next to each tree."
- Untangle | "Planar graph layout puzzle" | "Reposition the points so that the lines do not cross."
- Undead | "Monster-placing puzzle" | "Place ghosts, vampires and zombies so that the right numbers of them can be seen in mirrors."
- Unruly | "Black and white grid puzzle" | "Fill in the black and white grid to avoid runs of three."
- Guess | "Combination-guessing puzzle" | "Guess the hidden combination of colours."

Shape and habits:

- 39 of 39 objectives are one imperative sentence that starts with the verb and ends with a full stop. Length 6 to 17 words, median 11.
- The verbs are plain and physical: Find, Connect, Slide, Fill in, Place, Draw, Divide, Complete, Collect, Clear, Jump, Rotate, Colour, Guess, Reposition.
- The usual build is "[Verb] [the thing] [so that / without / by / to] [the constraint]". The constraint clause is what tells one puzzle from another.
- The description label always ends in "puzzle" and is two to five words (22 of 39 are two words). 19 of 39 are a hyphenated "-ing" modifier ("Mine-finding puzzle", "Tent-placing puzzle"); the rest name the form ("Sliding block puzzle", "Latin square puzzle"). Only the first word and proper names are capitalised.
- No adjectives of praise anywhere, no "you", no exclamation marks, no mention of difficulty. Technical words are used when they are the right ones ("Latin square", "polyomino", "toroidal").
- Related fetched text: the Google Play listing of the Android port ("40 classic single-player logic puzzles, playable offline, generated on demand") and the App Store listing of the iOS port ("This is a collection of 38 single-player puzzle games for the iPhone and iPad."), both in group 2.

### 4.2 Zach Gage (stfj.net)

Fetched: http://stfj.net/ (a frame with a sidebar built from http://stfj.net/order.json, 211 entries by year back to "2004 and Older") and six project pages: /art/2017/Flipflop Solitaire/ , /art/2015/Sage Solitaire/ , /art/2020/Good Sudoku/ , /art/2016/Really Bad Chess/ , /art/2018/Pocket-Run Pool/ , /art/2023/Puzzmo/ .

- Site title and header, all lower case: "stfj.net - the complete works of zach gage"
- The index is a numbered list under year headings. Games, press, interviews and podcasts sit in the same list, labelled by kind: "Interview - Breaking the rules in Really Bad Chess", "Article - Redesigning Solitaire", "Podcast - Good Sudoku".
- Every project page opens with a three-line catalogue header, like a museum label: title, then "Zach Gage, 2017" (or "Zach Gage and Jack Schlesinger, 2020"), then the medium: "Custom Software", or "Daily games platform" for Puzzmo. Credits follow in the same flat form: "Additional coding by Denver Coulson".
- Then the pitch, then a row of hyphens, then a designer's note in the first person.

Pitches, first lines:

- "Flipflop Solitaire is a new deep and unrestrictive solitaire variant. ( iOS download here)"
- "Sage Solitaire is a brand new Solitaire variant that combines the luck and joy of Klondike with the depth of Poker, made specifically for your phone."
- "Really Bad Chess is just like chess, but with totally random pieces. Try 8 Knights, 4 Bishops, and 3 pawns — why not?"
- "Pocket-Run Pool combines 8-ball pool with the thrill of a chasing the perfect highscore."
- "Puzzmo is Orta and my vision for a modern games platform for players who enjoy daily newspaper style games."

Designer's notes:

> Flipflop Solitaire is sort of a sequel to Sage Solitaire in the sense that it's my second crack at the design problem of making a Solitaire game that feels like it was designed for your phone and not for a table.

> Klondike is a great game when all you have is a deck of cards, but you have more than that, you have the computer phone of the future! Our phone screens aren't the size of a table (yet), so why do we have to play Solitaire games designed for tables?
>
> …
>
> At least that's what I think.
>
> I hope you enjoy Sage Solitaire.

> Chess is one of those games I always wished I enjoyed, but its commitment to beauty, elegance, and perfect balance always turned me away. Really Bad Chess removes these boring restrictions and flips chess on its head.

> I've always loved pool, and when I got my first iPhone years ago, the world of digital pool games opened up to me.

The Puzzmo page tells one concrete story instead of listing features: "Before the public launch we did a semi-private beta. Thousands of people rushed to be the first 500 to solve a web puzzle each day. The lucky few were mailed a scratch-off puzzle to their home."

Shape and habits:

- Pitch formula: "[Game] is [known game], but [the one change]", then a concrete example with numbers ("Try 8 Knights, 4 Bishops, and 3 pawns").
- The note gives the design problem the game answers, in "I", with opinions stated as opinions ("At least that's what I think.", "To be honest this is how I wish everyone approached sequels.").
- "Solitaire", "Klondike", "Poker" and "Chess" are capitalised as proper nouns, not consistently.
- Year and collaborators are data in the header, not worked into sentences. No stack or engine is mentioned.
- Old work is not apologised for or ranked; it is simply further down the list.

### 4.3 Orteil (orteil.dashnet.org, dashnet.org)

Fetched: https://orteil.dashnet.org/ , https://dashnet.org/ and a made-up URL for the 404.

- About (15 words, then one more line): "Orteil is some European dude who likes to make toys and games out of javascript." / "In this task he is aided by Opti, his best friend and roommate."
- DashNet home: "video games and other fun things" / "Hey there! This is DashNet." / "We're Orteil and Opti, a 2-people team that makes browser games, generators, and other wacky experiments."
- Section headings each carry a bracketed aside: "Games (cool and fun things)", "Tools & Toys (stuff that makes stuff)", "Experiments (unfinished, broken, or just plain bad)", "Links (other places you can find me)".

Entries are "Title (year)", an optional status tag, then one to three short lines:

> Cookie Clicker (2013)
> Probably what we're most well-known for.
> The archetypal idle game where you click cookies and deal with deranged grandmothers.
> Has been described as dangerously addictive.

> Cookie Clicker classic (2013)
> The simple, original version where it all started.
> Click on a big cookie for hours of mindless fun!
> (We won't judge, promise.)

> Neverending Legacy (2017)
> [Alpha]
> Half-idle game, half-strategy game; lead your people from a tribe of starving cavemen to a thriving civilization!

> Genesis (2010)
> A peaceful game about combining elements. You start with earth, water, fire and air, and end up with rainbows and butterflies and such.
> A bit bad, a bit unfinished.
> Requires Flash. Hosted on Newgrounds.com.

> Murder Games (2018)
> Automated survival simulator.
> Create a cast of characters, then watch them betray and slaughter each other round after round until one team or one person survives.

> Life (2012)
> A simple implementation of Conway's Game of Life, featuring custom rules and random rule generation.

> Neverending Legacy (old) (2015)
> An older prototype for Neverending Legacy. Broken and filled with interesting bugs, such as infinite skeletons.

> Tea Party (2011)
> A mindless, meandering text adventure full of dead-ends.

> WebGL test (2016)
> Testing procedural 3D models and shaders. I thought this looked neat.

The same games on the DashNet home, one line each: "The game that made idle games a thing! Click cookies and beware the grandmas."; "A game about ruling the world and not starving to death."; "Infinite text-based universe, featuring everything ever."

404:

> 404!
>
> whoops
>
> Either you typed a url wrong (that's on you!) or we messed up somewhere (that's our bad, please let us know!).
>
> Not sure where to go? You could check out our homepage for some pretty neat stuff.

Footer: "© Orteil 2025 - DashNet | Privacy Policy".

Shape and habits:

- Each entry is two or three short lines: what it is ("A [adjective] [genre] where/about…" or a bare noun phrase with a full stop), then what you do, then one honest remark.
- The subject is dropped in the remarks: "Probably what we're most well-known for.", "Has been described as dangerously addictive.", "Comes with copious documentation."
- Praise is attributed or undercut, never claimed: "been described as "whoah dude"", "this ultimately pointless cash dispenser".
- Old and unfinished work is labelled without embarrassment, in a section of its own and in the entry ("A bit bad, a bit unfinished."). Dead technology is one flat line: "Requires Flash."
- Third person in the About ("Orteil is some European dude"), "we" for the pair, "I" in asides.
- Technical detail appears only where it is the point of the project ("A simple implementation of L-systems.").

### 4.4 Bennett Foddy (foddy.net)

Fetched: https://www.foddy.net/ , /games/ , /blog/2017/09/getting-over-it/ and a made-up URL for the 404.

- Title tag: "Home - Games By Bennett Foddy". Meta description: "Games, writing, and experiments by Bennett Foddy".
- About, the whole of it (12 words): "Bennett Foddy is an independent game designer based in Brooklyn, New York."
- Newsletter promise: "I'll only ever email you if I release a new game."
- Footer: "© 2026 Bennett Foddy. No cookies."
- The games page is two lists of titles with no blurbs, headed "Games" and "Also Games".
- The Getting Over It page opens with three lines set as verse, then a flat list of facts:
  > I created this game
  > for a certain kind of person
  > To hurt them.
  >
  > A few things that have happened since I released the game in 2017
  >
  > It really caught fire with streamers and has been played by nearly all of the biggest ones.
  > It's in the permanent collection in New York's Museum of Modern Art.
  > There's now a genre of games that is sometimes called 'Foddian'.
- Store links are full sentences: "You can buy it on Steam here for Windows and MacOS." / "Or on Apple Arcade here."
- 404: the web server's default page ("404 Not Found", "nginx/1.24.0 (Ubuntu)").

Shape and habits: third person for the one-line bio, first person everywhere else; facts in place of adjectives (a museum collection, a genre name); the footer is used for a two-word statement of principle.

### 4.5 Pippin Barr (pippinbarr.com)

Fetched: https://pippinbarr.com/ , /games/ , /about/ (empty) and a made-up URL for the 404.

- Games page introduction (55 words):
  > Welcome to my games. I've made 97 of them since 2011 and I'm still going. There are some tagging categories below to help you find your way, or you can just scroll through everything in reverse chronological order if you prefer. If you want somewhere manageable to start, you could look at my current top-five.
- Entries are "Title (year)", a status in brackets where needed ("(in progress)", "(Originally released 11 April 2012)", "(with Jonathan Lessard)"), a blurb, then idea tags and platform tags ("Variations", "Snake" | "Browser", "Mobile-Friendly").
- Blurbs are written as a mock advertisement, every sentence an exclamation:
  - BREAKSOUT (2015): "What’s better than breaking out?! BREAKSING OUT! Breaks out to your heart’s content in these wonderful variants of your old family friend! Snake it up in SNAKEOUT! Feel the love in GHOST BREAKOUT! Experience the future of entertainment in BREAKOUT VR! Or have a meaningful cultural experience with РАЗРАЗИТЬСЯ!"
  - PONGS (2022 re-release): "Bip! Bip! Bip! Boop! Everyone loves PONG! So everyone loves thirty six PONGS even more!"
  - Sibilant Snakelikes (2017): "Sssnakes can do anything! Sssubdue colossssssi! Ssstamp passssssportsss! Sssweep minesss!"
  - Chesses (2019): "Your pieces slide! Your pieces fall! Your pieces do the strangest things! It’s chesses unlike the chess you normally chess! Bet you can’t chess just one!"
  - RACERS (2025, in progress): "Rat race! Human race! Racy race! Let’s race!"
  - "It is as if you were playing a text adventure (2025) (in progress)": "> write a description"
  - One blurb is two words: "Slow down."
- 404: the site's navigation and the number "404", nothing else.

Shape and habits: the parody works because it copies portal copy exactly (the rhetorical question, the capitals, the list of modes, "And many more!"). The plain voice is kept for the page introduction and the status labels. Unfinished work is listed in the main list with "(in progress)", and one has a placeholder for a blurb, shown as it is.

### 4.6 Michael Brough (smestorp.com)

Fetched: http://www.smestorp.com/ and a made-up URL for the 404.

- Title tag: "brog". Opening:
  > Hi, I'm Michael. I make videogames and do other stuff. I've been slowed down a lot but I'm still working on things! I'm currently based in Lisbon, Portugal.
- Contact lines each start with a frank statement of habit: "I blog infrequently:", "I sometimes post on twitter:", "I might use mastodon too:", "I'm slow to respond to email:".
- Mailing list:
  > I have a mailing list for game releases. In 10 years I've sent 7 emails. If you subscribe, a few weeks after I release a game I'll remember to email you, and you'll say "thank you I already heard about this on social media".
- Section headings are full sentences: "The following games are currently available to buy." / "The following games are currently available for free."
- Each game gets a title and a tag of one to three lower-case words: 868-HACK "cyberspace roguelike"; Imbroglio "roguelike?"; Zaga-33 "roguelike slimespace"; Corrypt "mysterious intricacies"; Helix "vortex mode"; Vertex Dispenser "maths rts"; P1 Select "broughlike"; Vesper.5 "ritual"; scarfmemory "ludic elegy"; Kompendium "2p album".
- Then availability, one platform per line: "available on steam", "available on ios", "available on itch.io for windows, mac". Jam games say what they were for: "for pirate kart v", "for candy jam".
- Awards are bare lower-case lines: "igf finalist 2014".
- 404: the hosting company's default page.

Shape and habits: the shortest descriptions in the study; they name a mood or a genre and nothing about rules. All lower case below the introduction. Honesty about pace is the personality.

### 4.7 Nicky Case (ncase.me)

Fetched: https://ncase.me/ , https://ncase.me/projects/ and a made-up URL for the 404.

- Title tag: "It's Nicky Case!". Description: "i make shtuff for curious & playful peeps". Opening: "Hi, I'm Nicky!" / "I make shtuff for curious & playful folks."
- Section headings: "SHTUFF YOU CAN PLAY", "SHTUFF YOU CAN READ", "SHTUFF YOU CAN WATCH".
- Every project, on both pages, is one line in one mould, "title – a [kind of thing] about/to [subject]", all lower case:
  - "adventures with anxiety – an interactive story about anxiety, where you are the anxiety"
  - "the evolution of trust – an interactive guide to the game theory of why & how we trust each other"
  - "we become what we behold – a game about news cycles, vicious cycles, infinite cycles"
  - "nutshell – a tool to make expandable explanations"
  - "emoji simulator – a tool to make cellular automata, with emoji"
  - "double slit simulation – a tiny explanation-free sim, made in 2 days for a pal"
- The archive page's introduction: "Here's all the major projects I've ever put online, as far as I (care to) recall." / "Note: the further back you scroll, the cringier it gets. You've been warned."
- Empty years are filled in, not skipped: "# 2023" / "nothing. burnout. :("; "# 2021" / "nada, nothing, zilch. i was on a long burnout-hiatus."
- Newsletter line: "max 1 update per month". Licence: "attribution is amazing & appreciated, but i won't send legal goons over it". Contact: "faq / contact (i am bad at emails)".
- 404: GitHub Pages' default page.

Shape and habits: the article-plus-kind opener ("a game about", "a tool to", "an interactive guide to") makes a list of unlike things readable at a glance; the kind word is chosen carefully (game, tool, story, guide, sim, talk, tutorial). Ampersands, lower case and invented spellings mark the voice; the structure under them is strict.

### 4.8 Lucas Pope (dukope.com)

Fetched: https://dukope.com/ .

- Title: "Games by Lucas Pope". One page, newest first, each game followed by its date ("October 18, 2018").
- Major games get a genre line with a dry twist and then a premise in the game's own world:
  - Return of the Obra Dinn: "An Insurance Adventure with Minimal Color" then "Return of the Obra Dinn is a first-person mystery adventure based on exploration and logical deduction."
  - Papers, Please: "A Dystopian Document Thriller." then "Your job as immigration inspector is to control the flow of people entering the Arstotzkan side of Grestin from Kolechia."
- Jam games get the premise as an order in capitals, then a plain provenance sentence:
  - "MAKE THE ACME FORM-LETTER COMPANY STAND OUT AS THE PREMIER FORM-LETTER MAILING SERVICE ON EARTH." / "This is my entry for Ludum Dare 33. Developed in 48 hours for the theme 'You are the monster'."
  - "I created this as a warmup for Ludum Dare, a 48 hour game-making competition. This is my first quickly-developed game and my first Flash game. Flash debugging is a nightmare but otherwise I had fun. Flixel is great."
- Old builds are kept and labelled exactly: "This is the last public beta from early 2013. It has a rough implementation of the first 8 days of the final game and gives a good idea about the gameplay." / "Barely tested and possibly full of bugs. Progress is not saved." / "(Original competition version)" / "This version has bugs!"
- Technical detail is a footer line per game: "Made with Unity 3D", "Made with Haxe/OpenFL", "Made with HaxeFlixel"; and port notes: "Converted from HaxeFlixel/Flash to HaxeFlixel/HTML5. RIP Flash."
- Fix lists are bullets in past tense: "Fixed typo: SESSSION", "Allow one retry on each level instead of once per game".
- Controls as an aligned table with dot leaders: "Move................WASD".

Shape and habits: three registers kept apart: the game's fiction (present tense, second person, in-world), the definition sentence ("Return of the Obra Dinn is a first-person mystery adventure based on exploration and logical deduction."), and the maker's notes (first person, past tense, exact). Stack, duration and theme are stated as facts in a fixed place.

### 4.9 Farbs (farbs.org)

Fetched: https://farbs.org/ .

- About (9 words): "Farbs is an independent game developer based in Australia."
- One list, newest first. Each entry is "YEAR, Title", one to four sentences, then link labels that name the platform: "Browser", "Steam", "Itch", "Download (Windows)", "Browser (Flash)", "Video".
- First sentences are noun phrases starting "A":
  - "2023, Captain Forever IO" / "A 2D neon space game where you and your friends snap rocket parts together and fly around."
  - "2018, Buy Captain Forever Trilogy" / "A text input incremental game where you buy a trillion copies of Captain Forever Trilogy. Involves some light programming."
  - "2014, Echo of the Echo" / "An interactive poetry toy commissioned for the launch of the novel Echo of the Boom. Bleak."
  - "2013, Turn Based Pacman" / "A puzzlescript experiment, does what it says on the box, is surprisingly fun."
  - "2010, PlayPen" / "A gigantic community-built adventure game. A nonsensical pixel art wiki adventure. A toilet wall for the internet."
  - "2009, A Message for 2K Australia" / "A short platformer announcing my resignation, sent to the 2K Australia allstaff list."
- Unfinished and superseded work:

  > 2022, Captain Forever Universe (Incomplete)
  >
  > If you scout this list (or sort it alphabetically) you'll see there are quite a few Captain Forever games, but they're all pretty short. What would happen if, instead, one of them was an epic hundred hour RPG?
  >
  > What would happen is I haven't finished building it yet. But you can still play it!

  "Since flash is being pushed out you're better off playing the 2018 Steam edition Captain Forever Trilogy."; "Released on Xbox Live Indie Games, which is sadly now defunct."; "They're delightfully compact things that I love and wish I'd kept making..."

- Awards are thrown away in three words: "Won some awards.", "Won a couple of awards."
- Work for an employer is marked in the title: "2019, Void Bastards (Blue Manchu)".
- Technical detail is one clause where it explains the entry: "rebuilt entirely in JavaScript so it runs in browser again and is properly multiplayer".

Shape and habits: the closest thing in the study to a model portfolio list. Each entry answers, in order: what is it, what is notable or odd about it, can I still play it and where. Verdicts are one word or one clause after the description ("Bleak.", "Quite silly.").

### 4.10 Jake Gordon (codeincomplete.com, jakesgordon.com)

A personal site with the sections "home | writing | games | about | resume". Fetched: https://codeincomplete.com/ , /games/ , /about/ , and two write-ups that now live at https://jakesgordon.com/writing/javascript-breakout/ and /writing/javascript-tetris/ . The resume is a PDF and was not read. Several "Read More" links on the games page are broken and returned the host's default not-found page.

- Home: "Welcome. I'm Jake Gordon, a principal engineer building software teams, products, and services, with the occasional game on the side."
- A dated-content notice: "This blog contains articles that span a long career and is now largely dormant. While content may reflect older practices or technologies, I do - on occasion - add new posts here."
- Games page introduction (49 words):
  > These JavaScript games were built between 2011-2013 and still run perfectly in modern browsers - a testament to the web’s commitment to backward compatibility. The code remains relevant for learning game development fundamentals and demonstrates how using well-designed web standards can help your code stand the test of time.
- Each game is a heading with the technology in the name ("HTML5 Breakout", "HTML5 Snakes", "HTML5 Tetris") and a list of fixed link labels: "Play Now", "Read More - Introduction", "Read More - Collision Detection", "Source Code". No blurb.
- Write-ups are "Title", year, then first person:

  > Exploring further into the suitability of the HTML5 <canvas> as a game environment, here is my interpretation of the classic breakout game.

  > My previous game, snakes, took a while to ship. It was a good experience to learn what it means to finish a game, but in reality, these are just side projects for me to play with some basic game mechanics and learn a little game programming.

  > Without the polish, it’s a little ugly, but its fully functional, and I can show you how to implement it yourself…

- About page, CV in prose, each paragraph starting with the role: "As the founding engineer at Kevala, I recruited and managed…", "As the first engineer at LiquidPlanner I helped build this startup from 2 founders with an idea, to a mature product…". Closing: "have been writing code since first getting my hands on a commodore 64 as a teenager."
- In-game credit lists are "Role Name": "Created by Jake Gordon", "Fonts SF Fedora".

Shape and habits: the games are presented as engineering exercises, so the write-up is about what was learned and how long it took, and the game itself is described in five words ("my interpretation of the classic breakout game"). The home page puts the games in one clause of the professional summary ("with the occasional game on the side").

### 4.11 Terry Cavanagh (terrycavanaghgames.com, distractionware.com)

Fetched: https://terrycavanaghgames.com/ and https://distractionware.com/blog/about/ .

- Games site, heading in lower case: "games by terry cavanagh". Introduction:
  > Hello! Thanks for checking out my site - it's a work in progress, sorry! I have a dev blog at distractionware.com which is a little bit more up to date. I'm also occasionally on twitter, though a lot less these days.
  >
  > You can find a full list of my work at my blog, but if you'd like some recommendations, here are my own favourites:
- Then titles only, and: "I also have three commercial games: VVVVVV, Super Hexagon, and most recently, Dicey Dungeons:" and "Thanks for visiting! <3".
- About page:
  > Heya! I’m Terry Cavanagh, independent game developer from Monaghan, Ireland. I went full time indie in 2007, and I’m lucky enough to still be here, making the games I want to make <3
  >
  > In that time, I’ve made three commercial games: Dicey Dungeons, Super Hexagon and VVVVVV – but I’ve also made a bunch of freeware games that I’m very proud of, including At a Distance, Don’t Look Back, and Tiny Heist.
- Mailing list: "I only send emails when I release something new."
- His Steam line for Super Hexagon (group 2): "Super Hexagon is a minimal action game by Terry Cavanagh, with music by Chipzel."

Shape and habits: a greeting, an apology for the state of the site, and a short list of the maker's own favourites in place of a full catalogue. Sidebar headings sort the work by money, not genre: "Games for sale", "Freeware", "Tools".

### 4.12 grapefrukt games (grapefrukt.com)

Fetched: https://grapefrukt.com/ , /holedown/ , /about/ and a made-up URL for the 404.

- Title and meta description: "grapefrukt games | better games for better people".
- The home page is a list of game names in lower case, one of them "new game".
- Game page (holedown): a two-row fact table ("release year" / "2018"; "available on" / "windows", "switch", "ios", "android"), one paragraph, and a link "buy here". The paragraph is the store text: "Dig deep underground by shooting balls and breaking blocks to traverse your way to the core of planets. With only a certain number of shots per round and some blocks firmly fixed to the wall, thoughtfully strategize and aim the balls for maximum impact."
- About page, all lower case:
  > grapefrukt games consists of exactly one guy, martin. that’s me!
  >
  > i got into game making in a big way around the time of the experimental gameplay project and still use that same methodology; making a bunch of small prototypes to see if a concept works and then build upon the ones that do. usually this takes a very long time.
  >
  > …
  >
  > while i’m a one man company, most of my games are made in collaboration with others. repeat collaborators include:
  >
  > - niklas ström - music, sound and good company
- 404: the web server's default page.
- The same game's lines elsewhere (group 2): Steam short description "Bounce bounce bounce bounce BOUNCE BOUNCE BOUNCE your way to the planet core!"; App Store subtitle "A Ball Bouncer With Depth".

Shape and habits: the maker's own lines (tagline, subtitle, about page) are short and funny; the long description reads as written for a store by someone else, in participles and abstractions ("thoughtfully strategize", "for maximum impact"). Facts sit in a table, not in the prose.

### 4.13 Zachtronics (zachtronics.com)

Fetched: https://www.zachtronics.com/ and a made-up URL for the 404.

The home page is the whole catalogue, one paragraph of one to three sentences per game:

- "Eliza is a visual novel about an AI counseling program, the people who develop it, and the people who use it."
- "Infinifactory is a sandbox puzzle game. Build factories that assemble products for your alien overlords, and try not to die in the process."
- "TIS-100 is an open-ended programming game in which you rewrite corrupted code segments to repair the TIS-100 and unlock its secrets. It’s the assembly language programming game you never asked for!"
- "SHENZHEN I/O: BUILD CIRCUITS. WRITE CODE. RTFM."
- "The year is 1997. You used to be a hacker, but now you have the phage. You made a deal: one hack, one dose. There’s nothing left to lose… except your life." (EXAPUNKS)
- "Use the MOLEK-SYNTEZ to create small molecules with various pharmacological effects from the comfort of your small Romanian apartment."
- "Defend America from an alternate-universe America using state-of-the-art 1980s military hardware in this intricate and tactical turn-based strategy game." (Möbius Front '83)
- "NERTS! Online is a fast-paced competitive solitaire game for you and up to five of your friends, played the same way we play it at the Zachtronics office!"
- "SpaceChem is an obscenely addictive, design-based puzzle game about building machines and fighting monsters in the name of science!"
- "The Barkeep’s loaded up his retro computer with a full set of puzzle games for you to download and play. No need to worry about copy protection, they’re all fully cracked and ready to enjoy!" (Last Call BBS)

Of the 15 paragraphs read, 7 open "[Name] is a/an [genre] …", 3 open with an imperative, 2 open in the game's fiction, and 3 are other forms (an announcement, a slogan in capitals, a story summary). 404: the web server's default page.

Shape and habits: one studio, several moulds, chosen per game. The definition sentence is usually followed by one deadpan line that carries the tone ("and try not to die in the process", "the … game you never asked for!"). Humour comes from putting an ordinary detail next to the premise ("from the comfort of your small Romanian apartment").

### 4.14 Draknek & Friends and Alan Hazelden (draknek.org, alan.draknek.org, agoodsnowman.com)

Fetched: https://www.draknek.org/ , https://alan.draknek.org/ , https://agoodsnowman.com/ .

- Studio line, used as both headline and meta description: "Lovingly Crafted Puzzle Games Since 2013". Newsletter: "Monthly puzzle game recommendations".
- Personal site, meta description: "Alan Hazelden, also known as Draknek, is an independent videogame designer making thinky puzzle games." About: "I'm a game designer based in London, England. Since 2013, I've been running Draknek & Friends, an independent videogame development studio making and publishing elegant puzzle games." Then role statements: "I was the creative director and lead puzzle designer on these games:". A list headed "Some small/free puzzle games I've made", titles only, with collaborators as "With Patrick Traynor".
- Initiatives are "Name" plus one fragment: "Thinky Third Thursday" / "A monthly newsletter highlighting recent releases and puzzle game recommendations."
- Game site, the whole description: "A puzzle game about being a monster and making snowmen". Credits as a sentence: "Lovingly crafted by the mind of Alan Hazelden and the hands of Benjamin Davis" / "With enchanting soundscapes from the heart of Priscilla Snow". Pricing as a joke that is also true: "Pay What The Temperature Is" / "Every hour, the monster goes out to the weather station in London to check the temperature. They set the price on itch.io accordingly:"

Shape and habits: "a [genre] game about [gerund] and [gerund]" for the one-liner; a consistent house word ("thinky"); role and year stated plainly on the personal page.

### 4.15 Shorter notes from other developer sites

All fetched this session.

- Hempuli (https://www.hempuli.com/): "Welcome! This is the homesite of Arvi "Hempuli" Teikari. I live in Finland and I love to create games and draw stuff. This site used to be mostly for my games, but nowadays I also host my art & comics here." Meta: "Games, art, comics & blog by Hempuli, the developer of Baba Is You! For that old-school web experience." Footer statements: "Nothing on this website is AI-generated." and "Nearly all the games here are Fueled by Fusion." The game list page is titles, years and numbers with no descriptions; his itch.io blurbs are in 1.6.
- Ian MacLarty (https://ianmaclarty.com/ , /about.html): the home page is titles under year headings, nothing else. One title is "Unfinished game". About: "I'm a videogame developer living in Melbourne, Australia, with an interest in experimental designs. I've released over 40 small non-commercial works, but have also self-published several award-winning commercial games." "Sign up to my mailing list to receive an email when I release something new."
- Noel Berry (https://noelberry.ca/): "Sometimes, when I'm in the right mood, I make video games and art. Or something." / "These days I'm spending most of my time at Extremely OK Games." Then 26 titles with no blurbs. Article entries get a title, a date and one fragment: "Thoughts, tools, and libraries I use to make games". Footer: "★ Thanks for checkin' out my site ★" / "You can find the source here".
- Maddy Thorson (https://www.maddymakesgames.com/): browser title "Mady Maek Game"; heading "the incomplete works of Madeline Stephanie Thorson" / "lifelong maker of games". "Maddy currently works at EXOK, a game studio that she and her friends created. She enjoys talking about herself in the third person." Entries are four data lines and links, no prose: "Celeste" / "Jan 25, 2018" / "PC/Consoles" / "w/ EXOK". Sections: "COMMERCIAL GAMES", "BACK CATALOGUE".
- noio games, Thomas van den Berg (https://noio.nl/): "I love working on code & art, and the magic that happens when they come together. This page is a bit of a blog and a portfolio of some things I've done. The most well-known thing I made is probably the Kingdom Series, a minimalist pixel art strategy game." Entries are "2018 Nov — Stacking Boxes in Unity (physics)".
- Suspicious Developments (https://suspiciousdevelopments.com/): "Suspicious Developments Ltd is a videogame development company specialising in sneaky games that let you think of clever plans and/or knock people through windows." / "As of 2024, our games have sold 1.6 million copies and we are the 53rd highest rated developer of the 44,000 on Steam." / "We used to have more jokes here, but it turns out if you name your company Suspicious Developments, you've backed yourself into a legitimacy glass house from which you can only afford to throw a limited number of stones."
- Tom Francis (https://www.pentadact.com/): site heading "TOM FRANCIS REGRETS THIS ALREADY". "Hello! I'm Tom. I'm a game designer, writer, and programmer on Gunpoint, Heat Signature, and Tactical Breach Wizards." Mailing list: "To be told when we release something". A games list with results in place of adjectives: "Gunpoint (2013) – 10k reviews, 98% positive".
- Daniel Linssen (https://managore.itch.io/ ; his own site daniellinssen.games is an empty shell to curl): "I hope you enjoy my games!" / "(roughly in order from best to worst)". Blurbs are lower case with no closing punctuation: "a game whose window you can manipulate"; "a game about having a little bit, but not too much"; "live life as a cog"; "try not to lose your way"; "score chasing death ballet"; "send messages, receive messages, play messages"; "A clumsy platformer about knowledge and discovery". One game's blurb is the unfilled placeholder, kept: "// add a short description here".
- Sokpop Collective (https://sokpop.itch.io/ ; sokpop.co is a canvas with the words "video game collective"): "We make games! Subscribe for 3$ on our Patreon." Blurbs of two to six words: "deduction puzzle game"; "A very normal gardening game."; "tower defense meets yahtzee"; "Word puzzles with Sunday morning vibes"; "A zuma-like adventure"; "Dodgeball in a dungeon"; "A weird Yahtzee-like toy."; "A garden RTS". One long one: "A village builder where you stack cards to collect food, build structures, and fight creatures" (Stacklands).
- Sam Hogan (https://samhogan.itch.io/): "Exploit bugs to pass levels"; "Build siege engines, launch ragdolls"; "What is life?"; "Hardest game ever?"; ""Minecraft" clone made in 24 hours".
- increpare (https://www.increpare.com/): meta description "Makes small mostly free games and tools :)". The page is 518 entries of title, date, platform tags ("HTML5", "WIN", "MAC", "LINUX") and "SOURCE", filterable by platform and engine, with no descriptions.
- Thomas Brush (https://www.thomasbrush.com/): "I make hauntingly beautiful worlds, and I also talk about how I make them." Section head: "ATMOSPHERE FIRST. GREAT GAMES ALWAYS." "A haunting afterlife. A coma that won't let go. A tower with something very wrong inside. Welcome to my games." "My studio name is Atmos Games. Three guesses why." Per game: "A twisted first-person shooter set in the 1950s."; "A haunting, dreamlike fable about a boy in a coma." Buttons in the game's voice: "ENTER THE TOWER".
- Kenney (https://kenney.nl/): headline "Thousands of completely free game assets for you to use." Sections are imperatives: "Get exclusives", "Get started quickly", "Let's create together". Release line: "Pixross Remastered" / "Now available, $3.99!"
- Blendo Games (https://blendogames.com/): "Delicious hand-crafted video games. Est. 2010" / "You'll only get emails when a new Blendo title is released."
- Adam Saltsman (https://adamatomic.com/): a third-person bio of 76 words ("Adam's 2009 game Canabalt popularized the infinite runner genre, and was added to the permanent design collection at the New York Museum of Modern Art. He now lives in the midwest, where he grew up, and continues to make big, beautiful, little, and weird games with his family."), then titles under year headings, starting with "Upcoming".
- Nitrome (https://www.nitrome.com/ , /games/badicecream/): site meta "Play free online Flash games, retro games, arcade games, puzzles games, action games, skill games and more fun games." Game meta: "Blow walls of ice to block enemies in this two player arcade game!" News in the house voice: "The Angel Cats are BACK!"; "The good ol' days of carefree gaming are back!"
- Lexaloffle (https://www.lexaloffle.com/): the home page is product names and navigation; the only prose is a build stamp in the footer ("Generated 2026-11-16 15:48:39 | 0.002s | Q:0").

### 4.16 Not reached

- neal.fun: HTTP 403 to curl and WebFetch, and a "Performing security verification" page in headless Chrome.
- Simon Tatham's own page: see 4.1.
- Sokpop's own site, Daniel Linssen's own site, Derek Yu's and Andy Wallace's home pages: fetched, but the HTML holds no text (drawn by script or images).
- ABA Games (https://www.asahi-net.or.jp/~cs8k-cyu/): the index is titles and platform tags only; the about page returned 403.

### 4.17 Not-found pages on developer sites

Ten developer sites were sent a made-up URL:

| Site               | What came back                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| orteil.dashnet.org | A written page: "404!" / "whoops" / "Either you typed a url wrong (that's on you!) or we messed up somewhere (that's our bad, please let us know!)." |
| pippinbarr.com     | The site's own page with its navigation and the number "404"                                                                                         |
| foddy.net          | Web server default ("404 Not Found", "nginx/1.24.0 (Ubuntu)")                                                                                        |
| grapefrukt.com     | Web server default                                                                                                                                   |
| zachtronics.com    | Web server default                                                                                                                                   |
| lexaloffle.com     | Web server default ("The requested URL /nothing-here-xyz was not found on this server.")                                                             |
| smestorp.com       | Hosting company default, including advice to "the site administrator"                                                                                |
| ncase.me           | GitHub Pages default                                                                                                                                 |
| codeincomplete.com | Netlify default                                                                                                                                      |
| nitrome.com        | A page with the site title and no message                                                                                                            |

One of ten wrote anything. For comparison, of the portals in group 1: CrazyGames ("GAME OVER" / "Oops, you've reached a dead end!"), Armor Games ("404: Oh Noes!" and the Sushi Cat lines), Coolmath Games ("Oops – We couldn't find that page"), itch.io ("We couldn't find your page"), Puzzmo ("Cannot find this page.") and Poki (title "404 not found", no message in the fetched body).

---

## Patterns

Counts are over the text quoted in the notes above. Where a count comes from a word list or a judgement call, it says "about".

### One-line blurbs and taglines

The sets counted: 231 itch.io card blurbs, 39 Tatham objectives, 23 Steam short descriptions, 15 Zachtronics catalogue paragraphs, 13 Washington Post taglines, 10 App Store subtitles, 9 New York Times descriptions, 9 New Yorker descriptions, 8 LinkedIn taglines, 8 Puzzmo headlines, 8 CrazyGames shelf subtitles, 4 Google Play short descriptions.

Length falls into four bands, and each band belongs to a place on the page:

| Band            | Words    | Where it is used                                  | Examples                                                                                                                     |
| --------------- | -------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tag             | 1 to 3   | beside a title in a dense list                    | "cyberspace roguelike"; "deduction puzzle game"; "Number. Order. Logic."                                                     |
| Label           | 3 to 8   | on a card, under a name                           | Washington Post (median 4), LinkedIn (3 to 5), App Store subtitles (3 to 6), itch.io (median 7), CrazyGames shelves (4 to 9) |
| Sentence        | 8 to 17  | under a name with room, or as the description tag | New York Times (8 to 17), Tatham (6 to 17, median 11), New Yorker (3 to 11), Nicky Case                                      |
| Short paragraph | 20 to 55 | top of a game page, store header, search result   | Steam (median 31), Poki ledes (40 to 42), portal meta descriptions (22 to 28)                                                |

Opening word class:

- Imperative verb first: Tatham 39 of 39; LinkedIn 7 of 8; New York Times 5 of 9; Washington Post 5 of 13; App Store subtitles 4 of 10; Steam 4 of 23; itch.io about 40 of 231.
- Article and noun phrase first ("A …", "An …", "The …"): itch.io 79 of 231; New Yorker 5 of 9; Washington Post 3 of 13 (6 of 13 are noun phrases of some kind); App Store subtitles 6 of 10 are noun phrases; every Nicky Case and Farbs entry.
- "[Name] is a …": Steam 12 of 23 (first or second sentence); Zachtronics 7 of 15. It is rare in the label band, because the name is already printed beside the label.
- A question: New Yorker 4 of 9; New York Times 2 of 9; Steam 2 of 23; itch.io 4 of 231.

So the split is by who is writing. Curated homes that write all their own lines choose one mould and keep to it (Tatham: all imperative; New Yorker: question for games, "A puzzle …" for crosswords; LinkedIn: verb and object). Open platforms where each maker writes their own line settle on the noun-phrase label.

Formulas that can be named, with the sources that use them:

1. The rule as an order: "[Verb] [the thing] [the constraint]." Tatham ("Find all the mines without treading on any of them."), New York Times ("Guess the hidden word in 6 tries."), Washington Post ("Match tiles to clear the board"), LinkedIn ("Crown each region"). The constraint clause does the work.
2. The label: "A [one or two adjectives] [genre] [with / about / for …]". itch.io ("A friendly and forgiving solitaire variant."), Farbs, Sokpop ("A garden RTS"), New Yorker ("A puzzle for lovers of wily wordplay.").
3. "A game about [gerund]": ISLANDERS ("about building cities on colorful islands"), Mini Metro, A Good Snowman ("about being a monster and making snowmen"), Orteil ("A game about ruling the world and not starving to death."), Daniel Linssen ("a game about having a little bit, but not too much"), Nicky Case.
4. The cross: "[known game] but [change]", "X meets Y", "X + Y". Puzzmo 4 of 8 ("chess, but with chaos"), itch.io 21 of 231 ("Minesweeper but it's a roguelike."), 14 Minesweeper Variants, Peglin ("plays like a combination of Peggle and Slay the Spire"), Sokpop ("tower defense meets yahtzee"), Zach Gage ("just like chess, but with totally random pieces"), LinkedIn ("The classic game, made mini").
5. The challenge as a question: "Can you …?", "How long can you …?", "How many …?". New Yorker, Spelling Bee, Coolmath's closers, Mini Metro, Pocket-Run Pool.
6. Clipped fragments, usually three: "Number. Order. Logic."; "BUILD CIRCUITS. WRITE CODE. RTFM."; "RIDE. SCRAP. BURN."; "No ads. No in-app purchases. No interruptions."; "Read the clues. Build a kingdom. Fight what you uncover."
7. Definition, then a dry second line: "…and try not to die in the process." (Infinifactory); "Clearing the board feels really good." (SpellTower); "(We won't judge, promise.)" (Orteil); "Bleak." (Farbs); "Finally!" (Mamono Mower).
8. Slogan, then definition: "The poker roguelike. Balatro is a …"; "NO ENGINEERING, ALL PROCRASTINATION! SHENZHEN SOLITAIRE is a …".
9. The mood tag, which says nothing of the rules: "ludic elegy"; "Word puzzles with Sunday morning vibes"; "Have a stress-free moment, courtesy of our soothing matching game."

Punctuation and mechanics:

- A label made of one phrase takes no full stop: LinkedIn 8 of 8, single-phrase Washington Post lines, App Store subtitles, 118 of 231 on itch.io. A line made of whole sentences keeps its stops: New York Times 11 of 11, Tatham 39 of 39. The New Yorker puts a full stop on fragments too.
- Exclamation marks: none in the New York Times (11 lines), Washington Post (13), New Yorker (9), LinkedIn (8) or Tatham (39). 40 of 231 on itch.io end on one; 9 of 23 Steam descriptions contain one; 3 of 10 App Store subtitles end on one, two of them from large publishers. Portal title tags nearly all carry one ("Play Now!").
- A number that is a fact of the game is a numeral: "6 tries", "7 letters", "5x5", "21 wins automatically", "7 levels", "40-card", "120 variants". The New Yorker and Puzzmo spell numbers out in running text.
- Second person is the default where a person is addressed at all; 37 of 231 itch.io blurbs use "you" or "your".
- Praise words are scarce in short text written by makers: 5 of 231 itch.io blurbs contain "classic", "addictive", "best" or "fun". "free" appears in 4 of 231.

What one-liners leave out: the platform, the price, the controls, the maker's name (exceptions: "A new solitaire by Zach Gage", Super Hexagon, Bongo), how long a game takes, and any claim of quality. On curated homes they also leave out the word "game" (LinkedIn uses it once in eight, the Washington Post twice in thirteen).

### Long descriptions

Length by source:

| Source                               | Words                                                        | Paragraphs before any list |
| ------------------------------------ | ------------------------------------------------------------ | -------------------------- |
| itch.io game pages (7 read)          | two lines to about 250 words                                 | 1 to 3                     |
| Armor Games, developer text (3 read) | about 90 to 150                                              | 3 to 5                     |
| Steam "About this game" (23 read)    | 12 to 604; typical 100 to 300                                | 1 to 3                     |
| App Store, small developers          | 95 to 250                                                    | 1 to 2                     |
| App Store, large publishers          | 285 to 635                                                   | 2 to 3                     |
| App Store, Zach Gage (2 read)        | 468 and 656                                                  | 3, as short separate lines |
| Poki, new template                   | lede 40 to 42, then about 300                                | 1 (the lede)               |
| CrazyGames, Coolmath Games           | lede 34 to 82, then several hundred of tips, history and FAQ | 1 to 4                     |

What comes first, over the long descriptions read:

- A definition sentence, "[Name] is a [genre] where you …": Poki's new ledes, all three CrazyGames pages, Steam 12 of 23, Kenney Solitaire, Ducky Sokoban DX, Frogs Aren't Fresh.
- The goal as an order: Coolmath (Snake, Minesweeper), Poki's Brick Breaker, Breakout 71, holedown, the "How to play" blocks of MobilityWare and Bricks Breaker Quest.
- A premise in the game's world: Peglin, The Solitaire Conspiracy, How Hungry?, Lucas Pope's games, EXAPUNKS.
- A claim about the maker or the audience: MobilityWare ("the ORIGINAL maker"), Microsoft ("Join millions of players"), Easybrain ("one of the most downloaded"). Only the large publishers open this way.

What comes second is how you play, in one to three imperative sentences. The best of these state the whole rule: "Tap or drag cards to arrange them in descending order with alternating colors."; "Stack cards by alternating colors with descending values."; "Use the numbers you find to figure out where the mines are: each number tells you how many of the surrounding 8 tiles … are mines."

For a version of a well-known game, the strongest second paragraph says what differs from the version the reader knows: "Coolmath’s Snake game is different from most. When you eat an apple, your tail grows by four blocks instead of the usual one."; "In Flipflop you can stack down, up, or even both ways on a single stack!"; "This updated version of Atari Breakout features power-ups that float towards you."

Feature lists come in three forms and a page keeps to one:

- Bare noun phrases, 2 to 6 words, no verbs: "1-card and 3-card drawing", "Card & background themes", "First tap luck", "5 levels of difficulty". Small developers.
- "Label: sentence": "Daily Challenge: Play a new card layout each day, with the same cards for every player."; "Winning Deals: Play deals where you know there is at least one winning solution"; the Zachtronics collection's one line per included game. Portals and publishers.
- Imperatives: "Collect and upgrade powerful orbs and relics …" (Peglin). Less common.

Lists run 3 to 8 items. The more items, the more of them are generic ("Achievement & leaderboard supported", "Tablet device supported").

One claim recurs across solitaire and logic-puzzle listings: a countable promise of fairness. "Every deal has a solution" (Poki); "Every deal can be completed" (Kenney); "Over 98% of deals are solvable!" (SHENZHEN SOLITAIRE); "100% of deals are solvable!" (Flipflop Solitaire); "Play deals where you know there is at least one winning solution" (MobilityWare); "guaranteed solvable decks" (CrazyGames); "Every level can be completed by logic. Guessing is not required." (14 Minesweeper Variants); "each puzzle has one solution" (Sudoku.com); "Your first square will never be a mine" (Coolmath); "First tap luck" (Minesweeper Q). Ten sources, large and small. It is the one feature claim that both registers make, and the small developers make it shortest.

Closers:

- A question that restates the challenge: Coolmath (all three games), Mini Metro, Pocket-Run Pool.
- A call to act: "Install to play now!", "Play now!", "Start exploring our massive game library now …". Portals and publishers only.
- A wish or thanks, in the first person: "I hope you enjoy it :)", "We hope you enjoy our game!", "I hope you enjoy Sage Solitaire." Small developers only.
- Nothing. Hexcells, Super Hexagon and most itch.io pages stop when the facts run out.

Controls are a separate block, never part of the description: "Key: Action" (Kenney), "Key = Action" (How Hungry?), "Key to action" (Ducky), or a table of action then key with dot leaders (Lucas Pope). Portals give one generic line ("Click or tap to play!").

### Category and site-level copy

Site self-description. The common form is "[Site] is a [kind of place] where/for [what you can do]", in 14 to 28 words:

- itch.io, 14: "itch.io is a simple way to find and share indie games online for free."
- Kongregate, 17: "Kongregate is a portal for free online games that features user-created content, chat, badges, and player achievements."
- Poki, 26: "Poki is a platform where you can play free online games instantly in your browser. No installs, no downloads, just click and play on any device."
- Apple Arcade, 26: "Apple Arcade is a game subscription service with hundreds of fun games — all without ads or in-app purchases. Share with up to five family members."

Small studios and curated homes use a slogan of 3 to 7 words in its place: "The place for thoughtful puzzles." (Puzzmo); "Lovingly Crafted Puzzle Games Since 2013" (Draknek & Friends); "better games for better people" (grapefrukt); "Delicious hand-crafted video games. Est. 2010" (Blendo); "video games and other fun things" (DashNet); "video game collective" (Sokpop); "Let the world play" (Poki's footer).

The promise is most often made as an absence. "No installs, no downloads" (Poki); "no hassle, no downloads" (CrazyGames); "No ads. No in-app purchases. No interruptions." (Apple Arcade); "no violence, no empty action" (Coolmath); "It will always be free, with no ads, and playable offline." (Tatham's Android port); "No cookies." (Foddy); "Nothing on this website is AI-generated." (Hempuli). Seven sources.

Portal title tags are built from the same four words, "Free", "Online", "Games" and "Play": "Free Online Games at Poki - Play Now!"; "Free Online Games on CrazyGames | Play Now!"; "Play Free Games Online at Armor Games"; "Play Free Online Games on Kongregate – The Ultimate Gaming Platform"; "Cool Math Games - Free Online Games for Learning and Fun". Newspapers use "Name — Publication". Developer sites use the maker's name, or a line of their own ("the complete works of zach gage", "It's Nicky Case!", "brog", "Mady Maek Game").

Category descriptions:

- Length: one to three sentences, 16 to 45 words, before any padding: Kongregate 16, CrazyGames 20 and 25, Poki 23 (first paragraph), Coolmath 25 to 37, Armor Games 45.
- Opening move: a definition (Poki: "Puzzle games challenge your problem-solving skills."), an invitation (CrazyGames: "Play a range of fun card games …"; Coolmath: "Shuffle the cards up and start playing …"; Kongregate: "Explore our collection of Puzzle games."), or a dare (Armor Games: "Prepare to achieve greatness with these tricky titles or scratch your head in dismay.").
- Then a count with a plus sign ("250+", "20+") and two to four games by name. The names are there to be links.
- Then, on the portals, an essay: types, history, FAQ. Poki's is the most useful of these because each type gets a mechanic stated as an order and each recommended game gets a one-line reason.
- Category names are Title Case and end in "Games" on portals ("Puzzle Games", "Card Games"). Shelves named for a mood are sentence case ("Just relax", "5-minute fun", "With friends") and get a subtitle of 4 to 9 words.
- Newspaper homes have no categories and no category copy. The Washington Post has one shelf label for everything it did not make: "Other popular games".

### Developer and portfolio write-ups

About 30 developer and small-studio sites were read.

The bio is one or two sentences:

- Third person, 9 to 15 words, "[Name] is an independent game [designer/developer] based in [place].": Foddy, Farbs, Orteil (in his own words: "some European dude"), Alan Hazelden's description tag. Adam Saltsman's runs to 76 words. Maddy Thorson's makes fun of the form.
- First person with a greeting, "Hi, I'm [Name]. I make …": Michael Brough, Nicky Case, Terry Cavanagh, Tom Francis, Thomas Brush, Jez, Hempuli, Jake Gordon, and without the greeting Ian MacLarty, Alan Hazelden, Noel Berry, Thomas van den Berg, grapefrukt. About two first-person bios for every third-person one.
- The place where the person lives is nearly always given. The verb is "make" far more often than "develop" or "create".
- Achievements are stated as facts with a number or a named institution, not as adjectives: "It's in the permanent collection in New York's Museum of Modern Art."; "igf finalist 2014"; "10k reviews, 98% positive"; "I've released over 40 small non-commercial works".

The list of work:

- Order is newest first, with the year on every entry, on about ten of the sites with a list (Ian MacLarty, Adam Saltsman, Nicky Case, Zach Gage, Farbs, Lucas Pope, Pippin Barr, Orteil, noio, Maddy Thorson).
- Other orders are stated: by money ("Games for sale" / "Freeware"; "available to buy" / "available for free"; "COMMERCIAL GAMES" / "BACK CATALOGUE"), or by the maker's own judgement ("roughly in order from best to worst"; "here are my own favourites"; "my current top-five"; "Experiments (unfinished, broken, or just plain bad)").
- About nine of the sites give titles and nothing else: Foddy, Ian MacLarty, Noel Berry, Maddy Thorson, increpare, ABA Games, Hempuli's list, Jake Gordon, Terry Cavanagh. On a personal site, no description at all is a common choice.
- Where there is a description it is one to three sentences. The first is a noun phrase beginning "A" that names the kind of thing ("A 2D neon space game where you and your friends snap rocket parts together and fly around."). The second says what is notable or odd. The third, if any, is a verdict or where to play it.
- Nicky Case's single mould, "title – a [kind] about [subject]", holds for every entry across games, tools, talks and essays.

Technical detail:

- It has a fixed slot, and the slot is small: a footer line per game ("Made with HaxeFlixel"), one line for the whole site ("Nearly all the games here are Fueled by Fusion."), a credits line ("Game implemented using Löve2D"), a tag ("PICO-8", "HTML5", "puzzlescript"), or the title itself ("HTML5 Breakout").
- In prose it appears as one clause, and only where it explains something a player can notice: "rebuilt entirely in JavaScript so it runs in browser again and is properly multiplayer"; "The game is super lightweight, it's all handwritten javascript and mostly procedural."
- Time taken is given more readily than tools: "Developed in 48 hours"; "made in 2 days for a pal"; "made in 24 hours"; "a short, single weekend project".
- Framework versions, architecture and test coverage are not mentioned on any game's public description. Jake Gordon, whose site is an engineer's, puts all of it in separate articles linked as "Read More".
- Source code is a link label, not a sentence: "Source Code", "SOURCE", "You can find the source here".

First person: the pitch for a game is in "you"; anything about making it is in "I" and sits apart from the pitch, after a rule (Zach Gage), under "Notes" (Lucas Pope), or as the last sentence (Farbs, Orteil).

Old and unfinished work is kept on the list and labelled in plain words: "[Alpha]"; "(Incomplete)"; "(in progress)"; "(old)"; "Unfinished game"; "A bit bad, a bit unfinished."; "Requires Flash."; "RIP Flash."; "sadly now defunct"; "it's a work in progress, sorry!"; "now largely dormant"; "This version has bugs!"; "the further back you scroll, the cringier it gets". Nobody in the set hides old work, and nobody dresses it up. Gaps are admitted too: "nothing. burnout. :(".

A portfolio beside a CV (Jake Gordon is the one clear case): the games get one clause in the professional summary ("with the occasional game on the side"), a page of their own, and a sentence that frames them as craft practice ("these are just side projects for me to play with some basic game mechanics and learn a little game programming"). The CV itself is prose paragraphs that start with the role ("As the founding engineer at …, I …").

### Site furniture

Not-found pages:

- Portals and curated homes: 5 of 6 have a written message. Solo developers: 1 of 10; the rest serve the web server's or host's default page.
- The written ones follow one order: an exclamation ("Oops", "Ooops!", "Oh Noes!", "whoops" in 4 of 6), a plain statement ("The page you're looking for doesn't exist."), then a way out ("Go back home", "Go home", "try using the search box in the header").
- Two use the site's subject: "GAME OVER" (CrazyGames) and "Sushi Cat gets lost sometimes, too." (Armor Games). Both still give the plain statement and the link.
- The plainest are six and four words: "We couldn't find your page" (itch.io); "Cannot find this page." (Puzzmo).
- Orteil's is the only one that assigns blame, to both sides, and asks for a report.

Footers:

- Corporate: copyright, year, and legal links separated by a middle dot or bar.
- A slogan repeated: "Let the world play"; "The place for thoughtful puzzles."
- A one-line definition of the site (Kongregate).
- On personal sites, a statement of principle or thanks in a few words: "No cookies."; "Nothing on this website is AI-generated."; "★ Thanks for checkin' out my site ★"; "Thanks for visiting! <3".

Prompts and empty states:

- Search boxes ask a question or give an order: "What are you playing today?" (Poki); "Search for your favorite games..." (Kongregate).
- Empty content is an invitation to fill it: "Suggest description for this tag"; "Upload your games to itch.io to have them show up here."; "Play your first game!"; "Log in to save XP".
- Status on a card is one word: "Unplayed", "Bonus", "Experimental", "Hot", "Top", "new".
- Waiting: "We’ll be back after this short break" (Poki, before an advert); "Just a moment while your advertisement loads" (Coolmath).

Not-yet and no-longer:

- The words "coming soon" are not used as a label on any game in the set. They occur three times in everything fetched: Apple's name for a store section, one sentence in a blog post, and a reply in a comment thread.
- What is used: "Upcoming" (a list heading), "new game" (a nameless entry), "(in progress)", "[Alpha]", "(Free Demo)", "[DEMO]", "(jam version)", "beta", "coming to Steam, Switch & Mobile", "Now available, $3.99!", "is here!", "our new dominoes game".
- Dates of change are shown as data on portals ("updated Nov 2026", "Latest update", "Last Updated") and as a date under each game on Lucas Pope's page.

Mailing-list lines are a small genre of their own, and all promise restraint: "I'll only ever email you if I release a new game."; "I only send emails when I release something new."; "You'll only get emails when a new Blendo title is released."; "To be told when we release something"; "Sign up to my mailing list to receive an email when I release something new."; "max 1 update per month"; "In 10 years I've sent 7 emails." Seven sites.

Link and button labels: "Play Now"; "Play today’s game »"; "Solve the latest puzzle »"; "buy here"; "Get the game"; "Source Code"; "Read More"; and platform names used as the label ("Browser", "Steam", "Download (Windows)").

### Register by source group

Big portal copy written for search (CrazyGames game and category bodies, Kongregate's welcome, the Play Store text of MobilityWare and Easybrain, the older layers of Poki). It reads as boilerplate, and these are the marks:

- The game's or category's name is repeated in every paragraph and every heading. "Solitaire" five times in two sentences.
- "free", "online", "browser" and "no download" arrive in the first two sentences whatever the game.
- Sentences survive having another game's name swapped in: "Users can have hours of fun playing this classic card game."; "we have something for every gamer".
- Paired or tripled abstractions: "fun and enjoyment"; "strategy, planning, and card management skills"; "smooth and responsive controls, and a clean, premium interface".
- The audience-spanning sentence: "Whether you’re a casual player or someone who enjoys thoughtful, strategic gameplay, …"; "Whether you enjoy competitive strategy games, fast-paced arcade thrills, or relaxing puzzles, …".
- Invitation verbs with nothing from the game as their object: Experience, Enjoy, Discover, Explore, Immerse.
- Superlatives with no source: "certainly one of the best", "the best online games website", "The Ultimate Gaming Platform", "legendary", "iconic".
- Title Case sentences, emoji in title tags, capitals for emphasis (ORIGINAL, MORE, FREE).
- A history paragraph and an FAQ that answers what the page has already said.

Portal copy that reads as written by someone who played the game (Poki's new ledes and category pages, Coolmath's openings, CrazyGames' shelf subtitles and 404). The difference is in what the sentences are made of: the goal, the losing condition, one number, one thing that is different. "Launch a ball upward and smash through row after row of bricks before any of them reach the bottom of the screen." "When you eat an apple, your tail grows by four blocks instead of the usual one." The same sites carry both kinds, often on one page; the tight text is the first 40 words and the padding is below it.

Indie store pages (Steam and App Store listings by one to five people; itch.io; developer text on Armor Games). Mostly a person's voice. The marks: one definition sentence and no second attempt at it; counts in place of adjectives ("36 levels", "over 70,000"); a hedge or an admitted limit ("a somewhat wide selection", "fairly standard", "Without the polish, it’s a little ugly"); one joke that depends on the game; a note from the maker in "I" or "we"; an ending that just stops. The weak spots are the same few borrowed words ("unique", "challenging", "addictive" with an apology attached) and feature lists that pad out to eight.

Indie pages written by or for a publisher (holedown's long text, Breakout: Recharged, Shatter Remastered Deluxe, Solitaire Stories). Polished and impersonal: participle chains ("traversing your way", "picking up game-changing power-ups along the way"), stacked compound adjectives, "award-winning", "stunning". The maker's own short lines for the same game are often better than the long text ("A Ball Bouncer With Depth").

Newspaper and curated game homes (New York Times, Washington Post, New Yorker, LinkedIn; the headlines on Puzzmo). The most disciplined writing in the study and plainly edited: the rule in 17 words or fewer; no exclamation marks in 41 one-line descriptions; no "free" or "addictive", and "fun" once (The Mini); one mould per site; cadence stated ("A new puzzle is available each day."); people credited by name. Wit is allowed one small turn per line ("a numbers game, minus the math"; "One word to spell ’em all"; "A puzzle with a few clues loose."). The Guardian goes further and describes nothing at all. Puzzmo's body paragraphs slip back into search copy.

Solo developers' own sites. The most personal and the least consistent. The marks of the voice: lower case; first person; frankness about pace, quality and money ("I'm slow to respond to email"; "A bit bad, a bit unfinished."; "Play it now while I can still afford the servers!"); attributed or undercut praise; very short descriptions or none. What is missing is everything a portal does by template: descriptions for every game, a not-found page, consistent capitalisation, alt text and metadata.

What in the text makes the difference, in short:

1. A detail that could only be about this game: "grows by four blocks"; "8 Knights, 4 Bishops, and 3 pawns"; "infinite skeletons"; "Over 98% of deals".
2. A stated limit or hedge.
3. An opinion owned by someone.
4. Uneven rhythm: a long sentence, then a short one. "Bleak."
5. Saying less than there is room for.
6. The swap test: if the sentence is still true with another game's name in it, it is boilerplate.

---

## Outliers worth stealing from

- Tatham's two fields per puzzle: a label of two to five words ("Mine-finding puzzle") and one imperative sentence that is the objective ("Find all the mines without treading on any of them."). Thirty-nine puzzles, one mould, no praise, and each line still tells its puzzle from the others.
- LinkedIn's verbs that echo the game's name: Queens "Crown each region", Patches "Piece it together", Tango "Harmonize the grid".
- The Washington Post's "Number. Order. Logic." for Sudoku: three nouns, no verb, and the whole game is there.
- The New Yorker's two moulds, "Can you …?" and "A puzzle …", and its small jokes inside them ("A puzzle with a few clues loose.").
- Poki's "Reason" column on a category page: one line per recommended game saying why it is in this list ("Sort colors at your own pace with no timers or penalties").
- Puzzmo's second sentence that names a feeling in plain words: "Clearing the board feels really good."
- Coolmath's paragraph on what is different about its own version of a classic, with the number.
- Coolmath's named reviewer on every game page, and its plain notice about adverts it cannot remove.
- SHENZHEN SOLITAIRE's bullets: a joke with a real statistic inside it, and a note telling some readers they do not need to buy the game.
- 14 Minesweeper Variants: "The title explains what it is." Then numbered features as plain sentences, including "Guessing is not required."
- Super Hexagon: one factual line, then a list of true and useless facts about hexagons in place of features.
- Mini Metro's last paragraph, which describes losing: "Eventually your network will fail. Stations will open too quickly. Commuters will crowd the platforms. How long the city keeps moving is up to you."
- Zach Gage's project page: a three-line catalogue header (title; name and year; medium), the pitch, a rule, then the design problem in the first person. And his habit of explaining a rule by one example with numbers.
- Orteil's section headings with a bracketed aside, and his third line per entry that tells the truth about the thing ("Probably what we're most well-known for.").
- Farbs's entry order: what it is, what is odd about it, whether and where you can still play it. Also "(Incomplete)" in the title, and "Won some awards."
- Nicky Case's empty years, filled in honestly, and the one-mould list that makes unlike projects comparable.
- Lucas Pope's exact labels for old builds ("the last public beta from early 2013"), fix lists, and "Made with …" as the last line of each entry.
- Daniel Linssen's ordering note: "(roughly in order from best to worst)".
- Michael Brough's mailing-list line with its own statistics, and Bennett Foddy's two-word footer, "No cookies."
- The Android port of Tatham's puzzles: "It will always be free, with no ads, and playable offline." A promise in one sentence, made of three absences.
- Armor Games' not-found page: the practical way out first, then the house character.
- A Good Snowman's credits as a sentence: "Lovingly crafted by the mind of Alan Hazelden and the hands of Benjamin Davis".
- Suspicious Developments' explanation of why the page has fewer jokes than it used to.
- holedown's three different lines for three places: a joke on Steam, a pun as the App Store subtitle, a table of facts on its own site.
- Pippin Barr's blurbs, as a catalogue of what to avoid: they are funny because every device in them is real portal copy.
- Apple Arcade's promise by subtraction, in three clipped sentences.

---

## Things almost nobody does

- Write a not-found page on a personal site. One developer in ten did.
- Use an exclamation mark in newspaper game copy. None in the 41 one-line game descriptions across four publications.
- Use "coming soon" as a label. Not once on a game in the set.
- Put controls in a blurb or tagline. Controls always have their own block.
- Describe the technology in the public description of a game. It is a tag, a footer line or a separate article. No source names a framework version.
- Say how long a game takes. Found about five times: "5x5 bite-sized", "you can solve it in seconds", "5-minute fun", "30-60 minutes of gameplay", "40+ hour campaign".
- Describe losing, or what ends a game. Mini Metro, Tatham ("without treading on any of them"), Coolmath ("don't hit the wall") and Poki's Brick Breaker do. Most descriptions mention only winning.
- State difficulty plainly. "A challenging puzzle." (New Yorker) and Poki's FAQ on its hardest games are the exceptions; elsewhere "challenging" is decoration.
- Mention accessibility. The word appeared only as a metadata field on one itch.io page (the field "Accessibility", with the value "Color-blind friendly"). The nearest thing in a description is one settings bullet in MobilityWare's listing ("Play right or left-handed, portrait or landscape"). No description read mentions colour-blind play, contrast or screen readers.
- Mention privacy or data on a game's own page. Foddy's "No cookies." and the "no ads" promises are the nearest.
- Say what a game does not have, apart from adverts and downloads. "Guessing is not required." is the rare case of a design absence stated as a feature.
- Credit a named individual on a portal or newspaper page. Developer studios are credited everywhere ("by Playtouch"); people are named only in Coolmath's reviewer line, the New York Times's editor line, and Puzzmo's and the New Yorker's constructor bylines.
- Use the first person singular on a portal. It appears only where the portal prints the developer's own text.
- Call a game "addictive" without a qualifier outside the large publishers. The small developers who use the word hedge it: "oddly addictive"; "Has been described as dangerously addictive."; "as addictive (and frustrating) as the original".
- Spell out numbers. The New Yorker, Puzzmo's running text, Snakebird ("Over fifty") and Zachtronics ("seven") do; everyone else uses numerals, including for small counts.
- Use a semicolon in a sentence. Two in the prose quoted here (Orteil, grapefrukt), both on personal sites.
- Use emoji in body copy. 6 of 231 itch.io blurbs and two of Sokpop's; on portals only in title tags, meta descriptions and ratings.
- Explain a pun, or use more than one per line.
- Open with a rhetorical question outside boilerplate. Snakebird and ISLANDERS do it with a joke; Kongregate does it without one.
- Give the same game deliberately different text for different places. holedown and Zach Gage's games do; most reuse one paragraph everywhere, as Microsoft does word for word across two stores.
- Rank their own work in public. Daniel Linssen, Terry Cavanagh, Pippin Barr and Orteil do.
- Apologise for the site. Terry Cavanagh does ("it's a work in progress, sorry!"); Jake Gordon marks his as dormant. Everyone else says nothing.
