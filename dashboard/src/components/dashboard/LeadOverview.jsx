import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLeadsSummary } from '../../hooks/useLeads';
import { useFilters } from '../../context/FilterContext';

const COLORS = {
  alec: '#3B82F6',
  janae: '#10B981',
  kate: '#F59E0B'
};

const STATUS_COLORS = {
  new: '#6B7280',
  in_sequence: '#3B82F6',
  converted: '#10B981'
};

export default function LeadOverview() {
  const { owner, dateRange } = useFilters();
  const { data, isLoading } = useLeadsSummary(owner, dateRange);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Overview</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const ownerData = data?.byOwner?.map(o => ({
    name: o.owner?.charAt(0).toUpperCase() + o.owner?.slice(1) || 'Unknown',
    count: o.count,
    color: COLORS[o.owner] || '#6B7280'
  })) || [];

  const statusData = Object.entries(data?.byStatus || {}).map(([status, count]) => ({
    name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count,
    color: STATUS_COLORS[status] || '#6B7280'
  }));

  const sourceData = data?.bySource?.map(s => ({
    name: s.source?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
    count: s.count
  })) || [];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Lead Overview</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Owner */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">By Owner</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {ownerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Status */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">By Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Source */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">By Source</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
