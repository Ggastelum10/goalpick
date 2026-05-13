import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageToggleCompact } from '@/components/LanguageToggleCompact';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Target, Users, ArrowRight } from 'lucide-react';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';
import { BRANDING } from '@/lib/branding';

export default function Landing() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 12% 12%, hsl(var(--primary) / 0.18) 0%, transparent 60%), radial-gradient(40% 35% at 88% 18%, hsl(var(--gold) / 0.14) 0%, transparent 60%), radial-gradient(50% 40% at 50% 100%, hsl(var(--accent) / 0.10) 0%, transparent 70%)',
        }}
      />
      {/* Grid noise */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--foreground) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.6) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(circle at center, black 35%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 100%)',
        }}
      />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageToggleCompact />
      </div>
      <main className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-5 py-10 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        {/* LEFT */}
        <section className="relative z-10">
          {/* Brand */}
          <div className="mb-5 flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
              <img
                src={goalpickLogo}
                alt={`${BRANDING.appName} Logo`}
                className="relative h-16 w-16 object-contain drop-shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
              />
            </div>
            <div>
              <strong className="block font-display text-2xl uppercase tracking-[0.16em] text-primary">
                {BRANDING.appName}
              </strong>
              <span className="mt-1 block text-[11px] uppercase tracking-[0.28em] text-primary/80">
                {BRANDING.tagline}
              </span>
            </div>
          </div>

          {/* Eyebrow */}
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
            {t('landingPage.live')} · {BRANDING.tournamentShort}
          </span>

          {/* Headline */}
          <h1 className="mt-6 font-display text-5xl uppercase leading-[0.9] tracking-tight sm:text-6xl md:text-7xl lg:text-[6.5rem]">
            <span
              className="block bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 30%, hsl(var(--foreground)) 55%, hsl(var(--primary) / 0.9) 80%, hsl(var(--primary)) 100%)',
              }}
            >
              {t('landingPage.headline1')}
            </span>
            <span
              className="block bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(var(--primary)) 50%, hsl(var(--foreground)) 100%)',
              }}
            >
              {t('landingPage.headline2')}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('landingPage.subhead', { tournament: BRANDING.tournament })}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-2xl px-6 text-base font-bold shadow-[0_20px_60px_hsl(var(--primary)/0.25)] transition-transform motion-safe:hover:-translate-y-0.5">
              <Link to="/auth?tab=signup" aria-label="Create your account">
                {t('landingPage.ctaStart')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-2xl px-6 text-base font-bold backdrop-blur transition-transform motion-safe:hover:-translate-y-0.5"
            >
              <Link to="/auth?tab=signin" aria-label="Sign in to your account">
                {t('landingPage.ctaSignIn')}
              </Link>
            </Button>
          </div>

          {/* Feature pills */}
          <div className="mt-7 flex flex-wrap gap-2">
            {[t('landingPage.tags.groupStage'), t('landingPage.tags.knockouts'), t('landingPage.tags.privateLeagues'), t('landingPage.tags.liveScoring')].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-card/40 px-3.5 py-2 text-xs text-muted-foreground backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Numbers */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { n: '104', l: t('landingPage.stats.matches') },
              { n: '12', l: t('landingPage.stats.groups') },
              { n: 'Top 8', l: t('landingPage.stats.topEight') },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-border bg-gradient-to-b from-card/60 to-card/20 p-5 backdrop-blur"
              >
                <strong className="block font-display text-3xl tracking-tight text-foreground">
                  {s.n}
                </strong>
                <small className="mt-1 block text-xs text-muted-foreground">{s.l}</small>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT — Visual board */}
        <aside aria-hidden className="relative z-10">
          <div className="relative min-h-[640px] overflow-hidden rounded-[2rem] border border-border bg-gradient-to-b from-card/70 to-card/30 shadow-[0_30px_120px_hsl(var(--background)/0.7)] backdrop-blur-xl">
            {/* Topbar */}
            <div className="absolute left-5 right-5 top-5 z-10 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-border bg-background/40 p-4 backdrop-blur">
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {t('landingPage.tonight')}
                </div>
                <div className="mt-1 font-display text-2xl uppercase leading-none">
                  {t('landingPage.matchday')}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/40 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-accent/20 px-3 py-1.5 text-xs font-bold text-accent-foreground">
                    {t('landingPage.rank')}
                  </span>
                  <Trophy className="h-4 w-4 text-gold" />
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full w-[74%] rounded-full"
                    style={{
                      backgroundImage:
                        'linear-gradient(90deg, hsl(var(--accent)), hsl(var(--primary)), hsl(var(--gold)))',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Pitch */}
            <div
              className="absolute inset-x-5 overflow-hidden rounded-[1.75rem] border border-border/60"
              style={{
                top: '9rem',
                bottom: '11.5rem',
                background:
                  'radial-gradient(circle at center, hsl(var(--primary) / 0.18), hsl(var(--background) / 0.1) 70%), linear-gradient(180deg, hsl(var(--primary) / 0.10), hsl(var(--accent) / 0.08))',
              }}
            >
              {/* stripes */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background:
                    'repeating-linear-gradient(180deg, hsl(var(--foreground) / 0.02) 0, hsl(var(--foreground) / 0.02) 46px, hsl(var(--foreground) / 0.06) 46px, hsl(var(--foreground) / 0.06) 48px)',
                }}
              />
              {/* lines */}
              <div className="absolute inset-4 rounded-2xl border border-foreground/15" />
              <div className="absolute bottom-4 left-1/2 top-4 -translate-x-1/2 border-l border-foreground/15" />
              <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/15" />
              <div className="absolute left-1/2 top-4 h-20 w-48 -translate-x-1/2 rounded-b-2xl border border-foreground/15" />
              <div className="absolute bottom-4 left-1/2 h-20 w-48 -translate-x-1/2 rounded-t-2xl border border-foreground/15" />
              {/* markers */}
              {[
                { c: 'bg-accent', l: '26%', t: '34%' },
                { c: 'bg-gold', l: '62%', t: '28%' },
                { c: 'bg-accent', l: '48%', t: '49%' },
                { c: 'bg-gold', l: '36%', t: '66%' },
                { c: 'bg-accent', l: '68%', t: '58%' },
              ].map((m, i) => (
                <span
                  key={i}
                  className={`absolute h-4 w-4 rounded-full border-2 border-background/80 shadow-[0_0_0_6px_hsl(var(--background)/0.3)] ${m.c}`}
                  style={{ left: m.l, top: m.t }}
                />
              ))}
              {/* ball */}
              <span
                className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_24px_hsl(var(--foreground)/0.35)]"
                style={{
                  left: '52%',
                  top: '47%',
                  background:
                    'radial-gradient(circle at 35% 35%, hsl(var(--background)) 0%, hsl(var(--muted)) 58%, hsl(var(--muted-foreground)) 100%)',
                }}
              />
            </div>

            {/* Bottom cards */}
            <div className="absolute bottom-5 left-5 right-5 z-10 grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-border bg-background/40 p-4 backdrop-blur">
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {t('landingPage.nextMatch')}
                </div>
                <div className="mt-3 rounded-xl border border-border/60 bg-card/40 p-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-accent-foreground/80">
                    <span>Group D</span>
                    <span>21:00</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm font-bold">
                    <span>Team A</span>
                    <span className="text-muted-foreground">vs</span>
                    <span>Team B</span>
                  </div>
                </div>
              </div>
              <div
                className="rounded-2xl border border-border p-4 backdrop-blur"
                style={{
                  background:
                    'linear-gradient(180deg, hsl(var(--gold) / 0.18), hsl(var(--gold) / 0.08))',
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {t('landingPage.yourEdge')}
                </div>
                <div className="mt-1 font-display text-3xl leading-none">{t('landingPage.edgePoints')}</div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('landingPage.edgeDesc')}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-bold">
                  {t('landingPage.streak')}
                </span>
              </div>
            </div>
          </div>

          {/* floating chips */}
          <div className="pointer-events-none absolute -left-3 top-10 hidden lg:block">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-2 text-xs font-bold backdrop-blur">
              <Target className="h-3.5 w-3.5 text-primary" /> {t('landingPage.exact')}
            </div>
          </div>
          <div className="pointer-events-none absolute -right-3 bottom-24 hidden lg:block">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-2 text-xs font-bold backdrop-blur">
              <Users className="h-3.5 w-3.5 text-accent" /> {t('landingPage.leagueSize')}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mx-auto max-w-7xl px-5 pb-8 text-center md:px-8">
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          {BRANDING.disclaimer}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()} {BRANDING.appName}. {t('landingPage.rights')}
        </p>
      </footer>
    </div>
  );
}