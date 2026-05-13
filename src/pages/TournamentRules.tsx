import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Globe, Users, Trophy, Scale, Clock, AlertTriangle, Target, Download, FileText, ExternalLink } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

const TournamentRules = () => {
  const { t } = useTranslation();
  const pdfUrl = '/docs/FWC26_Competition_Regulations_EN.pdf';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            {t('tournamentRules.header.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('tournamentRules.header.subtitle')}
          </p>
        </div>

        {/* User-Friendly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {t('tournamentRules.summary.title')}
            </CardTitle>
            <CardDescription>
              {t('tournamentRules.summary.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full" defaultValue={["overview"]}>
              {/* Tournament Overview */}
              <AccordionItem value="overview">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span>{t('tournamentRules.overview.title')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">{t('tournamentRules.overview.teams')}</p>
                        <p className="font-semibold">{t('tournamentRules.overview.teamsValue')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">{t('tournamentRules.overview.groups')}</p>
                        <p className="font-semibold">{t('tournamentRules.overview.groupsValue')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">{t('tournamentRules.overview.matches')}</p>
                        <p className="font-semibold">{t('tournamentRules.overview.matchesValue')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">{t('tournamentRules.overview.duration')}</p>
                        <p className="font-semibold">{t('tournamentRules.overview.durationValue')}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground">{t('tournamentRules.overview.hostCountries')}</p>
                      <p className="font-semibold">{t('tournamentRules.overview.hostCountriesValue')}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Group Stage Format */}
              <AccordionItem value="group-stage">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{t('tournamentRules.groupStage.title')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>
                      <Trans i18nKey="tournamentRules.groupStage.intro" components={{ strong: <strong /> }} />
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="font-medium">{t('tournamentRules.groupStage.pointsTitle')}</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>
                          <Trans i18nKey="tournamentRules.groupStage.win" components={{ strong: <span className="text-foreground font-semibold" /> }} />
                        </li>
                        <li>
                          <Trans i18nKey="tournamentRules.groupStage.draw" components={{ strong: <span className="text-foreground font-semibold" /> }} />
                        </li>
                        <li>
                          <Trans i18nKey="tournamentRules.groupStage.loss" components={{ strong: <span className="text-foreground font-semibold" /> }} />
                        </li>
                      </ul>
                    </div>
                    <p className="text-muted-foreground">{t('tournamentRules.groupStage.matchLength')}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Advancement Rules */}
              <AccordionItem value="advancement">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span>{t('tournamentRules.advancement.title')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>
                      <Trans i18nKey="tournamentRules.advancement.intro" components={{ strong: <strong /> }} />
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">24</div>
                        <span>{t('tournamentRules.advancement.top2')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">8</div>
                        <span>{t('tournamentRules.advancement.bestThird')}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{t('tournamentRules.advancement.tiebreakerNote')}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Knockout Stages */}
              <AccordionItem value="knockout">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span>{t('tournamentRules.knockout.title')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>{t('tournamentRules.knockout.intro')}</p>
                    <div className="space-y-2">
                      {(['r32', 'r16', 'qf', 'sf', 'third'] as const).map((row) => (
                        <div key={row} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                          <div className="w-24 text-muted-foreground">{t(`tournamentRules.knockout.rows.${row}.label`)}</div>
                          <div className="font-semibold">{t(`tournamentRules.knockout.rows.${row}.teams`)}</div>
                          <div className="text-muted-foreground text-xs">{t(`tournamentRules.knockout.rows.${row}.matches`)}</div>
                        </div>
                      ))}
                      <div className="flex items-center gap-3 p-2 bg-primary/10 rounded border border-primary/20">
                        <div className="w-24 text-primary font-medium">{t('tournamentRules.knockout.rows.final.label')}</div>
                        <div className="font-semibold">{t('tournamentRules.knockout.rows.final.teams')}</div>
                        <div className="text-muted-foreground text-xs">{t('tournamentRules.knockout.rows.final.matches')}</div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Tiebreaker Criteria */}
              <AccordionItem value="tiebreaker">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" />
                    <span>{t('tournamentRules.tiebreaker.title')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    <p>{t('tournamentRules.tiebreaker.intro')}</p>

                    <div className="space-y-3">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="font-semibold text-primary mb-2">{t('tournamentRules.tiebreaker.step1Title')}</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          <li>{t('tournamentRules.tiebreaker.step1.points')}</li>
                          <li>{t('tournamentRules.tiebreaker.step1.gd')}</li>
                          <li>{t('tournamentRules.tiebreaker.step1.goals')}</li>
                        </ol>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="font-semibold text-primary mb-2">{t('tournamentRules.tiebreaker.step2Title')}</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground" start={4}>
                          <li>{t('tournamentRules.tiebreaker.step2.gd')}</li>
                          <li>{t('tournamentRules.tiebreaker.step2.goals')}</li>
                          <li>{t('tournamentRules.tiebreaker.step2.fairPlay')}</li>
                          <li>{t('tournamentRules.tiebreaker.step2.lots')}</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Extra Time & Penalties */}
              <AccordionItem value="extra-time">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{t('tournamentRules.extraTime.title')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>{t('tournamentRules.extraTime.intro')}</p>

                    <div className="space-y-2">
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</div>
                        <div>
                          <p className="font-semibold">{t('tournamentRules.extraTime.step1Title')}</p>
                          <p className="text-muted-foreground">{t('tournamentRules.extraTime.step1Desc')}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</div>
                        <div>
                          <p className="font-semibold">{t('tournamentRules.extraTime.step2Title')}</p>
                          <p className="text-muted-foreground">{t('tournamentRules.extraTime.step2Desc')}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-xs">{t('tournamentRules.extraTime.subNote')}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Fair Play Points */}
              <AccordionItem value="fair-play">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <span>{t('tournamentRules.fairPlay.title')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>{t('tournamentRules.fairPlay.intro')}</p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4">{t('tournamentRules.fairPlay.cardType')}</th>
                            <th className="text-right py-2">{t('tournamentRules.fairPlay.pointsDeducted')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr>
                            <td className="py-2 pr-4 flex items-center gap-2">
                              <div className="w-3 h-4 bg-amber-400 rounded-sm" />
                              {t('tournamentRules.fairPlay.yellow')}
                            </td>
                            <td className="text-right py-2 font-semibold text-destructive">-1</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 flex items-center gap-2">
                              <div className="flex gap-0.5">
                                <div className="w-3 h-4 bg-amber-400 rounded-sm" />
                                <div className="w-3 h-4 bg-amber-400 rounded-sm" />
                              </div>
                              {t('tournamentRules.fairPlay.secondYellow')}
                            </td>
                            <td className="text-right py-2 font-semibold text-destructive">-3</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 flex items-center gap-2">
                              <div className="w-3 h-4 bg-destructive rounded-sm" />
                              {t('tournamentRules.fairPlay.directRed')}
                            </td>
                            <td className="text-right py-2 font-semibold text-destructive">-4</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 flex items-center gap-2">
                              <div className="flex gap-0.5">
                                <div className="w-3 h-4 bg-amber-400 rounded-sm" />
                                <div className="w-3 h-4 bg-destructive rounded-sm" />
                              </div>
                              {t('tournamentRules.fairPlay.yellowPlusRed')}
                            </td>
                            <td className="text-right py-2 font-semibold text-destructive">-5</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* PDF Document Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('tournamentRules.pdf.title')}
            </CardTitle>
            <CardDescription>
              {t('tournamentRules.pdf.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Download Button - Always visible */}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={pdfUrl} download="FWC26_Competition_Regulations_EN.pdf">
                  <Download className="h-4 w-4 mr-2" />
                  {t('tournamentRules.pdf.download')}
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('tournamentRules.pdf.openNewTab')}
                </a>
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TournamentRules;
