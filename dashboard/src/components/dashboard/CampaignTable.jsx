import { useState } from 'react';
import { ChevronUp, ChevronDown, AlertCircle, Flame, Calendar, BarChart2 } from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useTriggerSync } from '../../hooks/useSync';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonTable, Badge, getStatusVariant } from '../ui';
import {
  typography,
  spacing,
  card,
  table,
  iconSizes,
  cn,
} from '../../styles/designTokens';

export default function CampaignTable() {
  const { owner } = useFilters();
  const { data, isLoading, error, refetch } = useCampaigns(owner);
  const triggerSync = useTriggerSync();
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

  // Handle keyboard navigation for sorting
  const handleSortKeyDown = (e, field) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(field);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Campaign Performance</h2>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Campaign Performance</h2>
        <ErrorState
          title="Error loading campaigns"
          message={error.message}
          onRetry={refetch}
        />
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

  // Sort indicator component
  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className={`${iconSizes.sm} inline ml-1`} aria-hidden="true" />
    ) : (
      <ChevronDown className={`${iconSizes.sm} inline ml-1`} aria-hidden="true" />
    );
  };

  // Get header cell classes with sort state
  const getHeaderClasses = (field, align = 'left') => {
    const baseClass = align === 'right' ? table.headerCellRight : table.headerCell;
    const sortable = table.headerCellSortable;
    const sorted = sortField === field ? table.headerCellSorted : '';
    return cn(baseClass, sortable, sorted);
  };

  return (
    <div className={`${card.base} ${spacing.cardPadding}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={typography.cardTitle}>Campaign Performance</h2>
        <span className={typography.label}>{campaigns.length} campaigns</span>
      </div>

      {/* Empty state */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title="No campaigns found"
          description="Sync your campaigns from Lemlist to see performance data and metrics."
          action="Sync Campaigns"
          onAction={() => triggerSync.mutate('campaigns')}
        />
      ) : (
        /* Table */
        <div className={table.container}>
          <table className={table.wrapper} role="grid" aria-label="Campaign performance data">
            <thead className={table.headerSticky}>
              <tr className={table.headerRow}>
                <th scope="col" className={table.headerCell}>
                  Status
                </th>
                <th
                  scope="col"
                  className={getHeaderClasses('name')}
                  onClick={() => handleSort('name')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'name')}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={sortField === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Campaign
                  <SortIcon field="name" />
                </th>
                <th scope="col" className={table.headerCell}>
                  Owner
                </th>
                <th
                  scope="col"
                  className={getHeaderClasses('leadsCount', 'right')}
                  onClick={() => handleSort('leadsCount')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'leadsCount')}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={sortField === 'leadsCount' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Leads
                  <SortIcon field="leadsCount" />
                </th>
                <th scope="col" className={table.headerCellRight}>
                  Sent
                </th>
                <th scope="col" className={table.headerCellRight}>
                  Opens
                </th>
                <th
                  scope="col"
                  className={getHeaderClasses('replyRate', 'right')}
                  onClick={() => handleSort('replyRate')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'replyRate')}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={sortField === 'replyRate' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Reply %
                  <SortIcon field="replyRate" />
                </th>
                <th scope="col" className={table.headerCellRight}>
                  Meetings
                </th>
                <th
                  scope="col"
                  className={getHeaderClasses('meetingRate', 'right')}
                  onClick={() => handleSort('meetingRate')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'meetingRate')}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={sortField === 'meetingRate' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Meeting %
                  <SortIcon field="meetingRate" />
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
                  <tr key={campaign.id} className={table.bodyRow}>
                    <td className={table.bodyCell}>
                      <Badge variant={getStatusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className={table.bodyCell}>
                      <div className="flex items-center gap-2">
                        <span className={typography.tableBody}>{campaign.name}</span>
                        {isLowPerforming && (
                          <span title="Low reply rate" aria-label="Warning: Low reply rate">
                            <AlertCircle
                              className={`${iconSizes.sm} text-red-500 dark:text-red-400`}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        {isHighPerforming && (
                          <span title="High meeting conversion" aria-label="High meeting conversion rate">
                            <Flame
                              className={`${iconSizes.sm} text-orange-500 dark:text-orange-400`}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${table.bodyCellSecondary} capitalize`}>
                      {campaign.owner || '-'}
                    </td>
                    <td className={table.bodyCellRight}>
                      {campaign.metrics?.leadsCount || 0}
                    </td>
                    <td className={table.bodyCellSecondary} style={{ textAlign: 'right' }}>
                      {campaign.metrics?.emailsSent || 0}
                    </td>
                    <td className={table.bodyCellSecondary} style={{ textAlign: 'right' }}>
                      {campaign.metrics?.emailsOpened || 0}
                    </td>
                    <td className={table.bodyCellRight}>
                      <span
                        className={
                          isLowPerforming
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : ''
                        }
                      >
                        {replyRate}%
                      </span>
                    </td>
                    <td className={table.bodyCellRight}>
                      <div className="flex items-center justify-end gap-1">
                        <Calendar
                          className={`${iconSizes.sm} text-gray-400 dark:text-gray-500`}
                          aria-hidden="true"
                        />
                        <span>{meetingsBooked}</span>
                      </div>
                    </td>
                    <td className={table.bodyCellRight}>
                      <span
                        className={
                          isHighPerforming
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : ''
                        }
                      >
                        {meetingRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
