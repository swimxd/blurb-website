# Blurb website

Public website for Blurb: the product page, user guide, support and privacy policy.

- [Website](https://blurb.fyi/)
- [User guide](https://blurb.fyi/guide)
- [Support](https://blurb.fyi/support)
- [Privacy](https://blurb.fyi/privacy)

Plain HTML and CSS, with no build step, framework or tracking. Cloudflare Pages publishes `main` at blurb.fyi and serves clean URLs (`/guide` for `guide.html`). GitHub Pages still serves the old address, `swimxd.github.io/blurb-website/`. A small script at the top of every page sends visitors there to the same page on blurb.fyi, so links in older app builds keep working. Don't add a `CNAME` file; Cloudflare owns the domain.

## Editing

- `index.html` is the product page. `guide.html`, `support.html` and `privacy.html` share the help layout: a sidebar plus an article. The header, sidebar and footer are repeated in each file, so change all of them together.
- Colors in `styles.css` mirror the app theme (`colors.xml` in the app repository's `res/values` and `res/values-night`).
- Internal links are relative and extensionless (`guide#pro`) so they work on both hosts. `404.html` uses root paths because it can be served at any URL.
- Keep the guide's section IDs (`#setup`, `#engines`, `#timing`, `#reading`, `#apps`, `#pro`, `#troubleshooting`, `#privacy`); the app and older pages link to them.
- The privacy policy must say the same thing as the app's `app/src/main/assets/privacy-policy.txt`. Update both together.
- Preview locally with `npx serve` (it handles clean URLs). Check a phone-width window and dark mode.

## When Blurb goes live on Google Play

Each page shows a "Coming soon to Google Play" pill. Replace every copy with the live link in one pass:

```bash
sed -i 's#<span class="play play-soon">Coming soon to Google Play</span>#<a class="play" href="https://play.google.com/store/apps/details?id=com.notifsummarizer.app">Get it on Google Play</a>#g' *.html
```

Then update the sentence in the closing section of `index.html` that says Blurb is coming to Google Play.

This repository does not host app source, build instructions, private diagnostics or APK downloads.
