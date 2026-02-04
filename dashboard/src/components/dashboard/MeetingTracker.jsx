import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useMeetings, useMeetingStats } from '../../hooks/useMeetings';
import { useFilters } from '../../context/FilterContext';

const OWNER_COLORS = {
  alec: '#3B82F6',
  janae: '#10B981',
  kate: '#F59E0B'
};

const outcomeIcons = {
  scheduled: Clock,
  completed: CheckCircle,
  no_show: XCircle,
  rescheduled: Calendar
};

const outcomeColors = {
  scheduled: 'text-blue-500',
  completed: 'text-green-500',
  no_show: 'text-red-500',
  rescheduled: 'text-yellow-500'
};

export default function MeetingTracker() {
  const { owner, dateRange } = useFilters();
  const { data: statsData, isLoading: statsLoading } = useMeetingStats(owner, dateRange);
  const { data: meetingsData, isLoading: meetingsLoading } = useMeetings(owner, 'upcoming');

  if (statsLoading || meetingsLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meetings</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const stats = statsData?.stats || [];
  const overall = statsData?.overall || { totalMeetings: 0, conversionRate: 0 };
  const upcomingMeetings = meetingsData?.meetings?.slice(0, 5) || [];

  const ProgressBar = ({ label, value, maxValue = 100, color }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 w-16 capitalize">{label}</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-sm font-medium text-gray-900 w-12 text-right">{value}%</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Meetings</h2>

      {/* Conversion Rates */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Conversion Rate</h3>
        <div className="space-y-3">
          {stats.map((stat) => (
            <ProgressBar
              key={stat.owner}
              label={stat.owner}
              value={stat.conversionRate}
              color={OWNER_COLORS[stat.owner] || '#6B7280'}
            />
          ))}
        </div>
        {stats.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Team Average</span>
              <span className="font-medium text-gray-900">{overall.conversionRate}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Meetings */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Upcoming</h3>
        <div className="space-y-2">
          {upcomingMeetings.map((meeting) => {
            const Icon = outcomeIcons[meeting.outcome] || Calendar;
            const colorClass = outcomeColors[meeting.outcome] || 'text-gray-500';

            return (
              <div
                key={meeting.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {meeting.contactName || meeting.title || 'Meeting'}
                  </p>
                  {meeting.contactCompany && (
                    <p className="text-xs text-gray-500">{meeting.contactCompany}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 capitalize">{meeting.owner}</p>
                  <p className="text-xs text-gray-400">
                    {meeting.scheduledAt
                      ? format(new Date(meeting.scheduledAt), 'MMM d, h:mm a')
                      : '-'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {upcomingMeetings.length === 0 && (
          <div className="text-center py-4 text-sm text-gray-500">
            No upcoming meetings
          </div>
        )}
      </div>
    </div>
  );
}
