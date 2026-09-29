# Blurb website

Public website for Blurb: the product page, user guide, support and privacy policy.

## EduProfix

The desktop-browser game is available at `/eduprofix/`. It is a static export of EduProfix restoration v0.7.0 with its models, textures and question data. No Node server or installer is needed on the website. The race supports widescreen displays, with a tribute to the original developers above the game. WASD or arrow keys drive, Escape pauses, and progress is stored locally in the visitor's browser. The Blurb product homepage is unchanged.

Game source lives in two private repositories: [Classic](https://github.com/swimxd/eduprofix) and [World Game](https://github.com/swimxd/world-game). This repository only pins their commits in `game-releases.json`. The build fetches those exact commits, runs their tests and exports, and assembles the website into `dist/`. Only `dist/` is deployed. Each game's `build.json` records its source repository and commit. Game assets remain scoped to their existing route.

- [Website](https://blurb.fyi/)
- [User guide](https://blurb.fyi/guide)
- [Support](https://blurb.fyi/support)
- [Privacy](https://blurb.fyi/privacy)

Plain HTML and CSS, without a framework or tracking; hero playback uses a small local script. A Cloudflare Worker publishes `main` at blurb.fyi on every push (Workers Builds, configured in `wrangler.jsonc`) and serves clean URLs (`/guide` for `guide.html`). GitHub Pages still serves the old address, `swimxd.github.io/blurb-website/`. A small script at the top of every page sends visitors there to the same page on blurb.fyi, so links in older app builds keep working. Don't add a `CNAME` file; Cloudflare owns the domain.

## Editing

- `index.html` is the product page. `guide.html`, `support.html` and `privacy.html` share the help layout: a sidebar plus an article. The header, sidebar and footer are repeated in each file, so change all of them together.
- Colors in `styles.css` mirror the app theme (`colors.xml` in the app repository's `res/values` and `res/values-night`).
- Internal links are relative and extensionless (`guide#pro`) so they work on both hosts. `404.html` uses root paths because it can be served at any URL.
- Keep the guide's section IDs (`#setup`, `#engines`, `#timing`, `#reading`, `#apps`, `#pro`, `#troubleshooting`, `#privacy`); the app and older pages link to them.
- The privacy policy must say the same thing as the app's `app/src/main/assets/privacy-policy.txt`. Update both together.
- Build with `npm run build`, run `npm test`, then preview locally with `npm run preview` (Node 22+, no install needed). Open http://127.0.0.1:4173. Check a phone-width window and both color themes.

## When Blurb goes live on Google Play

Each page shows a "Coming soon to Google Play" pill. Replace every copy with the live link in one pass:

```bash
sed -i 's#<span class="play play-soon">Coming soon to Google Play</span>#<a class="play" href="https://play.google.com/store/apps/details?id=com.notifsummarizer.app">Get it on Google Play</a>#g' *.html
```

Then update the sentence in the closing section of `index.html` that says Blurb is coming to Google Play.

This repository does not host app source, build instructions, private diagnostics or APK downloads.

## Hero reel

The hero plays the 29.4-second v6 reel silently once, then holds the last frame. Visitors can replay, toggle sound, enter fullscreen, or restart with sound. Reduced motion, data saving and blocked autoplay keep a summary-scene poster until explicit playback. Leaving the viewport or hiding the tab pauses playback without erasing a deliberate pause. A text walkthrough and native controls provide fallbacks.

- `hero-player.js` contains the small playback controller. Run `npm test` after building for intent/lifecycle and game integration checks.
- `media/` contains the two web MP4s and poster. Mobile browsers can select the 720p source; desktop uses 1080p. Each asset is below Cloudflare's 25 MiB limit.
- `showreel/README.md` describes the editable animation, original score and portable rendering workflow. Source, audio stems, tools and tests are not copied into the deployed dist directory.
- The local preview is review-only. Publishing to `main` deploys automatically and remains a separate step.

For manual browser QA, run `node tools/qa-fixtures.mjs`, then open `/tests/browser/?mode=reduced&theme=light` on the local preview. Modes are `normal`, `reduced`, `save`, `blocked`, `native`, and `failure`; themes are `light` and `dark`. These generated fixtures use the real hero and playback script, with narrow preference/failure shims. They are ignored by Git and excluded from hosting. Use `npm test` for the queued native-media-event regressions as well as the playback intent checks.

The bonus edition is available at `/eduprofix_remastered/`: four new maps, four new vehicles, all available immediately. Its progress and saved races are separate from Classic. Both editions share the corrected Turbo steering, keyboard controls, questions and race rules. Each route is a self-contained static export.

## Updating a game

1. Commit changes in its private game repository and wait for its Check game workflow to pass.
2. Update that repository's full commit SHA in `game-releases.json`.
3. Run `npm run build` and `npm test`, preview both game routes, then push this website change to main. Workers Builds performs the same build and tests before deploying. A failed fetch or test leaves the current live deployment intact.

Local builds use your authenticated Git credential helper. Cloudflare production Builds stores `EDUPROFIX_DEPLOY_KEY_B64` and `WORLD_GAME_DEPLOY_KEY_B64` as secrets, each containing a base64-encoded read-only SSH deploy key scoped to the matching repository. The keys are written only to a temporary directory during fetching, with strict GitHub host-key verification, and are removed afterward. Never put keys in Git or runtime assets. Preview builds require the same read-only secrets in their own build configuration; do not expose them to untrusted branches.

A future standalone game domain can build the corresponding game repository with `BASE_PATH=/` and serve its `dist/` directory. Until then the public URLs remain `/eduprofix/` and `/eduprofix_remastered/` on blurb.fyi.
