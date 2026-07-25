import { readFileSync } from "node:fs";

const pages = ["index.html", "advertiser.html"];
const failures = [];

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const require = (pattern, message) => {
    if (!pattern.test(html)) failures.push(`${page}: ${message}`);
  };
  const reject = (pattern, message) => {
    if (pattern.test(html)) failures.push(`${page}: ${message}`);
  };

  require(/@supabase\/supabase-js@2\.110\.8/, "Supabase browser SDK must be version-pinned");
  require(/function authenticatedFetch\(/, "advertiser API requests need a JWT-aware fetch boundary");
  require(/headers\.set\(['"]Authorization['"], ['"]Bearer ['"] \+ session\.access_token\)/, "JWT boundary must set Authorization");
  require(/function safeHttpUrl\(/, "untrusted links need an HTTP(S)-only validator");
  require(/if\(!value\) return ['"]#['"]/, "empty URLs must not resolve to the application origin");
  if (!html.includes("if(!/^https?:\\/\\//i.test(raw)) return '#';")) {
    failures.push(`${page}: relative and fragment URL sentinels must remain non-navigable`);
  }
  require(/function safeHexColor\(/, "untrusted style colors need strict validation");
  require(/visitUrl === ['"]#['"].*aria-disabled/s, "rejected URLs must render as disabled non-anchors");
  require(/function renderUserArea\(/, "OAuth profile data must use DOM text/attribute setters");
  reject(/user-area'\)\.innerHTML\s*=\s*`/, "OAuth profile data must not enter innerHTML");
  reject(/Running in demo mode/, "missing auth configuration must fail closed, not expose demo API access");
  reject(/window\.__supa/, "subscription auth must use the initialized Supabase client");
  reject(/trycloudflare\.com|fetchOllamaDraft\(/, "project data must not be sent to a hardcoded third-party model tunnel");
}

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const headers = new Map(vercel.headers?.[0]?.headers?.map(({ key, value }) => [key.toLowerCase(), value]));
for (const name of ["content-security-policy", "permissions-policy", "strict-transport-security"]) {
  if (!headers.has(name)) failures.push(`vercel.json: missing ${name}`);
}

if (readFileSync(pages[0], "utf8") !== readFileSync(pages[1], "utf8")) {
  failures.push("mirrored SPA files differ");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Ad-SemeClaw security contract verified");
