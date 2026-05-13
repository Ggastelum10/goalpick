import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { ChatBox } from '@/components/ChatBox';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUserLeagues } from '@/hooks/useUserLeagues';
import { MessageSquare, Globe, Loader2 } from 'lucide-react';
import { LeagueLogo } from '@/components/LeagueLogo';

const LAST_CHAT_KEY = 'goalpick-last-chat';
const COMMUNITY_TAB = 'community';

export default function Chat() {
  const { data: leagues, isLoading } = useUserLeagues();
  const [selectedTab, setSelectedTab] = useState<string>(COMMUNITY_TAB);

  // Initialize selected tab from localStorage
  useEffect(() => {
    const lastChat = localStorage.getItem(LAST_CHAT_KEY);
    if (lastChat) {
      // Validate if the stored league still exists
      if (lastChat === COMMUNITY_TAB) {
        setSelectedTab(COMMUNITY_TAB);
      } else if (leagues?.find(l => l.id === lastChat)) {
        setSelectedTab(lastChat);
      }
    }
  }, [leagues]);

  // Save selected tab to localStorage
  useEffect(() => {
    if (selectedTab) {
      localStorage.setItem(LAST_CHAT_KEY, selectedTab);
    }
  }, [selectedTab]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const isCommunity = selectedTab === COMMUNITY_TAB;
  const currentLeague = !isCommunity ? leagues?.find(l => l.id === selectedTab) : null;

  return (
    <Layout>
      <div className="space-y-4 h-[calc(100vh-12rem)]">
        <div>
          <h1 className="font-display text-3xl">Chat</h1>
          <p className="text-muted-foreground">Chat with the Goalpick community or your leagues</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-[calc(100%-5rem)]">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap scrollbar-hide">
            {/* Community Tab - Always first */}
            <TabsTrigger 
              value={COMMUNITY_TAB}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Globe className="h-4 w-4" />
              <span>Community</span>
              <span className="text-xs text-amber-500 font-medium">(Public)</span>
            </TabsTrigger>

            {/* League Tabs */}
            {leagues?.map((league) => (
              <TabsTrigger 
                key={league.id} 
                value={league.id}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <LeagueLogo url={league.logo_url} name={league.name} size="xs" />
                <span className="truncate max-w-[150px]">{league.name}</span>
                <span className="text-xs text-muted-foreground">({league.member_count})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Community Chat Content */}
          <TabsContent 
            value={COMMUNITY_TAB} 
            className="h-[calc(100%-3rem)] mt-4"
          >
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b py-2 md:py-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-amber-500" />
                  Goalpick Community
                  <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                    Public
                  </span>
                </CardTitle>
              </CardHeader>
              <ChatBox leagueId={null} isCommunity className="flex-1" />
            </Card>
          </TabsContent>

          {/* League Chat Contents */}
          {leagues?.map((league) => (
            <TabsContent 
              key={league.id} 
              value={league.id} 
              className="h-[calc(100%-3rem)] mt-4"
            >
              <Card className="h-full flex flex-col">
                <CardHeader className="border-b py-2 md:py-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LeagueLogo url={league.logo_url} name={league.name} size="sm" />
                    {league.name}
                  </CardTitle>
                </CardHeader>
                <ChatBox leagueId={league.id} isLeagueOwner={league.is_owner} className="flex-1" />
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
