# Divine Light Website: Final Checklist and Upkeep

Checked 2026-11-13 on https://divinelighthealing-lifecoach.com

## Final checklist results

| Area | Result |
|---|---|
| Domain | Works. www and http both forward to https://divinelighthealing-lifecoach.com |
| Secure padlock (HTTPS) | Valid until Feb 4, 2027. Netlify renews it automatically. |
| Pages | All 14 pages load. Each has its own title and the correct main address. |
| Links | 53 links and files checked. None broken. |
| Booking | Calendly calendar loads on the Contact page. Test booking reached Google Calendar. |
| Payments | 10 real Stripe Pay buttons on the Rates page. All open. No test links left. |
| Bank | Added in Stripe for payouts. |
| Email | Gmail works. Anti-spoofing: SPF and DKIM set. DMARC missing (see fix 1). |
| Phone layout | No page scrolls sideways on a phone. A few small text links (see fix 4). |
| Speed | Pages are about 20 KB and reach the browser in under 0.3 seconds. |
| Google | Search Console set up and sitemap submitted. |

## Fixes found

1. **Add a DMARC email record (you, 2 min).** Helps your emails land in inboxes, and is needed before sending newsletters.
   In Squarespace Domains, DNS settings, add a record:
   - Type: `TXT`
   - Host: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:info@divinelighthealing-lifecoach.com`
2. **Refund and cancellation policy (your decision, then Claude adds it).** The Legal page only says the policy is "shared at the time of scheduling". Now that people pay online, write it on the Legal page and link it next to the Pay buttons.
3. **Stripe receipts (you, 1 min).** Stripe: Settings, Customer emails: turn on "Successful payments" so clients get a receipt.
4. **Small tap targets (optional, Claude).** BUILT, draft awaiting OK. "Compare all services", "Read more testimonials", "All services" and the Legal page menu are a little small to tap on phones.
5. **Old address (optional, Claude).** BUILT, draft awaiting OK. divinelight-reiki.netlify.app still shows the site instead of forwarding to the new domain.

## Upkeep

| When | Task | Where |
|---|---|---|
| Weekly | Check new bookings and payments | Calendly, Stripe Payments |
| Weekly | Check new email signups (once the meditation is live) | Netlify, Forms |
| Monthly | Check payouts reached your bank | Stripe Balances |
| Monthly | Update your Calendly hours for travel or holidays | Calendly, Availability |
| When prices change | Change the price in Stripe **and** ask Claude to update the website and Pay link | Stripe Payment Links |
| Every few months | Ask happy clients for a Google review | Google Business Profile |
| Nov 2027 (renews Nov 6) | Domain renewal: keep auto-renew on and the card current | Squarespace Domains / Google Workspace |
| Yearly | Google Workspace and Calendly plan renewals | Their billing pages |
| Automatic | HTTPS padlock renewal | Netlify (nothing to do) |

## Still to do

- Free meditation MP3 (then the email signup goes live)
- Later: newsletter tool, $20/month meditation library, site polish from the audit
