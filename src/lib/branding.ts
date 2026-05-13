export const BRANDING = {
  appName: "GOALPICK",
  tagline: "Predict. Compete. Win.",
  tournament: "International Football Tournament 2026",
  tournamentShort: "2026 Football Tournament",
  fullDescription: "The ultimate football prediction platform",
  disclaimer: "Goalpick is an independent prediction platform and is not affiliated with, endorsed by, or connected to FIFA or any official tournament organization.",
  social: {
    twitter: "@GOALPICK"
  }
} as const;

/**
 * List of restricted terms that should not appear in user-facing content.
 * Used for validation in admin/CMS contexts.
 */
export const RESTRICTED_TERMS = [
  'FIFA',
  'World Cup',
  'Copa del Mundo',
  'Coupe du Monde',
  'FIFA World Cup',
  'FWC',
] as const;

/**
 * Check if a string contains any restricted/trademarked terms.
 * Returns the first match found, or null if clean.
 */
export function findRestrictedTerm(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of RESTRICTED_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      return term;
    }
  }
  return null;
}
