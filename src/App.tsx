import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ViewModeProvider } from "./hooks/useViewMode";
import { ThemeProvider } from "./hooks/useTheme";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Matches from "./pages/Matches";
import SoloBracket from "./pages/SoloBracket";
import Leaderboard from "./pages/Leaderboard";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import Rules from "./pages/Rules";
import Leagues from "./pages/Leagues";
import CreateLeague from "./pages/CreateLeague";
import LeagueDetail from "./pages/LeagueDetail";
import LeagueMatches from "./pages/LeagueMatches";
import JoinLeague from "./pages/JoinLeague";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import TournamentRules from "./pages/TournamentRules";
import Profile from "./pages/Profile";
import HelpCenter from "./pages/HelpCenter";
import Install from "./pages/Install";
import LogoAudit from "./pages/LogoAudit";
import Landing from "./pages/Landing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ViewModeProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/solo-bracket" element={<SoloBracket />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
              
              <Route path="/chat" element={<Chat />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/tournament-rules" element={<TournamentRules />} />
              {/* Redirect old route */}
              <Route path="/fifa-criteria" element={<Navigate to="/tournament-rules" replace />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/leagues" element={<Leagues />} />
              <Route path="/leagues/create" element={<CreateLeague />} />
              <Route path="/leagues/:id" element={<LeagueDetail />} />
              <Route path="/leagues/:id/matches" element={<LeagueMatches />} />
              <Route path="/join/:inviteCode" element={<JoinLeague />} />
              <Route path="/join/:inviteCode/:slug" element={<JoinLeague />} />
              <Route path="/logo-audit" element={<LogoAudit />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </ViewModeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;