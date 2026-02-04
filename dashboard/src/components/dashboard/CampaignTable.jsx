import { useState } from 'react';
import { ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFilters } from '../../context/FilterContext';

export default function CampaignTable() {
  const { owner } = useFilters();
  const { data, isLoading } = useCampaigns(owner);
  const [sortField, setSortField] = useState('replyRate');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];

  // Sort campaigns
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'name':
        aVal = a.name?.toLowerCase() || '';
        bVal = b.name?.toLowerCase() || '';
        break;
      case 'leadsCount':
        aVal = a.metrics?.leadsCount || 0;
        bVal = b.metrics?.leadsCount || 0;
        break;
      case 'replyRate':
        aVal = a.metrics?.replyRate || 0;
        bVal = b.metrics?.replyRate || 0;
        break;
      default:
        return 0;
    }
    if (sortDir === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline" />
    ) : (
      <ChevronDown className="w-4 h-4 inline" />
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
        <span className="text-sm text-gray-500">{campaigns.length} campaigns</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Status</th>
              <th
                className="text-left py-3 px-2 text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('name')}
              >
                Campaign <SortIcon field="name" />
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Owner</th>
              <th
                className="text-right py-3 px-2 text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('leadsCount')}
              >
                Leads <SortIcon field="leadsCount" />
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Sent</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Opens</th>
              <th
                className="text-right py-3 px-2 text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('replyRate')}
              >
                Reply Rate <SortIcon field="replyRate" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCampaigns.map((campaign) => {
              const replyRate = campaign.metrics?.replyRate || 0;
              const isLowPerforming = replyRate < 10 && campaign.metrics?.emailsSent > 0;

              return (
                <tr
                  key={campaign.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{campaign.name}</span>
                      {isLowPerforming && (
                        <AlertCircle className="w-4 h-4 text-red-500" title="Low reply rate" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600 capitalize">
                    {campaign.owner || '-'}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-900 text-right">
                    {campaign.metrics?.leadsCount || 0}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600 text-right">
                    {campaign.metrics?.emailsSent || 0}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600 text-right">
                    {campaign.metrics?.emailsOpened || 0}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={`text-sm font-medium ${isLowPerforming ? 'text-red-600' : 'text-gray-900'}`}>
                      {replyRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {campaigns.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No campaigns found. Trigger a sync to load data.
          </div>
        )}
      </div>
    </div>
  );
}
