/**
 * Productie-Worker voor adamsdaktechniek.nl (static assets + canonieke redirects).
 * - www.adamsdaktechniek.nl -> adamsdaktechniek.nl (301)
 * - http -> https (301)
 * - al het andere: static assets (clean URLs, 404.html met status 404, _headers)
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.adamsdaktechniek.nl' || url.protocol === 'http:') {
      url.hostname = 'adamsdaktechniek.nl';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
