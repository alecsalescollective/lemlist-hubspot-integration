import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterProvider } from './context/FilterContext';
import Layout from './components/layout/Layout';
import KPIBar from './components/dashboard/KPIBar';
import LeadOverview from './components/dashboard/LeadOverview';
import CampaignTable from './components/dashboard/CampaignTable';
import TaskTracker from './components/dashboard/TaskTracker';
import MeetingTracker from './components/dashboard/MeetingTracker';

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
      {/* KPI Cards */}
      <KPIBar />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Lead Overview */}
        <LeadOverview />

        {/* Campaign Performance */}
        <CampaignTable />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Tracker */}
        <TaskTracker />

        {/* Meeting Tracker */}
        <MeetingTracker />
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
