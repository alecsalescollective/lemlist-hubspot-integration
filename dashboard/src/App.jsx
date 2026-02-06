import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterProvider } from './context/FilterContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
import PasswordGate from './components/PasswordGate';
import Layout from './components/layout/Layout';
import FunnelChart from './components/dashboard/FunnelChart';
import GTMKPIBar from './components/dashboard/GTMKPIBar';
import LeadOverview from './components/dashboard/LeadOverview';
import CampaignTable from './components/dashboard/CampaignTable';
import LeadActivityFeed from './components/dashboard/LeadActivityFeed';
import MeetingsBooked from './components/dashboard/MeetingsBooked';
import { layout } from './styles/designTokens';
import { useAutoSync } from './hooks/useSync';

// Create React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

function Dashboard() {
  // Auto-sync on mount and every 15 minutes
  useAutoSync();

  return (
    <Layout>
      {/* Funnel Visualization - Full Width */}
      <FunnelChart />

      {/* GTM KPI Cards */}
      <GTMKPIBar />

      {/* Main Grid - Campaign Performance + Lead Overview */}
      <div className={`${layout.grid2} ${layout.sectionGap} ${layout.sectionMargin}`}>
        <CampaignTable />
        <LeadOverview />
      </div>

      {/* Bottom Grid - Activity Feed + Meetings */}
      <div className={`${layout.grid2} ${layout.sectionGap}`}>
        <LeadActivityFeed />
        <MeetingsBooked />
      </div>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PasswordGate>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <FilterProvider>
                <Dashboard />
              </FilterProvider>
            </ToastProvider>
          </QueryClientProvider>
        </PasswordGate>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
