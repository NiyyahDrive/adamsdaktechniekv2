# Adams Daktechniek — Website v2

Statische website voor Adams Daktechniek (Heerlen, Limburg). Geen build-stap, geen frameworks — pure HTML/CSS/JS.

**Live:** https://niyyahdrive.github.io/adamsdaktechniekv2/

## Structuur

| Bestand | Doel |
| --- | --- |
| `index.html` | Homepage |
| `offerte.html` | Offerte-aanvraag (3-staps wizard) |
| `dakdekker-{stad}.html` | 18 SEO-landingspagina's per plaats |
| `sitemap.xml` | XML-sitemap voor Google |
| `robots.txt` | Crawler-instructies |
| `LogoAdamsDaktechniek.png` | Hoofdlogo |
| `project-01..09.jpeg` | Projectfoto's voor galerij |

## Hosting (GitHub Pages)

Repo wordt geserveerd vanaf de `main`-branch (root). In de GitHub-repo:

1. **Settings → Pages → Source:** Deploy from a branch → `main` / `/ (root)` → Save
2. Wachten op build (1-2 min) — daarna live op de URL hierboven

## Werkgebied (alle landingspagina's)

Heerlen · Brunssum · Hoensbroek · Landgraaf · Kerkrade · Voerendaal · Eygelshoven · Simpelveld · Schinveld · Nuth · Schinnen · Klimmen · Valkenburg · Beek · Geleen · Sittard · Born · Echt

## Open punten voor productie

- [ ] Formulier-backend koppelen (Formspree of eigen endpoint) — staat nu op `console.log`
- [ ] Privacy-pagina toevoegen (link in offerte-formulier wijst nu naar `#`)
- [ ] E-mail `info@adamsdaktechniek.nl` verifiëren of swap voor oud Mano-adres
- [ ] Project-foto's koppelen aan juiste project-titels (nu willekeurig)
- [ ] Custom domein adamsdaktechniek.nl wijzen naar GitHub Pages (CNAME)

---

Gebouwd door Mojo — design-systeem: zwart + groen-blad accent uit het Adams-logo, Manrope + Inter typografie.
