import { useState } from 'react';
import { ChevronUp, ChevronDown, AlertCircle, Flame, Calendar } from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFilters } from '../../context/FilterContext';
import {
  typography,
  spacing,
  card,
  interactive,
  iconSizes,
  statusColors,
  getStatusColors
} from '../../styles/designTokens';

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
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Campaign Performance</h2>
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
      case 'meetingRate':
        aVal = a.metrics?.meetingConversionRate || 0;
        bVal = b.metrics?.meetingConversionRate || 0;
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
      <ChevronUp className={`${iconSizes.sm} inline ml-1`} />
    ) : (
      <ChevronDown className={`${iconSizes.sm} inline ml-1`} />
    );
  };

  const getStatusClasses = (status) => {
    const colors = getStatusColors(status);
    return `${colors.bg} ${colors.text}`;
  };

  // Header cell base styling
  const headerCell = `py-3 px-3 ${typography.tableHeader}`;
  const headerCellSortable = `${headerCell} cursor-pointer hover:text-gray-700 ${interactive.focusRing} outline-none`;

  return (
    <div className={`${card.base} ${spacing.cardPadding}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={typography.cardTitle}>Campaign Performance</h2>
        <span className={typography.label}>{campaigns.length} campaigns</span>
      </div>

      <div className="overflow-x-auto -mx-8 px-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className={`text-left ${headerCell}`}>Status</th>
              <th
                className={`text-left ${headerCellSortable}`}
                onClick={() => handleSort('name')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('name')}
              >
                Campaign<SortIcon field="name" />
              </th>
              <th className={`text-left ${headerCell}`}>Owner</th>
              <th
                className={`text-right ${headerCellSortable}`}
                onClick={() => handleSort('leadsCount')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('leadsCount')}
              >
                Leads<SortIcon field="leadsCount" />
              </th>
              <th className={`text-right ${headerCell}`}>Sent</th>
              <th className={`text-right ${headerCell}`}>Opens</th>
              <th
                className={`text-right ${headerCellSortable}`}
                onClick={() => handleSort('replyRate')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('replyRate')}
              >
                Reply %<SortIcon field="replyRate" />
              </th>
              <th className={`text-right ${headerCell}`}>
                Meetings
              </th>
              <th
                className={`text-right ${headerCellSortable}`}
                onClick={() => handleSort('meetingRate')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('meetingRate')}
              >
                Meeting %<SortIcon field="meetingRate" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCampaigns.map((campaign) => {
              const replyRate = campaign.metrics?.replyRate || 0;
              const meetingRate = campaign.metrics?.meetingConversionRate || 0;
              const meetingsBooked = campaign.metrics?.meetingsBooked || 0;
              const isLowPerforming = replyRate < 10 && campaign.metrics?.emailsSent > 0;
              const isHighPerforming = meetingRate >= 5;

              return (
                <tr
                  key={campaign.id}
                  className={`border-b border-gray-100 ${interactive.rowHover}`}
                >
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClasses(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className={typography.tableBody}>{campaign.name}</span>
                      {isLowPerforming && (
                        <AlertCircle className={`${iconSizes.sm} text-red-500`} title="Low reply rate" />
                      )}
                      {isHighPerforming && (
                        <Flame className={`${iconSizes.sm} text-orange-500`} title="High meeting conversion" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-600 capitalize">
                    {campaign.owner || '-'}
                  </td>
                  <td className={`py-3 px-3 text-right ${typography.bodyMetric}`}>
                    {campaign.metrics?.leadsCount || 0}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-600 text-right">
                    {campaign.metrics?.emailsSent || 0}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-600 text-right">
                    {campaign.metrics?.emailsOpened || 0}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`${typography.bodyMetric} ${isLowPerforming ? 'text-red-600' : ''}`}>
                      {replyRate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Calendar className={`${iconSizes.sm} text-gray-400`} />
                      <span className={typography.bodyMetric}>{meetingsBooked}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`${typography.bodyMetric} ${isHighPerforming ? 'text-green-600' : ''}`}>
                      {meetingRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {campaigns.length === 0 && (
          <div className="text-center py-12">
            <p className="font-medium text-gray-900">No campaigns found</p>
            <p className={`${typography.label} mt-2`}>Trigger a sync to load data</p>
          </div>
        )}
      </div>
    </div>
  );
}
