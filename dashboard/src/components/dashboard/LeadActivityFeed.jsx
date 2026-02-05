import { Mail, MessageSquare, MousePointer, AlertCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLeadActivities } from '../../hooks/useLeadActivities';
import { useFilters } from '../../context/FilterContext';

const ACTIVITY_CONFIG = {
  email_opened: {
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'opened email'
  },
  email_replied: {
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'replied'
  },
  email_clicked: {
    icon: MousePointer,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'clicked link'
  },
  email_bounced: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'bounced'
  },
  email_sent: {
    icon: Send,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'received email'
  }
};

function ActivityItem({ activity }) {
  const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.email_sent;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded transition-colors">
      <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {activity.contactName || activity.email?.split('@')[0]}
          </span>
          <span className="text-gray-500 text-sm">{config.label}</span>
        </div>
        {activity.campaign && (
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {activity.campaign}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-400 flex-shrink-0">
        {activity.timestamp
          ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
          : 'just now'}
      </div>
    </div>
  );
}

export default function LeadActivityFeed() {
  const { owner } = useFilters();
  const { data, isLoading, error } = useLeadActivities(owner, 15);

  const activities = data?.activities || [];
  const counts = data?.counts || {};

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Activity</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no activities but also no error, show setup message
  if (activities.length === 0 && !error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Activity</h2>

        {/* Activity count badges */}
        <div className="flex gap-3 mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {counts.opens || 0} opens
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {counts.replies || 0} replies
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            {counts.clicks || 0} clicks
          </span>
        </div>

        <div className="text-center py-8 text-gray-500">
          <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium">No recent activity</p>
          <p className="text-sm mt-1">
            {data?.message || 'Configure Lemlist webhooks to track email activity'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Lead Activity</h2>
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {counts.opens || 0} opens
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {counts.replies || 0} replies
          </span>
        </div>
      </div>

      <div className="space-y-0 max-h-[400px] overflow-y-auto">
        {activities.map((activity, index) => (
          <ActivityItem key={activity.id || index} activity={activity} />
        ))}
      </div>
    </div>
  );
}
