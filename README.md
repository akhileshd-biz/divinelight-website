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
| `media/` | Library audio (`relax.mp3`). **Ignored by Git** (the files are large), but **deployed and public** on the website. |
| `sitemap.xml`, `robots.txt` | For search engines |
| `print-assets/` | Flyers, logo files and the WhatsApp flyer. **Not part of the website.** |
| `Divine-Light-*.md` | The owner's notes: audit log, print brief, upkeep guide. Not part of the website. |

## Branches

- `main` is **exactly what is live** on the website right now.
- `draft-email-signup` is the free meditation email signup. It is waiting on the meditation MP3, so it is **not live yet**. Do not merge it until Akhilesh says so.
- Make every new change on its **own branch** from `main`, for example `fix-rates-typo`. Open a pull request so it can be reviewed.

## Library audio

- Library audio is **free and public** (Akhilesh decided this on 2026-11-17). It is served from `/media/` on the website.
- Audio files are **not** in Git, because they are large. Ask Akhilesh for them and put them in `media/` (for example `media/relax.mp3`).
- Before every deploy, make sure `media/` has every audio file, or those lessons will show "not available yet".
- If the file is missing, the player says the recording is not available yet.

## Previewing a change

- **On your computer:** from the project folder, run `python3 -m http.server 8000` and open http://localhost:8000/index.html.
  - Note: pages are linked without `.html` (for example `/about`), and this simple server needs the `.html` added by hand.
- **On Netlify (a shareable draft link):** First copy only the website files to a separate folder, so the notes (`*.md`), `print-assets/` and hidden files are **never** published (`media/` **is** included, for the audio):
  `rsync -a --exclude "*.md" --exclude ".*" --exclude "print-assets" ./ ../site-deploy/`
  Then run `netlify deploy --dir ../site-deploy`. Without `--prod` this makes a **draft** link only, and the live site doesn't change. You need to be a member of the Netlify team, and you sign in with `netlify login`.

## Going live

- The live site is deployed by hand with the Netlify CLI. GitHub is **not** connected to Netlify, so merging or pushing never changes the live site by itself.
- **Nothing goes live and nothing is merged into `main` without Akhilesh's explicit OK.**
- After Akhilesh approves:
  1. Merge the pull request into `main`.
  2. From an up-to-date `main`, make the same `rsync` copy, then run `netlify deploy --dir ../site-deploy --prod`.
- Never deploy the project folder itself, because it would publish the private notes. If you aren't sure, ask first.

## Checks

The project has no automated tests or linters. Before you ask for a review:
- Open every page you changed in the preview, on desktop and on a phone-sized window.
- Click every link and button you changed.
- If you changed a price, the name, the email or the phone number, search the whole folder for the old value so every page matches.

## Rules

- Never put passwords, API keys or Stripe secret keys (`sk_live_...`, `sk_test_...`) in any file or commit. Secrets go in Netlify environment variables only.
- This repository is private. Don't share its contents.
