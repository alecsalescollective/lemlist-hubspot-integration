import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterProvider } from './context/FilterContext';
import Layout from './components/layout/Layout';
import FunnelChart from './components/dashboard/FunnelChart';
import GTMKPIBar from './components/dashboard/GTMKPIBar';
import LeadOverview from './components/dashboard/LeadOverview';
import CampaignTable from './components/dashboard/CampaignTable';
import LeadActivityFeed from './components/dashboard/LeadActivityFeed';
import MeetingsBooked from './components/dashboard/MeetingsBooked';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function Dashboard() {
  return (
    <Layout>
      {/* Funnel Visualization - Full Width */}
      <FunnelChart />

      {/* GTM KPI Cards */}
      <GTMKPIBar />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Campaign Performance */}
        <CampaignTable />

        {/* Lead Overview */}
        <LeadOverview />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Activity Feed */}
        <LeadActivityFeed />

        {/* Meetings Booked */}
        <MeetingsBooked />
      </div>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FilterProvider>
        <Dashboard />
      </FilterProvider>
    </QueryClientProvider>
  );
}

export default App;
