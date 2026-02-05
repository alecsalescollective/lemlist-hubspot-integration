import { Calendar, User, Building, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { useMeetingStats, useMeetings } from '../../hooks/useMeetings';
import { useFilters } from '../../context/FilterContext';

const OWNER_COLORS = {
  alec: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' },
  janae: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
  kate: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' }
};

function OwnerMeetingBar({ owner, count, maxCount }) {
  const colors = OWNER_COLORS[owner.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-500' };
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium capitalize w-16 ${colors.text}`}>
        {owner}
      </span>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">
        {count}
      </span>
    </div>
  );
}

function MeetingItem({ meeting }) {
  const colors = OWNER_COLORS[meeting.owner?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded transition-colors">
      <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
        <Calendar className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
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
      <div className="text-xs text-gray-400 flex-shrink-0">
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meetings Booked</h2>
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Meetings Booked</h2>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-green-600">{overall.totalMeetings || 0}</span>
          <span className="text-sm text-gray-500">total</span>
        </div>
      </div>

      {/* By Owner Breakdown */}
      {stats.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">By Owner</h3>
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
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Upcoming
        </h3>
        {meetings.length > 0 ? (
          <div className="space-y-0 max-h-[200px] overflow-y-auto">
            {meetings.map((meeting, index) => (
              <MeetingItem key={meeting.id || index} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No upcoming meetings</p>
          </div>
        )}
      </div>

      {/* Note about Salesforce */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Meeting outcomes will be tracked after Salesforce integration
        </p>
      </div>
    </div>
  );
}
