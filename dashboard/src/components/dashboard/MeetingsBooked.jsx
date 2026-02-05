import { Calendar, Building } from 'lucide-react';
import { format } from 'date-fns';
import { useMeetingStats, useMeetings } from '../../hooks/useMeetings';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonList, Badge, getOwnerVariant } from '../ui';
import {
  typography,
  spacing,
  card,
  interactive,
  iconSizes,
  getOwnerColors,
} from '../../styles/designTokens';

function OwnerMeetingBar({ owner, count, maxCount }) {
  const colors = getOwnerColors(owner);
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium capitalize w-16 ${colors.text}`}>
        {owner}
      </span>
      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${interactive.transitionSlow}`}
          style={{ width: `${percentage}%`, backgroundColor: colors.bar }}
          role="progressbar"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={maxCount}
          aria-label={`${owner}: ${count} meetings`}
        />
      </div>
      <span className={`${typography.bodyMetric} w-8 text-right`}>{count}</span>
    </div>
  );
}

function MeetingItem({ meeting }) {
  return (
    <li
      className={`flex items-start gap-3 ${spacing.listItemPadding} border-b border-gray-100 dark:border-gray-700 last:border-0 ${interactive.rowHover} px-2 -mx-2 rounded`}
    >
      {/* Calendar icon */}
      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
        <Calendar
          className={`${iconSizes.sm} text-green-600 dark:text-green-400`}
          aria-hidden="true"
        />
      </div>

      {/* Meeting content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={typography.tableBody}>
            {meeting.contactName || 'Unknown Contact'}
          </span>
          {meeting.owner && (
            <Badge variant={getOwnerVariant(meeting.owner)} size="sm">
              {meeting.owner}
            </Badge>
          )}
        </div>
        {meeting.contactCompany && (
          <div className="flex items-center gap-1 mt-0.5">
            <Building
              className="w-3 h-3 text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            />
            <span className={`${typography.small} truncate`}>
              {meeting.contactCompany}
            </span>
          </div>
        )}
      </div>

      {/* Scheduled time */}
      <time className={typography.small} dateTime={meeting.scheduledAt}>
        {meeting.scheduledAt
          ? format(new Date(meeting.scheduledAt), 'MMM d, h:mm a')
          : 'TBD'}
      </time>
    </li>
  );
}

export default function MeetingsBooked() {
  const { owner, dateRange } = useFilters();
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useMeetingStats(owner, dateRange);
  const {
    data: meetingsData,
    isLoading: meetingsLoading,
    error: meetingsError,
    refetch: refetchMeetings,
  } = useMeetings(owner, 'upcoming');

  const isLoading = statsLoading || meetingsLoading;
  const error = statsError || meetingsError;

  // Loading state
  if (isLoading) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Meetings Booked</h2>
        <SkeletonList count={4} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Meetings Booked</h2>
        <ErrorState
          title="Error loading meetings"
          message={error.message}
          onRetry={() => {
            refetchStats();
            refetchMeetings();
          }}
        />
      </div>
    );
  }

  const stats = statsData?.stats || [];
  const overall = statsData?.overall || {};
  const meetings = meetingsData?.meetings?.slice(0, 5) || [];

  // Get max for bar chart scaling
  const maxMeetings = Math.max(...stats.map((s) => s.total), 1);

  return (
    <div className={`${card.base} ${spacing.cardPadding}`}>
      {/* Header with total */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={typography.cardTitle}>Meetings Booked</h2>
        <div className="flex items-center gap-2">
          <span className={`${typography.cardMetric} text-green-600 dark:text-green-400`}>
            {overall.totalMeetings || 0}
          </span>
          <span className={typography.label}>total</span>
        </div>
      </div>

      {/* By Owner Breakdown */}
      {stats.length > 0 && (
        <div className="mb-8">
          <h3 className={`${typography.tableHeader} mb-4`}>By Owner</h3>
          <div className={spacing.stackMd}>
            {stats.map((stat) => (
              <OwnerMeetingBar
                key={stat.owner}
                owner={stat.owner}
                count={stat.total}
                maxCount={maxMeetings}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Meetings */}
      <div>
        <h3 className={`${typography.tableHeader} mb-4`}>Upcoming</h3>
        {meetings.length > 0 ? (
          <ul
            className="max-h-[200px] overflow-y-auto"
            role="list"
            aria-label="Upcoming meetings"
          >
            {meetings.map((meeting, index) => (
              <MeetingItem key={meeting.id || index} meeting={meeting} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No upcoming meetings"
            description="Book meetings to see them here."
          />
        )}
      </div>

      {/* Note about Salesforce */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <p className={`${typography.small} text-center`}>
          Meeting outcomes will be tracked after Salesforce integration
        </p>
      </div>
    </div>
  );
}
