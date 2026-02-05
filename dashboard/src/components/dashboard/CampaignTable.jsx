import { useState } from 'react';
import { ChevronUp, ChevronDown, AlertCircle, Flame, Calendar, BarChart2 } from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useTriggerSync } from '../../hooks/useSync';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonTable, Badge, getStatusVariant, PerformanceIndicator } from '../ui';
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
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Campaign Performance</h2>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
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
    <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
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
        /* Table - responsive with horizontal scroll */
        <div className={table.container}>
          <table className={table.wrapper} role="grid" aria-label="Campaign performance data">
            <thead className={table.headerSticky}>
              <tr className={table.headerRow}>
                {/* Always visible columns */}
                <th scope="col" className={`${table.headerCell} hidden sm:table-cell`}>
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
                <th scope="col" className={`${table.headerCell} hidden lg:table-cell`}>
                  Owner
                </th>
                <th
                  scope="col"
                  className={`${getHeaderClasses('leadsCount', 'right')} hidden md:table-cell`}
                  onClick={() => handleSort('leadsCount')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'leadsCount')}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={sortField === 'leadsCount' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Leads
                  <SortIcon field="leadsCount" />
                </th>
                {/* Hidden on mobile/tablet */}
                <th scope="col" className={`${table.headerCellRight} hidden xl:table-cell`}>
                  Sent
                </th>
                <th scope="col" className={`${table.headerCellRight} hidden xl:table-cell`}>
                  Opens
                </th>
                {/* Key metrics - always visible */}
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
                <th scope="col" className={`${table.headerCellRight} hidden md:table-cell`}>
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
                  <span className="hidden sm:inline">Meeting %</span>
                  <span className="sm:hidden">Mtg %</span>
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
                    {/* Status - hidden on mobile */}
                    <td className={`${table.bodyCell} hidden sm:table-cell`}>
                      <Badge variant={getStatusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </td>
                    {/* Campaign name with indicators */}
                    <td className={table.bodyCell}>
                      <div className="flex items-center gap-2">
                        <span className={`${typography.tableBody} truncate max-w-[150px] sm:max-w-[200px] lg:max-w-none`} title={campaign.name}>
                          {campaign.name}
                        </span>
                        {isLowPerforming && (
                          <span title="Low reply rate - needs attention" aria-label="Warning: Low reply rate">
                            <AlertCircle
                              className={`${iconSizes.sm} text-red-500 dark:text-red-400 flex-shrink-0`}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        {isHighPerforming && (
                          <span title="High meeting conversion - top performer" aria-label="High meeting conversion rate">
                            <Flame
                              className={`${iconSizes.sm} text-orange-500 dark:text-orange-400 flex-shrink-0`}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Owner - hidden on tablet and below */}
                    <td className={`${table.bodyCellSecondary} capitalize hidden lg:table-cell`}>
                      {campaign.owner || '-'}
                    </td>
                    {/* Leads - hidden on mobile */}
                    <td className={`${table.bodyCellRight} hidden md:table-cell`}>
                      {campaign.metrics?.leadsCount || 0}
                    </td>
                    {/* Sent/Opens - hidden on smaller screens */}
                    <td className={`${table.bodyCellSecondary} text-right hidden xl:table-cell`}>
                      {campaign.metrics?.emailsSent || 0}
                    </td>
                    <td className={`${table.bodyCellSecondary} text-right hidden xl:table-cell`}>
                      {campaign.metrics?.emailsOpened || 0}
                    </td>
                    {/* Reply % - always visible with performance indicator */}
                    <td className={table.bodyCellRight}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={
                            isLowPerforming
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : ''
                          }
                        >
                          {replyRate}%
                        </span>
                        <PerformanceIndicator value={replyRate} metricType="replyRate" />
                      </div>
                    </td>
                    {/* Meetings - hidden on mobile */}
                    <td className={`${table.bodyCellRight} hidden md:table-cell`}>
                      <div className="flex items-center justify-end gap-1">
                        <Calendar
                          className={`${iconSizes.sm} text-gray-400 dark:text-gray-500`}
                          aria-hidden="true"
                        />
                        <span>{meetingsBooked}</span>
                      </div>
                    </td>
                    {/* Meeting % - always visible with performance indicator */}
                    <td className={table.bodyCellRight}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={
                            isHighPerforming
                              ? 'text-green-600 dark:text-green-400 font-medium'
                              : ''
                          }
                        >
                          {meetingRate}%
                        </span>
                        <PerformanceIndicator value={meetingRate} metricType="meetingRate" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Benchmark note */}
      {campaigns.length > 0 && (
        <p className={`${typography.small} mt-4 text-center`}>
          Industry avg: Reply 8-12% · Meeting 4-6%
        </p>
      )}
    </div>
  );
}
