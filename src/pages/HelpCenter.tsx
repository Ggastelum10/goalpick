import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, MessageSquare, BookOpen } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FaqSection } from '@/components/FaqSection';
import { HelpChatBot } from '@/components/HelpChatBot';
import { CreateSupportTicketDialog } from '@/components/CreateSupportTicketDialog';
import { ChatMessage } from '@/hooks/useHelpChat';

export default function HelpCenter() {
  const { t } = useTranslation();
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [chatHistoryForTicket, setChatHistoryForTicket] = useState<ChatMessage[]>([]);

  const handleEscalate = (chatHistory: ChatMessage[]) => {
    setChatHistoryForTicket(chatHistory);
    setTicketDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl">{t('helpCenter.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('helpCenter.subtitle')}</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="faq" className="gap-2">
              <BookOpen className="h-4 w-4" />
              {t('helpCenter.faqTab')}
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('helpCenter.aiChat')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <FaqSection />
          </TabsContent>

          <TabsContent value="chat">
            <HelpChatBot onEscalate={handleEscalate} />
          </TabsContent>
        </Tabs>

        {/* Support Ticket Dialog */}
        <CreateSupportTicketDialog
          open={ticketDialogOpen}
          onOpenChange={setTicketDialogOpen}
          chatHistory={chatHistoryForTicket}
        />
      </div>
    </Layout>
  );
}
