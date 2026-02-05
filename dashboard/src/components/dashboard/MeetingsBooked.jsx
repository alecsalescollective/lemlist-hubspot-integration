import { Calendar, Building } from 'lucide-react';
import { format } from 'date-fns';
import { useMeetingStats, useMeetings } from '../../hooks/useMeetings';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonList, Badge, getOwnerVariant } from '../ui';
import {
  typography,
  card,
  interactive,
  iconSizes,
  getOwnerColors,
} from '../../styles/designTokens';

function OwnerMeetingBar({ owner, count, maxCount }) {
  const colors = getOwnerColors(owner);
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className={`text-xs sm:text-sm font-medium capitalize w-12 sm:w-16 ${colors.text}`}>
        {owner}
      </span>
      <div className="flex-1 h-3 sm:h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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
      <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 w-6 sm:w-8 text-right">{count}</span>
    </div>
  );
}

function MeetingItem({ meeting }) {
  return (
    <li
      className={`flex items-start gap-2 sm:gap-3 py-2.5 sm:py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 ${interactive.rowHover} px-2 -mx-2 rounded`}
    >
      {/* Calendar icon */}
      <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
        <Calendar
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
      </div>

      {/* Meeting content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[100px] sm:max-w-[150px]" title={meeting.contactName}>
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
              className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-none" title={meeting.contactCompany}>
              {meeting.contactCompany}
            </span>
          </div>
        )}
      </div>

      {/* Scheduled time */}
      <time className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0" dateTime={meeting.scheduledAt}>
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
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Meetings Booked</h2>
        <SkeletonList count={4} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
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
    <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
      {/* Header with total */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className={typography.cardTitle}>Meetings Booked</h2>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
            {overall.totalMeetings || 0}
          </span>
          <span className={typography.label}>total</span>
        </div>
      </div>

      {/* By Owner Breakdown */}
      {stats.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h3 className={`${typography.tableHeader} mb-3 sm:mb-4`}>By Owner</h3>
          <div className="space-y-3 sm:space-y-4">
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
        <h3 className={`${typography.tableHeader} mb-3 sm:mb-4`}>Upcoming</h3>
        {meetings.length > 0 ? (
          <ul
            className="max-h-[180px] sm:max-h-[200px] overflow-y-auto"
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
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Meeting outcomes tracked after Salesforce integration
        </p>
      </div>
    </div>
  );
}
