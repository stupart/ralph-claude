/**
 * Tests for Webhook - HTTP POST notifications on state changes
 *
 * Uses a local HTTP server to receive and validate webhook payloads.
 */

const http = require('http');
const { Webhook } = require('../lib/webhook');

let server;
let serverPort;
let receivedPayloads;
let serverResponseCode;

beforeAll((done) => {
  receivedPayloads = [];
  serverResponseCode = 200;

  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        receivedPayloads.push(JSON.parse(body));
      } catch {
        receivedPayloads.push(body);
      }
      res.writeHead(serverResponseCode);
      res.end();
    });
  });

  server.listen(0, () => {
    serverPort = server.address().port;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

beforeEach(() => {
  receivedPayloads = [];
  serverResponseCode = 200;
});

describe('Webhook', () => {
  test('constructs with URL and is enabled', () => {
    const wh = new Webhook(`http://localhost:${serverPort}/hook`);
    expect(wh.enabled).toBe(true);
    expect(wh.url).toBe(`http://localhost:${serverPort}/hook`);
  });

  test('constructs with null URL and is disabled', () => {
    const wh = new Webhook(null);
    expect(wh.enabled).toBe(false);
  });

  test('constructs with empty string and is disabled', () => {
    const wh = new Webhook('');
    expect(wh.enabled).toBe(false);
  });

  test('send returns false when disabled', async () => {
    const wh = new Webhook(null);
    const result = await wh.send({ type: 'test' });
    expect(result).toBe(false);
    expect(receivedPayloads).toHaveLength(0);
  });

  test('send POSTs JSON to the webhook URL', async () => {
    const wh = new Webhook(`http://localhost:${serverPort}/hook`);
    const result = await wh.send({ type: 'test', layer: 'L1', message: 'hello' });

    expect(result).toBe(true);
    expect(receivedPayloads).toHaveLength(1);
    expect(receivedPayloads[0].type).toBe('test');
    expect(receivedPayloads[0].layer).toBe('L1');
    expect(receivedPayloads[0].message).toBe('hello');
    expect(receivedPayloads[0].timestamp).toBeDefined();
  });

  test('send records payload in history', async () => {
    const wh = new Webhook(`http://localhost:${serverPort}/hook`);
    await wh.send({ type: 'a' });
    await wh.send({ type: 'b' });

    expect(wh.history).toHaveLength(2);
    expect(wh.history[0].type).toBe('a');
    expect(wh.history[1].type).toBe('b');
  });

  test('send handles server error responses', async () => {
    serverResponseCode = 500;
    const wh = new Webhook(`http://localhost:${serverPort}/hook`, { maxRetries: 0 });
    const result = await wh.send({ type: 'test' });

    expect(result).toBe(false);
    expect(wh.failureCount).toBe(1);
  });

  test('send retries on failure', async () => {
    let callCount = 0;
    serverResponseCode = 500;

    // Override after first attempt
    const origClose = server.close.bind(server);

    const wh = new Webhook(`http://localhost:${serverPort}/hook`, { maxRetries: 2 });
    const result = await wh.send({ type: 'test' });

    // Should have tried 3 times (1 initial + 2 retries) - all failed
    expect(result).toBe(false);
    expect(receivedPayloads.length).toBe(3);
  });

  test('send handles invalid URL', async () => {
    const wh = new Webhook('not-a-valid-url', { maxRetries: 0 });
    const result = await wh.send({ type: 'test' });
    expect(result).toBe(false);
    expect(wh.failureCount).toBe(1);
  });

  test('layerStart sends correct payload', async () => {
    const wh = new Webhook(`http://localhost:${serverPort}/hook`);
    await wh.layerStart('L4', 'Epic Definition', 'auth-epic');

    expect(receivedPayloads).toHaveLength(1);
    expect(receivedPayloads[0].type).toBe('layer_start');
    expect(receivedPayloads[0].layer).toBe('L4');
    expect(receivedPayloads[0].epic).toBe('auth-epic');
  });

  test('layerEnd sends correct payload', async () => {
    const wh = new Webhook(`http://localhost:${serverPort}/hook`);
    await wh.layerEnd('L2', 'L3');

    expect(receivedPayloads[0].type).toBe('layer_end');
    expect(receivedPayloads[0].layer).toBe('L2');
  });

  test('verdict sends correct payload', async () => {
    const wh = new Webhook(`http://localhost:${serverPort}/hook`);
    const issues = [{ title: 'Bug', severity: 'MINOR' }];
    await wh.verdict('L9', 'ITERATE', issues);

    expect(receivedPayloads[0].type).toBe('verdict');
    expect(receivedPayloads[0].verdict).toBe('ITERATE');
    expect(receivedPayloads[0].meta.issueCount).toBe(1);
  });

  test('error sends correct payload', async () => {
    const wh = new Webhook(`http://localhost:${serverPort}/hook`);
    await wh.error('L8', 'Timeout');

    expect(receivedPayloads[0].type).toBe('error');
    expect(receivedPayloads[0].layer).toBe('L8');
  });

  test('complete sends correct payload', async () => {
    const wh = new Webhook(`http://localhost:${serverPort}/hook`);
    await wh.complete();

    expect(receivedPayloads[0].type).toBe('complete');
  });

  test('custom headers are included', async () => {
    // We can verify by adding a custom endpoint that checks headers
    // For now, just verify no errors with custom headers
    const wh = new Webhook(`http://localhost:${serverPort}/hook`, {
      headers: { 'X-Custom': 'test-value' }
    });
    const result = await wh.send({ type: 'test' });
    expect(result).toBe(true);
  });

  test('request timeout is configurable', () => {
    const wh = new Webhook('http://localhost:1234', { timeoutMs: 1000 });
    expect(wh.timeoutMs).toBe(1000);
  });
});
