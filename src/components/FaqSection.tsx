import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { faqData } from '@/data/faqData';

export function FaqSection() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaq = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqData.map(category => ({
        ...category,
        items: category.items.map(item => ({
          question: t(item.questionKey),
          answer: t(item.answerKey),
        })),
      }));
    }

    const query = searchQuery.toLowerCase();
    return faqData
      .map(category => ({
        ...category,
        items: category.items
          .map(item => ({
            question: t(item.questionKey),
            answer: t(item.answerKey),
          }))
          .filter(
            item =>
              item.question.toLowerCase().includes(query) ||
              item.answer.toLowerCase().includes(query)
          ),
      }))
      .filter(category => category.items.length > 0);
  }, [searchQuery, t]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('helpCenter.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQ Categories */}
      {filteredFaq.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('helpCenter.noResults', { query: searchQuery })}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFaq.map((category) => (
            <div key={category.id} className="space-y-2">
              <h3 className="font-semibold text-lg">
                {t(category.titleKey)}
              </h3>
              <Accordion type="single" collapsible className="w-full">
                {category.items.map((item, index) => (
                  <AccordionItem key={index} value={`${category.id}-${index}`}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
