/**
 * Tournament time helpers
 *
 * The official tournament schedule (as published by FIFA) lists every kickoff
 * in **host-country local time**. For the 2026 edition we use America/Mexico_City
 * as the canonical reference, which matches the kickoff column on fifa.com for
 * the matches hosted in Mexico and gives one consistent display value across
 * the whole tournament.
 *
 * Throughout the UI we render the FIFA schedule time, and surface the user's
 * local time on hover via <MatchTime />.
 */

export const TOURNAMENT_TIMEZONE = 'America/Mexico_City';
export const TOURNAMENT_TIMEZONE_LABEL = 'CT';

const safeDate = (iso: string | Date): Date | null => {
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "MMM d" in the official tournament timezone, e.g. "Jun 14". */
export function formatTournamentDate(
  iso: string | Date,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const d = safeDate(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat(undefined, {
    ...opts,
    timeZone: TOURNAMENT_TIMEZONE,
  }).format(d);
}

/** "HH:mm" in the official tournament timezone, e.g. "19:00". */
export function formatTournamentTime(iso: string | Date): string {
  const d = safeDate(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TOURNAMENT_TIMEZONE,
  }).format(d);
}

/** Long FIFA-style label, e.g. "Sat, Jun 14 · 19:00 CT". */
export function formatTournamentLong(iso: string | Date): string {
  const d = safeDate(iso);
  if (!d) return '';
  const datePart = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: TOURNAMENT_TIMEZONE,
  }).format(d);
  return `${datePart} · ${formatTournamentTime(d)} ${TOURNAMENT_TIMEZONE_LABEL}`;
}

/** Same kickoff rendered in the viewer's local timezone, e.g. "Sat, Jun 14 · 8:00 PM PDT". */
export function formatLocalLong(iso: string | Date): string {
  const d = safeDate(iso);
  if (!d) return '';
  const datePart = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
  return `${datePart} · ${timePart}`;
}

/**
 * Round-availability helper for Phase-by-Phase (Mode B) mode.
 *
 * In phase-by-phase, a knockout round only opens for predictions once the
 * previous round has actually ended in real life. This mirrors how FIFA
 * schedules rounds: the next round's matches are only meaningful once the
 * previous round's matches have finished and the bracket is determined.
 *
 * Predecessor map:
 *   round_of_32   ← group
 *   round_of_16   ← round_of_32
 *   quarter_final ← round_of_16
 *   semi_final    ← quarter_final
 *   third_place   ← semi_final
 *   final         ← semi_final
 */
export type AvailabilityStage =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';

export const STAGE_PREDECESSOR: Record<Exclude<AvailabilityStage, 'group'>, AvailabilityStage> = {
  round_of_32: 'group',
  round_of_16: 'round_of_32',
  quarter_final: 'round_of_16',
  semi_final: 'quarter_final',
  third_place: 'semi_final',
  final: 'semi_final',
};

/** Estimated duration of a knockout match including stoppage / extra time / penalties. */
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface MatchTimingInput {
  stage: AvailabilityStage;
  match_date: string | Date;
  status?: 'scheduled' | 'live' | 'finished' | 'postponed' | string | null;
}

export interface RoundAvailability {
  /** True once the previous round is fully finished (or already in the past + estimated duration). */
  isOpen: boolean;
  /** When the round becomes open. Null only if the predecessor has no scheduled matches. */
  opensAt: Date | null;
  /** The stage this round opens after (e.g. 'group' for R32). */
  opensAfterStage: AvailabilityStage;
}

/**
 * Compute whether a knockout `stage` is open for predictions, based on the live
 * status of the predecessor round's matches.
 *
 * - If every predecessor match has `status === 'finished'`, the round is open immediately.
 * - Otherwise, `opensAt` is `max(predecessor.match_date) + 2h` — the wall-clock estimate
 *   for when the last predecessor match wraps up. The component re-checks this on each
 *   render and on every refetch, so it auto-unlocks as soon as either condition flips.
 */
export function computeRoundAvailability(
  matches: MatchTimingInput[],
  stage: Exclude<AvailabilityStage, 'group'>,
): RoundAvailability {
  const predecessor = STAGE_PREDECESSOR[stage];
  const predecessorMatches = matches.filter((m) => m.stage === predecessor);

  if (predecessorMatches.length === 0) {
    // No predecessor schedule loaded yet — be conservative and keep it locked
    // with a null target so the UI shows a generic "opens after previous round" message.
    return { isOpen: false, opensAt: null, opensAfterStage: predecessor };
  }

  const allFinished = predecessorMatches.every((m) => m.status === 'finished');

  // Latest kickoff of the predecessor round
  let latestKickoff = 0;
  for (const m of predecessorMatches) {
    const t = (m.match_date instanceof Date ? m.match_date : new Date(m.match_date)).getTime();
    if (!Number.isNaN(t) && t > latestKickoff) latestKickoff = t;
  }
  const opensAt = new Date(latestKickoff + MATCH_DURATION_MS);
  const now = Date.now();

  const isOpen = allFinished || opensAt.getTime() <= now;

  return { isOpen, opensAt, opensAfterStage: predecessor };
}
