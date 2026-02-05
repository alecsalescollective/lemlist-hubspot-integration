/**
 * Design System Tokens
 * Centralized source of truth for all visual design values
 * Following Steve Jobs / Jony Ive design philosophy: simplicity, consistency, intentionality
 */

// =============================================================================
// COLORS
// =============================================================================

// Brand Colors
export const colors = {
  primary: '#3B82F6',     // blue-500 - main brand color
  success: '#10B981',     // green-500 - positive states, conversions
  warning: '#F59E0B',     // amber-500 - caution, paused states
  danger: '#EF4444',      // red-500 - errors, negative states
};

// Owner Colors - Consistent across all components
export const ownerColors = {
  alec: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    bar: '#3B82F6',
    ring: 'ring-blue-500',
  },
  janae: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    bar: '#10B981',
    ring: 'ring-green-500',
  },
  kate: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    bar: '#F59E0B',
    ring: 'ring-amber-500',
  },
  default: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    bar: '#6B7280',
    ring: 'ring-gray-500',
  },
};

// Status Colors - For campaign states, lead states
export const statusColors = {
  active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  running: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  paused: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  new: { bg: 'bg-gray-100', text: 'text-gray-700', bar: '#6B7280' },
  in_sequence: { bg: 'bg-blue-100', text: 'text-blue-700', bar: '#3B82F6' },
  converted: { bg: 'bg-green-100', text: 'text-green-700', bar: '#10B981' },
};

// Activity Colors - For email activity tracking (simplified: no purple)
export const activityColors = {
  emailOpened: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    icon: 'text-blue-500',
    label: 'Opened',
  },
  emailReplied: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    icon: 'text-green-500',
    label: 'Replied',
  },
  emailClicked: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    icon: 'text-blue-500',
    label: 'Clicked',
  },
  emailBounced: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    icon: 'text-red-500',
    label: 'Bounced',
  },
  emailSent: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: 'text-gray-500',
    label: 'Sent',
  },
};

// Funnel Stage Colors
export const funnelColors = {
  leads: '#3B82F6',        // blue - starting point
  inSequence: '#8B5CF6',   // purple - in progress
  meetings: '#10B981',     // green - success/conversion
};

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Hero metrics - primary KPI numbers (largest, most prominent)
  hero: 'text-4xl font-bold text-gray-900',

  // Card metrics - secondary numbers in cards
  cardMetric: 'text-2xl font-bold text-gray-900',

  // Body metrics - table values, inline numbers
  bodyMetric: 'text-base font-semibold text-gray-900',

  // Card titles - section headers
  cardTitle: 'text-lg font-semibold text-gray-900',

  // Large title - main page/section headers
  pageTitle: 'text-xl font-bold text-gray-900',

  // Labels - secondary text, descriptions
  label: 'text-sm text-gray-500',

  // Table headers - column titles
  tableHeader: 'text-xs font-medium text-gray-500 uppercase tracking-wider',

  // Table body - cell content
  tableBody: 'text-sm text-gray-900',

  // Small text - timestamps, metadata
  small: 'text-xs text-gray-400',
};

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Card/section padding (32px - breathing room)
  cardPadding: 'p-8',

  // Gap between major sections (32px)
  sectionGap: 'gap-8',

  // Gap between cards in a grid (24px)
  cardGap: 'gap-6',

  // Internal component spacing (16px)
  internalGap: 'gap-4',

  // List item vertical padding (12px rhythm)
  listItemPadding: 'py-3',

  // Tight spacing for inline elements (8px)
  tightGap: 'gap-2',
};

// =============================================================================
// ICON SIZES
// =============================================================================

export const iconSizes = {
  sm: 'w-4 h-4',    // 16px - inline, table icons
  md: 'w-5 h-5',    // 20px - card icons, list icons
  lg: 'w-8 h-8',    // 32px - empty states, hero icons
};

// =============================================================================
// INTERACTIVE STATES
// =============================================================================

export const interactive = {
  // Card hover - subtle border change, no shadow
  cardHover: 'hover:border-gray-300 transition-colors duration-150',

  // Row hover - light background
  rowHover: 'hover:bg-gray-50 transition-colors duration-150',

  // Focus ring - accessibility
  focusRing: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none',

  // Focus background - for non-ring elements
  focusBackground: 'focus-visible:bg-blue-50',

  // Standard transition
  transition: 'transition-colors duration-150',
};

// =============================================================================
// CARD STYLES
// =============================================================================

export const card = {
  // Base card - flat design with border
  base: 'bg-white rounded-lg border border-gray-200',

  // Card with hover
  interactive: 'bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-150',

  // Highlighted card (for primary KPI)
  highlighted: 'bg-white rounded-lg border border-gray-200 ring-2 ring-green-500 ring-opacity-50',
};

// =============================================================================
// CHART CONFIGURATION
// =============================================================================

export const chartConfig = {
  // Standard bar radius (all corners)
  barRadius: [4, 4, 4, 4],

  // Tooltip styling
  tooltip: {
    contentStyle: {
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      padding: '8px 12px',
    },
    cursor: { fill: 'rgba(0, 0, 0, 0.04)' },
  },

  // Axis styling
  axis: {
    tickStyle: { fontSize: 12, fill: '#6B7280' },
    axisLine: { stroke: '#E5E7EB' },
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get owner color scheme by name (case-insensitive)
 */
export const getOwnerColors = (ownerName) => {
  if (!ownerName) return ownerColors.default;
  const normalized = ownerName.toLowerCase();
  return ownerColors[normalized] || ownerColors.default;
};

/**
 * Get status color scheme
 */
export const getStatusColors = (status) => {
  if (!status) return statusColors.draft;
  const normalized = status.toLowerCase().replace(' ', '_');
  return statusColors[normalized] || statusColors.draft;
};

/**
 * Get activity color scheme by type
 */
export const getActivityColors = (activityType) => {
  const typeMap = {
    'email_opened': activityColors.emailOpened,
    'emailOpened': activityColors.emailOpened,
    'opened': activityColors.emailOpened,
    'email_replied': activityColors.emailReplied,
    'emailReplied': activityColors.emailReplied,
    'replied': activityColors.emailReplied,
    'email_clicked': activityColors.emailClicked,
    'emailClicked': activityColors.emailClicked,
    'clicked': activityColors.emailClicked,
    'email_bounced': activityColors.emailBounced,
    'emailBounced': activityColors.emailBounced,
    'bounced': activityColors.emailBounced,
    'email_sent': activityColors.emailSent,
    'emailSent': activityColors.emailSent,
    'sent': activityColors.emailSent,
  };
  return typeMap[activityType] || activityColors.emailSent;
};

export default {
  colors,
  ownerColors,
  statusColors,
  activityColors,
  funnelColors,
  typography,
  spacing,
  iconSizes,
  interactive,
  card,
  chartConfig,
  getOwnerColors,
  getStatusColors,
  getActivityColors,
};
