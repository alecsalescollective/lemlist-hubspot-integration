import { Mail, MessageSquare, MousePointer, AlertCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLeadActivities } from '../../hooks/useLeadActivities';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonList, Badge } from '../ui';
import {
  typography,
  card,
  interactive,
  iconSizes,
  getActivityColors,
} from '../../styles/designTokens';

// Icon mapping for activity types
const ACTIVITY_ICONS = {
  email_opened: Mail,
  emailOpened: Mail,
  opened: Mail,
  email_replied: MessageSquare,
  emailReplied: MessageSquare,
  replied: MessageSquare,
  email_clicked: MousePointer,
  emailClicked: MousePointer,
  clicked: MousePointer,
  email_bounced: AlertCircle,
  emailBounced: AlertCircle,
  bounced: AlertCircle,
  email_sent: Send,
  emailSent: Send,
  sent: Send,
};

// Label mapping for activity types
const ACTIVITY_LABELS = {
  email_opened: 'opened',
  emailOpened: 'opened',
  opened: 'opened',
  email_replied: 'replied',
  emailReplied: 'replied',
  replied: 'replied',
  email_clicked: 'clicked',
  emailClicked: 'clicked',
  clicked: 'clicked',
  email_bounced: 'bounced',
  emailBounced: 'bounced',
  bounced: 'bounced',
  email_sent: 'received',
  emailSent: 'received',
  sent: 'received',
};

function ActivityItem({ activity }) {
  const colors = getActivityColors(activity.type);
  const Icon = ACTIVITY_ICONS[activity.type] || Send;
  const label = ACTIVITY_LABELS[activity.type] || 'received';

  return (
    <li
      className={`flex items-start gap-2 sm:gap-3 py-2.5 sm:py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 ${interactive.rowHover} px-2 -mx-2 rounded ${interactive.focusBackground} outline-none`}
      tabIndex={0}
    >
      {/* Activity icon */}
      <div className={`p-1.5 sm:p-2 rounded-lg ${colors.bg} flex-shrink-0`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.icon}`} aria-hidden="true" />
      </div>

      {/* Activity content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-[180px]" title={activity.contactName || activity.email}>
            {activity.contactName || activity.email?.split('@')[0]}
          </span>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        {activity.campaign && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 max-w-[200px] sm:max-w-none" title={activity.campaign}>
            {activity.campaign}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <time className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0" dateTime={activity.timestamp}>
        {activity.timestamp
          ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }).replace('about ', '')
          : 'just now'}
      </time>
    </li>
  );
}

// Activity count badges component
function ActivityBadges({ counts, size = 'md' }) {
  return (
    <div className="flex gap-1.5 sm:gap-2 flex-wrap" role="group" aria-label="Activity counts">
      <Badge variant="info" size={size} count={counts.opens || 0}>
        <span className="hidden sm:inline">opens</span>
        <span className="sm:hidden">O</span>
      </Badge>
      <Badge variant="success" size={size} count={counts.replies || 0}>
        <span className="hidden sm:inline">replies</span>
        <span className="sm:hidden">R</span>
      </Badge>
      <Badge variant="purple" size={size} count={counts.clicks || 0}>
        <span className="hidden sm:inline">clicks</span>
        <span className="sm:hidden">C</span>
      </Badge>
    </div>
  );
}

export default function LeadActivityFeed() {
  const { owner } = useFilters();
  const { data, isLoading, error, refetch } = useLeadActivities(owner, 15);

  const activities = data?.activities || [];
  const counts = data?.counts || {};

  // Loading state
  if (isLoading) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Activity</h2>
        <SkeletonList count={5} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Activity</h2>
        <ErrorState
          title="Error loading activities"
          message={error.message}
          onRetry={refetch}
        />
      </div>
    );
  }

  // Empty state with activity badges
  if (activities.length === 0) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Activity</h2>

        {/* Activity count badges */}
        <div className="mb-4 sm:mb-6">
          <ActivityBadges counts={counts} />
        </div>

        <EmptyState
          icon={Mail}
          title="No recent activity"
          description={
            data?.message ||
            'Configure Lemlist webhooks to track email opens, replies, and clicks.'
          }
        />
      </div>
    );
  }

  return (
    <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
      {/* Header with title and badges */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className={typography.cardTitle}>Lead Activity</h2>
        <ActivityBadges counts={counts} size="sm" />
      </div>

      {/* Activity list - responsive max height */}
      <ul
        className="max-h-[280px] sm:max-h-[350px] lg:max-h-[400px] overflow-y-auto"
        role="feed"
        aria-label="Recent lead activity"
      >
        {activities.map((activity, index) => (
          <ActivityItem key={activity.id || index} activity={activity} />
        ))}
      </ul>
    </div>
  );
}
