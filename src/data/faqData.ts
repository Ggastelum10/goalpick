export interface FaqItem {
  questionKey: string;
  answerKey: string;
}

export interface FaqCategory {
  id: string;
  titleKey: string;
  items: FaqItem[];
}

export const faqData: FaqCategory[] = [
  {
    id: 'gettingStarted',
    titleKey: 'helpCenter.categories.gettingStarted',
    items: [
      { questionKey: 'helpCenter.faq.gettingStarted.q1', answerKey: 'helpCenter.faq.gettingStarted.a1' },
      { questionKey: 'helpCenter.faq.gettingStarted.q2', answerKey: 'helpCenter.faq.gettingStarted.a2' },
      { questionKey: 'helpCenter.faq.gettingStarted.q3', answerKey: 'helpCenter.faq.gettingStarted.a3' },
      { questionKey: 'helpCenter.faq.gettingStarted.q4', answerKey: 'helpCenter.faq.gettingStarted.a4' }
    ]
  },
  {
    id: 'predictions',
    titleKey: 'helpCenter.categories.predictions',
    items: [
      { questionKey: 'helpCenter.faq.predictions.q1', answerKey: 'helpCenter.faq.predictions.a1' },
      { questionKey: 'helpCenter.faq.predictions.q2', answerKey: 'helpCenter.faq.predictions.a2' },
      { questionKey: 'helpCenter.faq.predictions.q3', answerKey: 'helpCenter.faq.predictions.a3' },
      { questionKey: 'helpCenter.faq.predictions.q4', answerKey: 'helpCenter.faq.predictions.a4' },
      { questionKey: 'helpCenter.faq.predictions.q5', answerKey: 'helpCenter.faq.predictions.a5' }
    ]
  },
  {
    id: 'scoring',
    titleKey: 'helpCenter.categories.scoring',
    items: [
      { questionKey: 'helpCenter.faq.scoring.q1', answerKey: 'helpCenter.faq.scoring.a1' },
      { questionKey: 'helpCenter.faq.scoring.q2', answerKey: 'helpCenter.faq.scoring.a2' },
      { questionKey: 'helpCenter.faq.scoring.q3', answerKey: 'helpCenter.faq.scoring.a3' },
      { questionKey: 'helpCenter.faq.scoring.q4', answerKey: 'helpCenter.faq.scoring.a4' }
    ]
  },
  {
    id: 'leagues',
    titleKey: 'helpCenter.categories.leagues',
    items: [
      { questionKey: 'helpCenter.faq.leagues.q1', answerKey: 'helpCenter.faq.leagues.a1' },
      { questionKey: 'helpCenter.faq.leagues.q2', answerKey: 'helpCenter.faq.leagues.a2' },
      { questionKey: 'helpCenter.faq.leagues.q3', answerKey: 'helpCenter.faq.leagues.a3' },
      { questionKey: 'helpCenter.faq.leagues.q4', answerKey: 'helpCenter.faq.leagues.a4' },
      { questionKey: 'helpCenter.faq.leagues.q5', answerKey: 'helpCenter.faq.leagues.a5' }
    ]
  },
  {
    id: 'account',
    titleKey: 'helpCenter.categories.account',
    items: [
      { questionKey: 'helpCenter.faq.account.q1', answerKey: 'helpCenter.faq.account.a1' },
      { questionKey: 'helpCenter.faq.account.q2', answerKey: 'helpCenter.faq.account.a2' },
      { questionKey: 'helpCenter.faq.account.q3', answerKey: 'helpCenter.faq.account.a3' },
      { questionKey: 'helpCenter.faq.account.q4', answerKey: 'helpCenter.faq.account.a4' }
    ]
  },
  {
    id: 'payments',
    titleKey: 'helpCenter.categories.payments',
    items: [
      { questionKey: 'helpCenter.faq.payments.q1', answerKey: 'helpCenter.faq.payments.a1' },
      { questionKey: 'helpCenter.faq.payments.q2', answerKey: 'helpCenter.faq.payments.a2' },
      { questionKey: 'helpCenter.faq.payments.q3', answerKey: 'helpCenter.faq.payments.a3' },
      { questionKey: 'helpCenter.faq.payments.q4', answerKey: 'helpCenter.faq.payments.a4' }
    ]
  },
  {
    id: 'technical',
    titleKey: 'helpCenter.categories.technical',
    items: [
      { questionKey: 'helpCenter.faq.technical.q1', answerKey: 'helpCenter.faq.technical.a1' },
      { questionKey: 'helpCenter.faq.technical.q2', answerKey: 'helpCenter.faq.technical.a2' },
      { questionKey: 'helpCenter.faq.technical.q3', answerKey: 'helpCenter.faq.technical.a3' },
      { questionKey: 'helpCenter.faq.technical.q4', answerKey: 'helpCenter.faq.technical.a4' },
      { questionKey: 'helpCenter.faq.technical.q5', answerKey: 'helpCenter.faq.technical.a5' }
    ]
  }
];
