import { Mail, MessageSquare, MousePointer, AlertCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLeadActivities } from '../../hooks/useLeadActivities';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonList, Badge } from '../ui';
import {
  typography,
  spacing,
  card,
  interactive,
  iconSizes,
  activityColors,
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
  email_opened: 'opened email',
  emailOpened: 'opened email',
  opened: 'opened email',
  email_replied: 'replied',
  emailReplied: 'replied',
  replied: 'replied',
  email_clicked: 'clicked link',
  emailClicked: 'clicked link',
  clicked: 'clicked link',
  email_bounced: 'bounced',
  emailBounced: 'bounced',
  bounced: 'bounced',
  email_sent: 'received email',
  emailSent: 'received email',
  sent: 'received email',
};

function ActivityItem({ activity }) {
  const colors = getActivityColors(activity.type);
  const Icon = ACTIVITY_ICONS[activity.type] || Send;
  const label = ACTIVITY_LABELS[activity.type] || 'received email';

  return (
    <li
      className={`flex items-start gap-3 ${spacing.listItemPadding} border-b border-gray-100 dark:border-gray-700 last:border-0 ${interactive.rowHover} px-2 -mx-2 rounded ${interactive.focusBackground} outline-none`}
      tabIndex={0}
    >
      {/* Activity icon */}
      <div className={`p-2 rounded-lg ${colors.bg} flex-shrink-0`}>
        <Icon className={`${iconSizes.md} ${colors.icon}`} aria-hidden="true" />
      </div>

      {/* Activity content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={typography.tableBody}>
            {activity.contactName || activity.email?.split('@')[0]}
          </span>
          <span className={typography.label}>{label}</span>
        </div>
        {activity.campaign && (
          <p className={`${typography.small} truncate mt-0.5`}>
            {activity.campaign}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <time className={typography.small} dateTime={activity.timestamp}>
        {activity.timestamp
          ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
          : 'just now'}
      </time>
    </li>
  );
}

// Activity count badges component
function ActivityBadges({ counts, size = 'md' }) {
  return (
    <div className="flex gap-2" role="group" aria-label="Activity counts">
      <Badge variant="info" size={size} count={counts.opens || 0}>
        opens
      </Badge>
      <Badge variant="success" size={size} count={counts.replies || 0}>
        replies
      </Badge>
      {size !== 'sm' && (
        <Badge variant="purple" size={size} count={counts.clicks || 0}>
          clicks
        </Badge>
      )}
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
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Activity</h2>
        <SkeletonList count={5} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
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
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Activity</h2>

        {/* Activity count badges */}
        <div className="mb-6">
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
    <div className={`${card.base} ${spacing.cardPadding}`}>
      {/* Header with title and badges */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={typography.cardTitle}>Lead Activity</h2>
        <ActivityBadges counts={counts} size="sm" />
      </div>

      {/* Activity list */}
      <ul
        className="max-h-[400px] overflow-y-auto"
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
