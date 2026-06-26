import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const CLIENT_SOURCE_FILES = [
  "app/components/Logo.tsx",
  "app/layout.tsx",
  "app/page.tsx",
  "app/audit/page.tsx",
  "app/pricing/page.tsx",
  "app/contact/ContactClient.tsx",
];

test("client-facing source does not ship localhost or loopback network endpoints", async () => {
  const forbiddenEndpointPattern = /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\b/i;

  for (const file of CLIENT_SOURCE_FILES) {
    const source = await readFile(path.join(process.cwd(), file), "utf8");
    assert.doesNotMatch(source, forbiddenEndpointPattern, `${file} contains a localhost/loopback endpoint`);
  }
});
