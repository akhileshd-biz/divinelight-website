# Divine Light website

The website for Divine Light Healing and Life Coaching:
https://divinelighthealing-lifecoach.com

This is a plain HTML and CSS site. It has no build step, framework or packages.

## What's where

| Path | What it is |
|---|---|
| `index.html` | Home page |
| `services.html`, `reiki.html`, `life-coaching.html`, `subconscious-programming.html`, `chakra-healing.html`, `emotional-detox.html`, `anxiety-support.html`, `listening-service.html` | The service pages |
| `rates.html` | Prices (keep prices in sync with the service pages) |
| `about.html`, `testimonials.html`, `contact.html`, `legal.html` | About, reviews, booking (Calendly) and the privacy/terms page |
| `assets/site.css` | All the styling |
| `assets/site.js` | Small extras: notice banner, header, Calendly embed, gentle animations |
| `assets/` (images) | Logo, photos, the link preview image (`og-image.jpg`) |
| `library.html` | The meditation and course library (browse, filter) |
| `library-relax.html` | Lesson page for the "Relax" meditation, with the audio player |
| `assets/library.css`, `assets/library.js` | Library styles, filters and the audio player |
| `media/` | Local copy of library audio for previews. Ignored by Git. |
| `scripts/build.sh`, `netlify.toml` | Netlify build: copies only website files, then downloads the audio |
| `scripts/audio-sources.txt` | Which audio files to download from Google Drive at build time |
| `sitemap.xml`, `robots.txt` | For search engines |
| `print-assets/` | Flyers, logo files and the WhatsApp flyer. **Not part of the website.** |
| `Divine-Light-*.md` | The owner's notes: audit log, print brief, upkeep guide. Not part of the website. |

## Branches

- `main` is **exactly what is live** on the website right now.
- `draft-email-signup` is the free meditation email signup. It is waiting on the meditation MP3, so it is **not live yet**. It is not finished, so don't merge it yet.
- Make every new change on its **own branch** from `main`, for example `fix-rates-typo`. Open a pull request so the change is easy to see.

## Library audio

- Library audio is **free and public** (Akhilesh decided this on 2026-11-17). It is served from `/media/` on the website.
- Audio files are too large for Git. At each build, Netlify downloads them from Google Drive, using the list in `scripts/audio-sources.txt`. Each Drive file must be shared as "Anyone with the link can view".
- To add a new recording: share it in Drive that way, then add a line with its file name and Drive file id to `scripts/audio-sources.txt`.
- For local previews, put a copy in `media/`.
- If the file is missing, the player says the recording is not available yet.

## Previewing and publishing (automatic)

- Netlify is connected to this GitHub repository and builds the site with `scripts/build.sh` (set in `netlify.toml`). The build publishes **only** the website files: never `*.md` notes, `print-assets/` or the scripts. It stops if a private file would slip through.
- **Open a pull request:** Netlify builds a **deploy preview** and posts its link on the pull request.
- **Push any other branch:** Netlify builds a **branch deploy** at `<branch>--divinelight-reiki.netlify.app`.
- **Merge or push to `main`:** Netlify **publishes to the live site automatically**. No approval is needed (Akhilesh turned approvals off on 2026-11-17).
- On your computer, you can still preview with `python3 -m http.server 8000` from the project folder.

## Checks

The project has no automated tests or linters. Before you ask for a review:
- Open every page you changed in the preview, on desktop and on a phone-sized window.
- Click every link and button you changed.
- If you changed a price, the name, the email or the phone number, search the whole folder for the old value so every page matches.

## Rules

- Never put passwords, API keys or Stripe secret keys (`sk_live_...`, `sk_test_...`) in any file or commit. Secrets go in Netlify environment variables only.
- This repository is private. Don't share its contents.

## Member library

The member portal is at `/members`. Netlify runs `scripts/build.sh` and publishes
`_site`, with the membership API deployed separately as a Netlify Function.

- Enable Netlify Identity and email confirmation. Configure the confirmation
  and recovery email links to return to `/members` with their Identity token
  fragments, so the portal can complete the corresponding flow.
- Set `STRIPE_SECRET_KEY`, `STRIPE_MEMBERSHIP_PRICE_ID` and `STRIPE_LIBRARY_PRICE_ID` in
  Netlify's Functions environment. The membership price must be a USD 25 monthly
  recurring price. The library price must be a USD 100 **one-time** price; buyers
  get the files listed in `downloads` in `netlify/functions/membership.mjs`. Enable
  Stripe's customer portal for payment updates and subscription cancellation.
- Run `npm ci` and `npm run build` locally. Use Stripe test-mode configuration
  for a draft deploy and verify signup, login, checkout, lesson access, saved
  progress, and cancellation before accepting live payments.
- Put the public Relax recording at `media/relax.mp3` in the deploy input. Keep
  paid recordings out of the public build directory.
