import { config } from "zod";

// Browsers enforce the nonce CSP, which reports Zod's `new Function` probe as a violation.
// The server has no CSP, so it keeps Zod's faster compiled parsers.
if (typeof window !== "undefined") {
  config({ jitless: true });
}
