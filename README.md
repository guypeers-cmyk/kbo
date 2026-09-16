# KBO-verkenner

Statische site voor Cloudflare Pages. Bevat de herbouwde `/shards/`-zoekindex.

## Deployen via Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → **Connect to Git**
2. Kies deze repo
3. Build-instellingen:
   - Build command: *(leeg laten)*
   - Build output directory: `/`
   - Node version: niet nodig, er is geen build-stap
4. Deploy

Er is geen build-stap: alles in deze repo is kant-en-klare static output.

## Inhoud

| Pad | Wat |
|---|---|
| `index.html` | homepage / overzicht |
| `zoeken/` | zoekpagina + `meta.json` + `contacts-enriched.json` |
| `dashboard/` | dashboard + `zoek-data.js` (77.320 ondernemingen) |
| `gemeente/<slug>/` | 570 gemeentepagina's |
| `nieuw/`, `leads/`, `adres/`, `home/` | overige pagina's + data |
| `shards/` | zoekindex: `nr/`, `naam/`, `str/`, `gem/`, `adres/`, `nieuw/` |
| `data/pb-events.json` | Staatsblad-signalen (uit Supabase `pb_events`) |
| `supabase-connector.js` | leest `pb_events` live; minimale surface |
| `_redirects` | catch-all naar homepage (repliceert huidig live gedrag) |

## Beperkingen van de herbouwde index

- 77.320 ondernemingen, niet de 1.956.674 uit de titel — de volledige index
  stond op een verwijderd Pages-project en is nooit gearchiveerd.
- NACE-codes en contactgegevens zijn slechts voor een paar honderd bedrijven
  beschikbaar; zetelstraten zijn gereconstrueerd uit de vestigingen.
- `/zoeken/nace.json`, `/zoeken/geo.json` en
  `/data/directeur-steekproef.json` ontbreken. De site vangt die op met
  `.catch(() => ({}))` en blijft werken; de betreffende blokken blijven leeg.

## Supabase

`supabase-connector.js` bevat het **publishable** key — dat is by design
publiek (het staat in elke browser-request) en wordt afgeschermd door Row
Level Security. Zet NOOIT een secret/service key in deze repo.

Zorg dat `rls-policies.sql` uitgevoerd is voordat deze site publiek gaat:
zonder dat beleid is `kbo_curated_968` (e-mailadressen, telefoonnummers,
bestuurdersnamen, LinkedIn-profielen) door iedereen uitleesbaar met dat key.
