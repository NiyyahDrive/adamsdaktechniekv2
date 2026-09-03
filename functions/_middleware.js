// Cloudflare Pages Function: dwing één canonieke host af (SEO).
// www.adamsdaktechniek.nl en http:// -> https://adamsdaktechniek.nl (301).
// Staging (staging.adamsdaktechniek.nl / *.pages.dev) wordt niet omgeleid.
const CANONICAL_HOST = "adamsdaktechniek.nl";

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const isWww = url.hostname === "www." + CANONICAL_HOST;
  const isHttp = url.protocol === "http:" && url.hostname === CANONICAL_HOST;
  if (isWww || isHttp) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
