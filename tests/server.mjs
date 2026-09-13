import http from 'node:http';
import {readFile} from 'node:fs/promises';

// Local-only test server, with an explicit allowlist (no arbitrary file serving).
const routes = new Map([
  ['/vertical-twitch.user.js', ['../vertical-twitch.user.js', 'text/javascript']],
  ['/harness.js', ['./harness.js', 'text/javascript']],
  ['/fixture.css', ['./fixture.css', 'text/css']],
]);
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const [file, type] = routes.get(url.pathname) || ['./fixture.html', 'text/html'];
  try {
    response.writeHead(200, {'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store'});
    response.end(await readFile(new URL(file, import.meta.url)));
  } catch {
    response.writeHead(500);
    response.end('Fixture unavailable');
  }
});
server.listen(8765, '127.0.0.1', () => console.log('Tests : http://127.0.0.1:8765/test_channel'));
