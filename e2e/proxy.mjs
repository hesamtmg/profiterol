// Stands in for nginx when running without Docker: /api and /uploads go to the API (:3001), the rest to Nuxt (:3000).
// Like nginx, a preview site's path (/preview/<name>/…) is taken off the address and sent as X-Site-Prefix.
import http from 'node:http';

const port = Number(process.env.PORT ?? 8080);
const PREVIEW = /^(\/preview\/[a-z0-9][a-z0-9-]{1,38}[a-z0-9])(\/.*)?$/;

http
  .createServer((req, res) => {
    let path = req.url;
    let prefix = '';
    const preview = PREVIEW.exec(path.split('?')[0]);
    if (preview) {
      prefix = preview[1];
      path = path.slice(prefix.length) || '/';
      if (!path.startsWith('/')) path = `/${path}`;
      if (!preview[2]) {
        // /preview/ali-shop → /preview/ali-shop/, as nginx does, so relative addresses resolve inside it.
        res.writeHead(301, { location: `${prefix}/${req.url.slice(prefix.length)}` });
        res.end();
        return;
      }
    }
    const target = /^\/(api|uploads)\//.test(path) ? 3001 : 3000;
    const headers = { ...req.headers, 'x-forwarded-host': req.headers.host };
    // Always set (empty when there is none), so a visitor cannot send their own.
    delete headers['x-site-prefix'];
    if (prefix) headers['x-site-prefix'] = prefix;
    const up = http.request({ host: '127.0.0.1', port: target, path, method: req.method, headers }, (r) => {
      const out = { ...r.headers };
      if (prefix) out['x-robots-tag'] = 'noindex, nofollow';
      res.writeHead(r.statusCode, out);
      r.pipe(res);
    });
    up.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(up);
  })
  .listen(port, () => console.log(`proxy on :${port}`));
