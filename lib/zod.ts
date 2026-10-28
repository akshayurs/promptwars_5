import { config } from "zod";

// The nonce CSP forbids eval; jitless mode skips Zod's `new Function` probe, which browsers report as a violation.
config({ jitless: true });
