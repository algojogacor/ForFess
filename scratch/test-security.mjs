/**
 * Automated Security & Penetration Verification Test Suite
 * 
 * Focus Areas:
 * 1. IP Spoofing Resilience (getClientIp in src/lib/rate-limit.ts)
 *    - Priority of trusted Vercel header over forged X-Forwarded-For
 *    - Rightmost proxy extraction for chained X-Forwarded-For
 *    - Proper resolution and precedence for X-Real-IP and CF-Connecting-IP
 *    - Fallback to "unknown" when headers are absent or malformed
 * 2. Next.js HTTP Security Headers Configuration (next.config.ts)
 *    - X-Frame-Options
 *    - X-Content-Type-Options
 *    - Referrer-Policy
 *    - Permissions-Policy
 *    - X-DNS-Prefetch-Control
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

// Auto-fallback: If executed by vanilla node without TS path alias support,
// delegate execution transparently to npx tsx so both `node` and `npx tsx` work.
let getClientIp;
let nextConfig;

try {
  const rateLimitMod = await import('../src/lib/rate-limit.ts');
  getClientIp = rateLimitMod.getClientIp;

  const nextConfigMod = await import('../next.config.ts');
  nextConfig = nextConfigMod.default;
} catch (err) {
  if (err.code === 'ERR_MODULE_NOT_FOUND' && !process.env.__SECURITY_TEST_TSX) {
    const isWindows = process.platform === 'win32';
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';
    const result = spawnSync(npxCmd, ['tsx', fileURLToPath(import.meta.url)], {
      stdio: 'inherit',
      env: { ...process.env, __SECURITY_TEST_TSX: '1' },
      shell: isWindows,
    });
    process.exit(result.status ?? 1);
  }
  throw err;
}

// Terminal color helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

let passed = 0;
let failed = 0;
const results = [];

function runTest(suite, testName, testFn) {
  try {
    testFn();
    passed++;
    results.push({ suite, name: testName, status: 'PASS' });
    console.log(`  ${c.green}✓ PASS${c.reset} ${testName}`);
  } catch (err) {
    failed++;
    results.push({ suite, name: testName, status: 'FAIL', error: err });
    console.log(`  ${c.red}✗ FAIL${c.reset} ${testName}`);
    console.log(`    ${c.dim}${err.message}${c.reset}`);
  }
}

async function runAsyncTest(suite, testName, testFn) {
  try {
    await testFn();
    passed++;
    results.push({ suite, name: testName, status: 'PASS' });
    console.log(`  ${c.green}✓ PASS${c.reset} ${testName}`);
  } catch (err) {
    failed++;
    results.push({ suite, name: testName, status: 'FAIL', error: err });
    console.log(`  ${c.red}✗ FAIL${c.reset} ${testName}`);
    console.log(`    ${c.dim}${err.message}${c.reset}`);
  }
}

console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
console.log(`${c.bold}${c.cyan}  RED TEAM / QA AUTOMATED SECURITY & PENETRATION TEST SUITE     ${c.reset}`);
console.log(`${c.bold}${c.cyan}================================================================${c.reset}\n`);

// ============================================================================
// SUITE 1: IP Spoofing Resilience & Precedence Tests
// ============================================================================
console.log(`${c.bold}${c.yellow}[SUITE 1: IP Spoofing Resilience (src/lib/rate-limit.ts)]${c.reset}`);

runTest(
  'IP Spoofing',
  'Attack 1: Attacker injects forged X-Forwarded-For, trusted Vercel header must prevail',
  () => {
    // Simulated attack: An attacker injects X-Forwarded-For with a forged IP (1.2.3.4).
    // The hosting infrastructure (Vercel) appends / provides X-Vercel-Forwarded-For with real client IP (203.0.113.10).
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4',
      'x-vercel-forwarded-for': '203.0.113.10',
    });
    const ip = getClientIp(headers);
    assert.strictEqual(
      ip,
      '203.0.113.10',
      `Expected getClientIp to return trusted Vercel IP 203.0.113.10, but got ${ip}`
    );
  }
);

runTest(
  'IP Spoofing',
  'Attack 2: Multi-hop Vercel header extracts the first hop (trusted edge entry)',
  () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4',
      'x-vercel-forwarded-for': '203.0.113.10, 10.0.0.1',
    });
    const ip = getClientIp(headers);
    assert.strictEqual(
      ip,
      '203.0.113.10',
      `Expected first hop 203.0.113.10 from multi-hop Vercel header, but got ${ip}`
    );
  }
);

runTest(
  'IP Spoofing',
  'Attack 3: Chained X-Forwarded-For takes rightmost proxy (5.6.7.8) instead of forged leftmost (1.2.3.4)',
  () => {
    // In standard proxy chaining where client injects 1.2.3.4,
    // the intermediate reverse proxy appends its seen client IP (5.6.7.8).
    // The rightmost IP is the proxy hop closest to the application.
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    const ip = getClientIp(headers);
    assert.strictEqual(
      ip,
      '5.6.7.8',
      `Expected rightmost proxy 5.6.7.8, but got ${ip}`
    );
  }
);

runTest(
  'IP Spoofing',
  'Attack 4: Complex multi-hop chained X-Forwarded-For takes rightmost proxy with extra spaces',
  () => {
    const headers = new Headers({
      'x-forwarded-for': '  1.2.3.4 , 10.0.0.55 , 5.6.7.8  ',
    });
    const ip = getClientIp(headers);
    assert.strictEqual(
      ip,
      '5.6.7.8',
      `Expected trimmed rightmost proxy 5.6.7.8, but got ${ip}`
    );
  }
);

runTest(
  'IP Spoofing',
  'Header Resolution: X-Real-IP is correctly resolved when no Vercel header is present',
  () => {
    const headers = new Headers({
      'x-real-ip': '198.51.100.25',
    });
    const ip = getClientIp(headers);
    assert.strictEqual(
      ip,
      '198.51.100.25',
      `Expected X-Real-IP 198.51.100.25, but got ${ip}`
    );
  }
);

runTest(
  'IP Spoofing',
  'Header Resolution: CF-Connecting-IP is correctly resolved when Cloudflare is upstream',
  () => {
    const headers = new Headers({
      'cf-connecting-ip': '198.51.100.99',
    });
    const ip = getClientIp(headers);
    assert.strictEqual(
      ip,
      '198.51.100.99',
      `Expected CF-Connecting-IP 198.51.100.99, but got ${ip}`
    );
  }
);

runTest(
  'IP Spoofing',
  'Precedence Order: Vercel > X-Real-IP > CF-Connecting-IP > X-Forwarded-For',
  () => {
    // 1. Vercel beats all
    const allHeaders = new Headers({
      'x-vercel-forwarded-for': '203.0.113.10',
      'x-real-ip': '198.51.100.25',
      'cf-connecting-ip': '198.51.100.99',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    assert.strictEqual(getClientIp(allHeaders), '203.0.113.10');

    // 2. Real-IP beats CF and XFF
    const realIpHeaders = new Headers({
      'x-real-ip': '198.51.100.25',
      'cf-connecting-ip': '198.51.100.99',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    assert.strictEqual(getClientIp(realIpHeaders), '198.51.100.25');

    // 3. CF beats XFF
    const cfHeaders = new Headers({
      'cf-connecting-ip': '198.51.100.99',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    assert.strictEqual(getClientIp(cfHeaders), '198.51.100.99');
  }
);

runTest(
  'IP Spoofing',
  'Boundary Condition: No headers returns "unknown"',
  () => {
    const emptyHeaders = new Headers();
    const ip = getClientIp(emptyHeaders);
    assert.strictEqual(
      ip,
      'unknown',
      `Expected "unknown" for empty headers, but got ${ip}`
    );
  }
);

runTest(
  'IP Spoofing',
  'Boundary Condition: Empty / blank header strings fallback gracefully to "unknown"',
  () => {
    const blankHeaders = new Headers({
      'x-vercel-forwarded-for': '   ',
      'x-real-ip': '',
      'cf-connecting-ip': '  ',
      'x-forwarded-for': ' , , ',
    });
    const ip = getClientIp(blankHeaders);
    assert.strictEqual(
      ip,
      'unknown',
      `Expected "unknown" for blank headers, but got ${ip}`
    );
  }
);

// ============================================================================
// SUITE 2: Next.js HTTP Security Headers Verification
// ============================================================================
console.log(`\n${c.bold}${c.yellow}[SUITE 2: Next.js HTTP Security Headers (next.config.ts)]${c.reset}`);

await runAsyncTest(
  'Security Headers',
  'next.config.ts exports a headers() function',
  async () => {
    assert.ok(nextConfig, 'nextConfig must be defined');
    assert.strictEqual(
      typeof nextConfig.headers,
      'function',
      'next.config.ts must define an async/sync headers() function'
    );
  }
);

await runAsyncTest(
  'Security Headers',
  'headers() returns valid route configuration covering global paths',
  async () => {
    const headerRules = await nextConfig.headers();
    assert.ok(Array.isArray(headerRules), 'headers() must return an array');
    assert.ok(headerRules.length > 0, 'headers() array must not be empty');

    // Check for a rule matching global path (e.g., /:path*)
    const globalRule = headerRules.find(
      (rule) => rule.source === '/:path*' || rule.source === '/(.*)' || rule.source === '/'
    );
    assert.ok(
      globalRule,
      'A global header rule matching "/:path*" or equivalent must exist'
    );
    assert.ok(
      Array.isArray(globalRule.headers),
      'Global rule must define an array of headers'
    );
  }
);

await runAsyncTest(
  'Security Headers',
  'X-Frame-Options is configured to prevent clickjacking (SAMEORIGIN or DENY)',
  async () => {
    const headerRules = await nextConfig.headers();
    const globalRule = headerRules.find((r) => r.source === '/:path*') ?? headerRules[0];
    const headerMap = new Map(globalRule.headers.map((h) => [h.key.toLowerCase(), h.value]));

    const xfo = headerMap.get('x-frame-options');
    assert.ok(xfo, 'X-Frame-Options header must be present');
    assert.ok(
      ['sameorigin', 'deny'].includes(xfo.toLowerCase()),
      `X-Frame-Options should be SAMEORIGIN or DENY, received: ${xfo}`
    );
  }
);

await runAsyncTest(
  'Security Headers',
  'X-Content-Type-Options is configured to nosniff (prevents MIME sniffing)',
  async () => {
    const headerRules = await nextConfig.headers();
    const globalRule = headerRules.find((r) => r.source === '/:path*') ?? headerRules[0];
    const headerMap = new Map(globalRule.headers.map((h) => [h.key.toLowerCase(), h.value]));

    const xcto = headerMap.get('x-content-type-options');
    assert.strictEqual(
      xcto?.toLowerCase(),
      'nosniff',
      `X-Content-Type-Options must be "nosniff", received: ${xcto}`
    );
  }
);

await runAsyncTest(
  'Security Headers',
  'Referrer-Policy is configured with a secure standard (e.g. strict-origin-when-cross-origin)',
  async () => {
    const headerRules = await nextConfig.headers();
    const globalRule = headerRules.find((r) => r.source === '/:path*') ?? headerRules[0];
    const headerMap = new Map(globalRule.headers.map((h) => [h.key.toLowerCase(), h.value]));

    const rp = headerMap.get('referrer-policy');
    assert.ok(rp, 'Referrer-Policy header must be present');
    const validPolicies = [
      'strict-origin-when-cross-origin',
      'no-referrer',
      'no-referrer-when-downgrade',
      'same-origin',
      'strict-origin',
    ];
    assert.ok(
      validPolicies.includes(rp.toLowerCase()),
      `Referrer-Policy must be secure, received: ${rp}`
    );
  }
);

await runAsyncTest(
  'Security Headers',
  'Permissions-Policy restricts sensitive browser features (camera, microphone, geolocation)',
  async () => {
    const headerRules = await nextConfig.headers();
    const globalRule = headerRules.find((r) => r.source === '/:path*') ?? headerRules[0];
    const headerMap = new Map(globalRule.headers.map((h) => [h.key.toLowerCase(), h.value]));

    const pp = headerMap.get('permissions-policy');
    assert.ok(pp, 'Permissions-Policy header must be present');
    assert.ok(
      pp.includes('camera=()'),
      `Permissions-Policy must restrict camera, received: ${pp}`
    );
    assert.ok(
      pp.includes('microphone=()'),
      `Permissions-Policy must restrict microphone, received: ${pp}`
    );
    assert.ok(
      pp.includes('geolocation=()'),
      `Permissions-Policy must restrict geolocation, received: ${pp}`
    );
  }
);

await runAsyncTest(
  'Security Headers',
  'X-DNS-Prefetch-Control is configured to control DNS prefetching',
  async () => {
    const headerRules = await nextConfig.headers();
    const globalRule = headerRules.find((r) => r.source === '/:path*') ?? headerRules[0];
    const headerMap = new Map(globalRule.headers.map((h) => [h.key.toLowerCase(), h.value]));

    const dns = headerMap.get('x-dns-prefetch-control');
    assert.ok(dns, 'X-DNS-Prefetch-Control header must be present');
    assert.ok(
      ['on', 'off'].includes(dns.toLowerCase()),
      `X-DNS-Prefetch-Control must be "on" or "off", received: ${dns}`
    );
  }
);

// ============================================================================
// SUMMARY & VERIFICATION REPORT
// ============================================================================
console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
console.log(`${c.bold}${c.cyan}                      TEST SUMMARY                              ${c.reset}`);
console.log(`${c.bold}${c.cyan}================================================================${c.reset}`);
console.log(`Total Tests Run : ${passed + failed}`);
console.log(`Passed          : ${c.green}${passed}${c.reset}`);
console.log(`Failed          : ${failed > 0 ? c.red : c.green}${failed}${c.reset}`);

if (failed > 0) {
  console.log(`\n${c.bold}${c.red}SECURITY VERIFICATION FAILED!${c.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${c.bold}${c.green}ALL SECURITY VERIFICATION CHECKS PASSED! ✓${c.reset}\n`);
  process.exit(0);
}
