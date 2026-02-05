import { Mail, MessageSquare, MousePointer, AlertCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLeadActivities } from '../../hooks/useLeadActivities';
import { useFilters } from '../../context/FilterContext';
import {
  typography,
  spacing,
  card,
  interactive,
  iconSizes,
  activityColors,
  getActivityColors
} from '../../styles/designTokens';

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
  sent: Send
};

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
  sent: 'received email'
};

function ActivityItem({ activity }) {
  const colors = getActivityColors(activity.type);
  const Icon = ACTIVITY_ICONS[activity.type] || Send;
  const label = ACTIVITY_LABELS[activity.type] || 'received email';

  return (
    <div className={`flex items-start gap-3 ${spacing.listItemPadding} border-b border-gray-100 last:border-0 ${interactive.rowHover} px-2 -mx-2 rounded ${interactive.focusBackground} outline-none`} tabIndex={0}>
      <div className={`p-2 rounded-lg ${colors.bg} flex-shrink-0`}>
        <Icon className={`${iconSizes.md} ${colors.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={typography.tableBody}>
            {activity.contactName || activity.email?.split('@')[0]}
          </span>
          <span className={typography.label}>{label}</span>
        </div>
        {activity.campaign && (
          <div className={`${typography.small} truncate mt-0.5`}>
            {activity.campaign}
          </div>
        )}
      </div>
      <div className={typography.small}>
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
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Activity</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
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

  // Activity count badges component
  const ActivityBadges = ({ size = 'default' }) => {
    const badgeClass = size === 'small'
      ? 'px-2 py-0.5 rounded-full text-xs font-medium'
      : 'px-3 py-1 rounded-full text-xs font-medium';

    return (
      <div className="flex gap-2">
        <span className={`${badgeClass} ${activityColors.emailOpened.bg} ${activityColors.emailOpened.text}`}>
          {counts.opens || 0} opens
        </span>
        <span className={`${badgeClass} ${activityColors.emailReplied.bg} ${activityColors.emailReplied.text}`}>
          {counts.replies || 0} replies
        </span>
        {size !== 'small' && (
          <span className={`${badgeClass} ${activityColors.emailClicked.bg} ${activityColors.emailClicked.text}`}>
            {counts.clicks || 0} clicks
          </span>
        )}
      </div>
    );
  };

  // If no activities but also no error, show setup message
  if (activities.length === 0 && !error) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Activity</h2>

        {/* Activity count badges */}
        <div className="mb-6">
          <ActivityBadges />
        </div>

        <div className="text-center py-8">
          <Mail className={`${iconSizes.lg} mx-auto text-gray-300 mb-3`} />
          <p className="font-medium text-gray-900">No recent activity</p>
          <p className={`${typography.label} mt-2`}>
            {data?.message || 'Configure Lemlist webhooks to track email activity'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${card.base} ${spacing.cardPadding}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={typography.cardTitle}>Lead Activity</h2>
        <ActivityBadges size="small" />
      </div>

      <div className="space-y-0 max-h-[400px] overflow-y-auto">
        {activities.map((activity, index) => (
          <ActivityItem key={activity.id || index} activity={activity} />
        ))}
      </div>
    </div>
  );
}
