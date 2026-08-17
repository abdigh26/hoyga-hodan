# Hoyga Hodan Website

This repository contains the public static website for **Hoyga Hodan**, a Somali women-led space for practical learning, community, culture, creativity and opportunity.

The site is intentionally lightweight. It is a single-page HTML site with local photo and video assets, a Vercel contact-function endpoint, a protected contact-message viewer, and no framework or build step.

## Publish on Vercel

Vercel can deploy the repository as-is. Connect the GitHub repository to the Hoyga Hodan Vercel project and use the default settings. Each push to the production branch will trigger a new deployment.

The intended public domain is `https://www.hoygahodan.so/`. The final domain cutover still requires the domain owner to update DNS at the authoritative registrar.

| DNS record | Host/name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| TXT | `_vercel` | Use the exact verification value shown in the Vercel project’s domain settings. |

> The verification value is unique to the Vercel project and may change. Always copy the current value from Vercel instead of relying on an older record.

## Temporary GitHub Pages fallback

The repository also includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`. It publishes the static site at `https://abdigh26.github.io/hoyga-hodan/` when GitHub Pages is enabled for the repository. Vercel remains the canonical host because it runs the contact API and owns the custom-domain configuration. The GitHub Pages copy forwards contact-form and protected-viewer requests to the Vercel API.

## Contact form

The public form posts to `/api/contact`. For a production-ready, durable inquiry workflow, configure the following **Vercel environment variables**:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Enables email delivery using [Resend](https://resend.com/). |
| `FROM_EMAIL` | A verified sender address in Resend, such as `Hoyga Hodan <hello@hoygahodan.so>`. |
| `TO_EMAIL` | Inbox that should receive enquiries. |
| `ADMIN_TOKEN` | A long, private random secret that protects the messages viewer at `/admin.html`. |

The handler keeps a short-lived convenience cache under the serverless runtime’s temporary storage. This cache is **not permanent** and should not be relied on as a database. Configure email delivery before using the public form for real enquiries. If the organization later needs durable records, connect a database or form-storage provider rather than relying on the temporary cache.

## Private messages viewer

Open `/admin.html` only after setting `ADMIN_TOKEN` in Vercel. The page asks for that token and stores it only in the current browser session before requesting recent temporary messages. Do not share the token or put it in a public URL.

## Search visibility

The public site includes a canonical URL, basic Open Graph metadata, `robots.txt`, and `sitemap.xml`. Once the domain is live, submit `https://www.hoygahodan.so/sitemap.xml` to Google Search Console and Bing Webmaster Tools.

## Content integrity

The site deliberately distinguishes historical results from planned expansion. Do not add a final annual funding target, partner logos, legal-status claims, participant quotes, outcomes, or team names unless the organization has approved evidence for them.

The internal content decision record is in `internal-audit.md`.
