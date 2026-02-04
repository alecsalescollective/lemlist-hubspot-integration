import { Users, Send, Calendar, Percent } from 'lucide-react';
import KPICard from './KPICard';
import { useLeadsSummary } from '../../hooks/useLeads';
import { useMeetingStats } from '../../hooks/useMeetings';
import { useFilters } from '../../context/FilterContext';

export default function KPIBar() {
  const { owner, dateRange } = useFilters();
  const { data: leadsSummary, isLoading: leadsLoading } = useLeadsSummary(owner, dateRange);
  const { data: meetingStats, isLoading: meetingsLoading } = useMeetingStats(owner, dateRange);

  const inSequence = leadsSummary?.byStatus?.in_sequence || 0;
  const totalMeetings = meetingStats?.overall?.totalMeetings || 0;
  const conversionRate = meetingStats?.overall?.conversionRate || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <KPICard
        title="Total Leads"
        value={leadsSummary?.total || 0}
        delta={leadsSummary?.delta}
        icon={Users}
        loading={leadsLoading}
      />
      <KPICard
        title="In Sequence"
        value={inSequence}
        icon={Send}
        loading={leadsLoading}
      />
      <KPICard
        title="Meetings"
        value={totalMeetings}
        icon={Calendar}
        loading={meetingsLoading}
      />
      <KPICard
        title="Conv. Rate"
        value={`${conversionRate}%`}
        icon={Percent}
        loading={meetingsLoading}
      />
    </div>
  );
}
