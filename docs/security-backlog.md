# Security Backlog

## PR: `fix/api-key-security` — API Key Hardening

> Tracked here for the next session. Three concrete vulnerabilities to fix, all in `src/services/tenant-store.ts` and `src/middleware/tenant-auth.ts`. No new dependencies needed — everything uses Node's built-in `crypto` module.

---

### Fix 1 — Replace SHA-256 with scrypt for key hashing

**File:** `src/services/tenant-store.ts`

**Problem:** SHA-256 is a fast hash — great for data integrity, terrible for secrets. An attacker who dumps the in-memory store (e.g. via a memory exploit or a future persistence layer breach) can brute-force UUID-format keys at billions of guesses/second.

**Fix:** Use `crypto.scryptSync` (built into Node, no new deps). scrypt is intentionally slow and memory-hard.

```ts
// Before
private hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// After
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

private readonly SALT_LENGTH = 32;
private readonly KEY_LENGTH = 64;
private readonly SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }; // tunable

// Store format: "salt:hash" (both hex)
private hashKey(raw: string): string {
  const salt = randomBytes(this.SALT_LENGTH);
  const hash = scryptSync(raw, salt, this.KEY_LENGTH, this.SCRYPT_PARAMS);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

// Verification needs to extract the salt and re-derive
private verifyKey(raw: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  const salt = Buffer.from(saltHex, "hex");
  const storedHash = Buffer.from(hashHex, "hex");
  const derived = scryptSync(raw, salt, this.KEY_LENGTH, this.SCRYPT_PARAMS);
  return timingSafeEqual(derived, storedHash);
}
```

**Impact on `findByApiKey`:** Can no longer use the hash as a Map key (salt is random per-key). Switch to iterating tenants and calling `verifyKey`. With a small tenant count this is fine; for large scale, add a fast pre-filter (e.g. HMAC with a server secret as a lookup key, then scrypt verify).

**Simpler interim approach** (if scrypt iteration is too slow): use a **server-side HMAC** as the Map key (fast, but keyed to a server secret so an attacker needs the secret too), then scrypt for the actual stored value.

---

### Fix 2 — Timing-safe comparison for ADMIN_API_KEY

**File:** `src/middleware/tenant-auth.ts`

**Problem:** String equality (`!==`) short-circuits on the first mismatched character. An attacker can measure response time to guess the admin key one character at a time.

**Fix:** Use `crypto.timingSafeEqual` — always runs in constant time.

```ts
// Before
if (!apiKey || apiKey !== adminApiKey) {

// After
import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  // Must be same length — pad to avoid length leak
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf);
}

if (!apiKey || typeof apiKey !== "string" || !safeCompare(apiKey, adminApiKey)) {
```

---

### Fix 3 — Better entropy for generated API keys

**File:** `src/services/tenant-store.ts`

**Problem:** `randomUUID()` produces UUID v4 — only 122 bits of actual entropy, and the format (8-4-4-4-12 hex) is well-known, making brute-force search space predictable.

**Fix:** Use `crypto.randomBytes(32).toString("base64url")` — 256 bits of entropy, no structure.

```ts
// Before
const rawApiKey = randomUUID();

// After
import { randomBytes } from "node:crypto";
const rawApiKey = randomBytes(32).toString("base64url");
```

Resulting keys look like: `Xy3mK9pQr2vNbLwAjT6cHdUeFs0iOgZW8nVqYhCx1oP`  
256-bit entropy vs UUID's 122-bit. Meaningfully harder to brute-force.

---

### Fix 4 (bonus, low effort) — Document TLS requirement

**File:** `README.md` or `docs/deployment.md`

Add a note that `x-api-key` headers are plaintext and **HTTPS is required in production**. Render and Railway terminate TLS automatically, but self-hosters need to know.

```md
> ⚠️ **HTTPS required in production.** API keys are sent as request headers and must be protected by TLS. Render and Railway handle this automatically. If self-hosting, put the server behind a reverse proxy (nginx, Caddy) with a valid certificate.
```

---

## Implementation Order for the PR

1. Fix 3 (key generation) — 1 line, no design change
2. Fix 2 (timing-safe admin compare) — ~10 lines
3. Fix 1 (scrypt hashing) — largest change, touches `hashKey`, `findByApiKey`, and tests

All fixes are in `src/` only. No new dependencies. Tests will need updating for the new key format.

**Estimated scope:** ~50 lines changed, ~20 lines of new/updated tests.
