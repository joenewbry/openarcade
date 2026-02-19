# OpenArcade Distribution Playbook

A repeatable playbook for driving traffic to `arcade.digitalsurfacelabs.com`.

---

## Principles

- **Lead with one game at a time.** Don't post "183 games" — post "here's Tempest rebuilt in 200 lines of canvas."
- **Show, don't tell.** A GIF or short video in the post beats any description.
- **Post Tuesday–Thursday, 9–11am PT** — peak engagement on most platforms.
- **One platform per day.** Don't shotgun all at once; stagger by 1–2 days.

---

## Reddit

### Best subreddits (in order of fit)
1. **r/webgames** — ideal, exactly the audience
2. **r/playmygame** — active indie devs + players
3. **r/indiegaming** — slightly broader, okay for polished posts
4. **r/javascript** (if posting about the tech) — discuss the canvas engine
5. **r/gamedev** — dev-focused, lead with "how I built X"

### Post format

**Title:**
> Play [Game Name] in your browser — rebuilt from scratch with HTML5 Canvas

**Body:**
```
GIF/screenshot of gameplay (upload directly, don't link)

[1-2 sentences on what makes this version special — neon glow, particles, etc.]

Link: https://arcade.digitalsurfacelabs.com/[game]/

Controls: Arrow keys + Space. No install, no login, no ads.

Source: [GitHub link if public]
```

### Rules
- Read each subreddit's rules before posting — r/playmygame requires a playable link in the title or flair.
- Don't cross-post the same game to multiple subs on the same day; wait 48h.
- Respond to every comment in the first 2 hours.
- After traction: post a follow-up "devlog" to r/gamedev about the visual design choices.

---

## Hacker News

### Show HN post (do once, not per-game)

**Title:**
> Show HN: OpenArcade – 183 classic browser games, rebuilt from scratch in Canvas 2D

**Comment body:**
```
Each game is a single self-contained HTML file — no build step, no framework,
no external assets. The design philosophy: every game should be under 1,000 lines
and visually distinct (neon arcade, pixel art, vector wireframe, etc.).

Live: https://arcade.digitalsurfacelabs.com
Source: [GitHub URL]

I'd especially appreciate feedback on [specific game] — that one pushed the
canvas rendering the hardest.
```

### Timing
- Post Tuesday 9am PT for best front-page visibility.
- Do not repost. If it flops, wait 6 months.
- Ask a specific technical question to seed comments ("Is there a better way to do phosphor glow on Canvas?")

---

## Twitter / X

### Thread format (one game per thread)

**Tweet 1 (hook):**
> I rebuilt [Game] in ~300 lines of vanilla JavaScript.
> No frameworks. Just a canvas and some math.
>
> [GIF of gameplay]
>
> Thread 🧵

**Tweet 2 (how it works):**
> The hardest part was [specific mechanic].
> Here's how it works: [1-2 sentences, optionally a code snippet]

**Tweet 3 (play it):**
> Try it: arcade.digitalsurfacelabs.com/[game]/
> Arrow keys + Space. No install.
>
> #gamedev #webgames #javascript #indiegame #html5

**Tweet 4 (meta — post once a week):**
> This is part of OpenArcade — 183 games, each a single HTML file.
> New game every week.
> arcade.digitalsurfacelabs.com

### Hashtags to use (pick 3–4 per tweet)
`#gamedev` `#webgames` `#indiegame` `#javascript` `#html5canvas` `#indiegaming` `#buildinpublic`

### Accounts to @mention
- @js13kGames (if game is small)
- @LesseMath (canvas art community)
- Retweet anyone who shares the link

---

## Discord

### Servers to join and post in
- **Indie Game Dev** (large) — #show-your-game channel
- **HTML5 Game Devs** — #games channel
- **Game Dev League** — #self-promo channel
- **JavaScript** servers — #projects channel

### Post format for Discord
```
🎮 **[Game Name]** — rebuilt in pure Canvas 2D

[1 line description]

Play: https://arcade.digitalsurfacelabs.com/[game]/
Controls: Arrow keys + Space | No install, no ads

[GIF attachment]
```

---

## GitHub

### One-time setup
1. Make the repo public (if not already): `Settings → Change visibility → Public`
2. Add a compelling README with:
   - Live link prominently at the top
   - Screenshot gallery (6–8 games)
   - "How to run locally" (just `open tetris/index.html`)
   - List of all 183 games with links
3. Add topics: `game`, `html5`, `canvas`, `javascript`, `arcade`, `browser-game`
4. Star the repo from your personal account to seed the count

### GitHub-native traffic drivers
- List in **Awesome Lists**: submit PRs to `awesome-javascript`, `awesome-html5-games`
- Post to **GitHub Discussions** in related repos (if they allow it)

---

## Cadence (Weeks 1–4)

| Day | Action |
|-----|--------|
| Mon | Record a 15s GIF of the best-looking game |
| Tue | Post to r/webgames + HN Show HN |
| Wed | Twitter thread about that game |
| Thu | Discord posts (2–3 servers) |
| Fri | Check analytics (`/stats/`), pick next game |
| Next Mon | Repeat with next game |

After 4 weeks: post a retrospective on r/gamedev ("I posted 4 browser games to Reddit — here's what worked").

---

## Analytics to Watch

Check `https://arcade.digitalsurfacelabs.com/stats/` after each post:
- **DAU spike** — confirm traffic arrived
- **Top games** — see what resonated
- **K-factor** — did co-op sharing increase?

Correlate spikes to posts and double down on the platforms that drove traffic.
