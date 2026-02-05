import { Calendar, Building } from 'lucide-react';
import { format } from 'date-fns';
import { useMeetingStats, useMeetings } from '../../hooks/useMeetings';
import { useFilters } from '../../context/FilterContext';
import {
  typography,
  spacing,
  card,
  interactive,
  iconSizes,
  getOwnerColors
} from '../../styles/designTokens';

function OwnerMeetingBar({ owner, count, maxCount }) {
  const colors = getOwnerColors(owner);
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium capitalize w-16 ${colors.text}`}>
        {owner}
      </span>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: colors.bar }}
        />
      </div>
      <span className={`${typography.bodyMetric} w-8 text-right`}>
        {count}
      </span>
    </div>
  );
}

function MeetingItem({ meeting }) {
  const colors = getOwnerColors(meeting.owner);

  return (
    <div className={`flex items-start gap-3 ${spacing.listItemPadding} border-b border-gray-100 last:border-0 ${interactive.rowHover} px-2 -mx-2 rounded`}>
      <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
        <Calendar className={`${iconSizes.sm} text-green-600`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={typography.tableBody}>
            {meeting.contactName || 'Unknown Contact'}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
            {meeting.owner}
          </span>
        </div>
        {meeting.contactCompany && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <Building className="w-3 h-3" />
            <span className="truncate">{meeting.contactCompany}</span>
          </div>
        )}
      </div>
      <div className={typography.small}>
        {meeting.scheduledAt
          ? format(new Date(meeting.scheduledAt), 'MMM d, h:mm a')
          : 'TBD'}
      </div>
    </div>
  );
}

export default function MeetingsBooked() {
  const { owner, dateRange } = useFilters();
  const { data: statsData, isLoading: statsLoading } = useMeetingStats(owner, dateRange);
  const { data: meetingsData, isLoading: meetingsLoading } = useMeetings(owner, 'upcoming');

  const isLoading = statsLoading || meetingsLoading;

  if (isLoading) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Meetings Booked</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const stats = statsData?.stats || [];
  const overall = statsData?.overall || {};
  const meetings = meetingsData?.meetings?.slice(0, 5) || [];

  // Get max for bar chart scaling
  const maxMeetings = Math.max(...stats.map(s => s.total), 1);

  return (
    <div className={`${card.base} ${spacing.cardPadding}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={typography.cardTitle}>Meetings Booked</h2>
        <div className="flex items-center gap-2">
          <span className={`${typography.cardMetric} text-green-600`}>{overall.totalMeetings || 0}</span>
          <span className={typography.label}>total</span>
        </div>
      </div>

      {/* By Owner Breakdown */}
      {stats.length > 0 && (
        <div className="space-y-3 mb-8">
          <h3 className={typography.tableHeader}>By Owner</h3>
          {stats.map(stat => (
            <OwnerMeetingBar
              key={stat.owner}
              owner={stat.owner}
              count={stat.total}
              maxCount={maxMeetings}
            />
          ))}
        </div>
      )}

      {/* Upcoming Meetings */}
      <div>
        <h3 className={`${typography.tableHeader} mb-4`}>
          Upcoming
        </h3>
        {meetings.length > 0 ? (
          <div className="space-y-0 max-h-[200px] overflow-y-auto">
            {meetings.map((meeting, index) => (
              <MeetingItem key={meeting.id || index} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className={`${iconSizes.lg} mx-auto text-gray-300 mb-3`} />
            <p className="font-medium text-gray-900">No upcoming meetings</p>
            <p className={`${typography.label} mt-1`}>Book meetings to see them here</p>
          </div>
        )}
      </div>

      {/* Note about Salesforce */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className={`${typography.small} text-center`}>
          Meeting outcomes will be tracked after Salesforce integration
        </p>
      </div>
    </div>
  );
}
