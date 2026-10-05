// Stands in for nginx when running without Docker: /api and /uploads go to the API (:3001), the rest to Nuxt (:3000).
import http from 'node:http';

const port = Number(process.env.PORT ?? 8080);
http
  .createServer((req, res) => {
    const target = /^\/(api|uploads)\//.test(req.url) ? 3001 : 3000;
    const up = http.request(
      {
        host: '127.0.0.1',
        port: target,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, 'x-forwarded-host': req.headers.host },
      },
      (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      },
    );
    up.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(up);
  })
  .listen(port, () => console.log(`proxy on :${port}`));
