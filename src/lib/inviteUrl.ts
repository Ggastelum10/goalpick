// Canonical app base URL helper.
// Always use the production GOALPICK domain for shareable links (invites, etc.)
// so links don't leak preview/sandbox hostnames.
const PROD_BASE_URL = "https://goalpick.app";

const NON_PROD_HOST_PATTERNS = [
  /\.lovable\.app$/i,
  /\.lovableproject\.com$/i,
  /\.sandbox\.lovable\.dev$/i,
  /^localhost$/i,
  /^127\.0\.0\.1$/,
];

function resolveBaseUrl(): string {
  if (typeof window === "undefined") return PROD_BASE_URL;
  const host = window.location.hostname;
  if (NON_PROD_HOST_PATTERNS.some((re) => re.test(host))) {
    return PROD_BASE_URL;
  }
  return window.location.origin;
}

export const APP_BASE_URL = resolveBaseUrl();

export function slugifyLeagueName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildInviteUrl(inviteCode: string, leagueName?: string): string {
  const base = `${APP_BASE_URL}/join/${inviteCode}`;
  if (!leagueName) return base;
  const slug = slugifyLeagueName(leagueName);
  return slug ? `${base}/${slug}` : base;
}
