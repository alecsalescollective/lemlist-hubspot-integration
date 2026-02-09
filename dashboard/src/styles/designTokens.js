/**
 * Design System Tokens
 * Centralized source of truth for all visual design values
 * Following Steve Jobs / Jony Ive design philosophy: simplicity, consistency, intentionality
 *
 * Target: 9.5/10 across all UI/UX dimensions
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
  info: '#6366F1',        // indigo-500 - informational
};

// Owner Colors - Consistent across all components
export const ownerColors = {
  alec: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    bar: '#8B5CF6',
    ring: 'ring-purple-500',
  },
  janae: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    bar: '#10B981',
    ring: 'ring-green-500',
  },
  kate: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    bar: '#F59E0B',
    ring: 'ring-amber-500',
  },
  default: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    bar: '#6B7280',
    ring: 'ring-gray-500',
  },
};

// Status Colors - For campaign states, lead states
export const statusColors = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  running: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  paused: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-600' },
  in_sequence: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', bar: '#3B82F6' },
  meeting_booked: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', bar: '#10B981' },
};

// Activity Colors - For email activity tracking
export const activityColors = {
  emailOpened: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-300',
    icon: 'text-blue-500 dark:text-blue-400',
    label: 'Opened',
  },
  emailReplied: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-300',
    icon: 'text-green-500 dark:text-green-400',
    label: 'Replied',
  },
  emailClicked: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-600 dark:text-indigo-300',
    icon: 'text-indigo-500 dark:text-indigo-400',
    label: 'Clicked',
  },
  emailBounced: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-300',
    icon: 'text-red-500 dark:text-red-400',
    label: 'Bounced',
  },
  emailSent: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-600 dark:text-gray-300',
    icon: 'text-gray-500 dark:text-gray-400',
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
// TYPOGRAPHY (with line-heights for readability)
// =============================================================================

export const typography = {
  // Hero metrics - primary KPI numbers (largest, most prominent)
  hero: 'text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight',

  // Card metrics - secondary numbers in cards
  cardMetric: 'text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none',

  // Body metrics - table values, inline numbers
  bodyMetric: 'text-base font-semibold text-gray-900 dark:text-gray-100 leading-normal',

  // Card titles - section headers
  cardTitle: 'text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug',

  // Large title - main page/section headers
  pageTitle: 'text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug',

  // Labels - secondary text (WCAG AA compliant: gray-600)
  label: 'text-sm text-gray-600 dark:text-gray-400 leading-normal',

  // Table headers - column titles
  tableHeader: 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none',

  // Table body - cell content
  tableBody: 'text-sm font-medium text-gray-900 dark:text-gray-100 leading-normal',

  // Table body secondary - less important cell content
  tableBodySecondary: 'text-sm text-gray-600 dark:text-gray-400 leading-normal',

  // Small text - timestamps, metadata
  small: 'text-xs text-gray-500 dark:text-gray-400 leading-normal',

  // Body text - descriptions, paragraphs
  body: 'text-sm text-gray-600 dark:text-gray-300 leading-relaxed',

  // Caption - below charts, footnotes
  caption: 'text-xs text-gray-500 dark:text-gray-400 leading-relaxed',
};

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Card/section padding (32px - breathing room)
  cardPadding: 'p-8',

  // Main layout padding
  mainPadding: 'p-8',

  // Header padding
  headerPadding: 'px-8 py-4',

  // Gap between major sections (32px)
  sectionGap: 'gap-8',

  // Section margin
  sectionMargin: 'mb-8',

  // Gap between cards in a grid (24px)
  cardGap: 'gap-6',

  // Internal component spacing (16px)
  internalGap: 'gap-4',

  // List item vertical padding (12px rhythm)
  listItemPadding: 'py-3',

  // Tight spacing for inline elements (8px)
  tightGap: 'gap-2',

  // Stack spacing (vertical)
  stackSm: 'space-y-2',
  stackMd: 'space-y-4',
  stackLg: 'space-y-6',
  stackXl: 'space-y-8',
};

// =============================================================================
// ICON SIZES (expanded)
// =============================================================================

export const iconSizes = {
  xs: 'w-3 h-3',    // 12px - tiny inline
  sm: 'w-4 h-4',    // 16px - inline, table icons
  md: 'w-5 h-5',    // 20px - card icons, list icons
  lg: 'w-6 h-6',    // 24px - section icons
  xl: 'w-8 h-8',    // 32px - empty states
  '2xl': 'w-10 h-10', // 40px - hero icons
  '3xl': 'w-12 h-12', // 48px - large hero icons
};

// Icon colors
export const iconColors = {
  primary: 'text-blue-500 dark:text-blue-400',
  secondary: 'text-gray-400 dark:text-gray-500',
  tertiary: 'text-gray-300 dark:text-gray-600',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
  info: 'text-indigo-500 dark:text-indigo-400',
};

// =============================================================================
// INTERACTIVE STATES
// =============================================================================

export const interactive = {
  // Card hover - subtle border change, no shadow
  cardHover: 'hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-150',

  // Row hover - light background
  rowHover: 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150',

  // Focus ring - accessibility (WCAG compliant)
  focusRing: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800 outline-none',

  // Focus ring inset (for inputs)
  focusRingInset: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset outline-none',

  // Focus background - for non-ring elements
  focusBackground: 'focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20',

  // Standard transition
  transition: 'transition-colors duration-150',

  // All transitions
  transitionAll: 'transition-all duration-150',

  // Slow transition (for progress bars)
  transitionSlow: 'transition-all duration-300',
};

// =============================================================================
// CARD STYLES
// =============================================================================

export const card = {
  // Base card - flat design with border
  base: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',

  // Card with hover
  interactive: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-150',

  // Highlighted card (for primary KPI) - green ring
  highlighted: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ring-2 ring-green-500 ring-opacity-50',

  // Secondary highlight (for important but not primary) - blue left border
  secondaryHighlight: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500',
};

// =============================================================================
// TABLE STYLES
// =============================================================================

export const table = {
  // Container
  container: 'overflow-x-auto',
  wrapper: 'min-w-full',

  // Header row
  headerRow: 'border-b border-gray-200 dark:border-gray-700',
  headerCell: 'py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
  headerCellRight: 'py-3 px-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
  headerCellSortable: 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150',
  headerCellSorted: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  headerSticky: 'sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm',

  // Body row
  bodyRow: 'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150',
  bodyRowSelected: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30',
  bodyCell: 'py-3 px-4 text-sm text-gray-900 dark:text-gray-100',
  bodyCellSecondary: 'py-3 px-4 text-sm text-gray-600 dark:text-gray-400',
  bodyCellRight: 'py-3 px-4 text-sm text-gray-900 dark:text-gray-100 text-right',

  // Compact variant
  headerCellCompact: 'py-2 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
  bodyCellCompact: 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100',
};

// =============================================================================
// FORM STYLES
// =============================================================================

export const form = {
  // Labels
  label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5',
  labelRequired: 'after:content-["*"] after:ml-0.5 after:text-red-500',

  // Select elements
  select: 'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
  selectDisabled: 'px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed',
  selectError: 'px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',

  // Input elements
  input: 'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
  inputDisabled: 'px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed',

  // Helper text
  helperText: 'mt-1.5 text-xs text-gray-500 dark:text-gray-400',
  errorText: 'mt-1.5 text-xs text-red-600 dark:text-red-400',
};

// =============================================================================
// BUTTON STYLES
// =============================================================================

export const button = {
  // Base styles
  base: 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed',

  // Sizes
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',

  // Icon-only sizes
  iconOnly: 'p-2',
  iconOnlySm: 'p-1.5',
  iconOnlyLg: 'p-2.5',

  // Variants
  primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500',
  ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500',
  success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 focus:ring-green-500',

  // Disabled override for proper hover behavior
  disabled: 'disabled:hover:bg-current',
};

// =============================================================================
// ACCESSIBILITY TOKENS
// =============================================================================

export const a11y = {
  // Screen reader only
  srOnly: 'sr-only',
  notSrOnly: 'not-sr-only',

  // Focus styles
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
  focusRingInset: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800',

  // Skip link
  skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg',
};

// =============================================================================
// LAYOUT TOKENS
// =============================================================================

export const layout = {
  // Main layout padding
  mainPadding: 'p-8',
  headerPadding: 'px-8 py-4',

  // Container widths
  maxWidth: 'max-w-7xl',
  maxWidthNarrow: 'max-w-4xl',
  maxWidthWide: 'max-w-screen-2xl',

  // Section spacing
  sectionGap: 'gap-8',
  sectionMargin: 'mb-8',

  // Grid patterns
  grid2: 'grid grid-cols-1 lg:grid-cols-2',
  grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// =============================================================================
// ANIMATION TOKENS
// =============================================================================

export const animations = {
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  fadeIn: 'animate-[fadeIn_0.15s_ease-out]',
  slideUp: 'animate-[slideUp_0.15s_ease-out]',
};

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-20',
  fixed: 'z-30',
  modalBackdrop: 'z-40',
  modal: 'z-50',
  popover: 'z-60',
  tooltip: 'z-70',
  skipLink: 'z-80',
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
      backgroundColor: 'white',
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

/**
 * Combine class names (simple cn utility)
 */
export const cn = (...classes) => classes.filter(Boolean).join(' ');

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  colors,
  ownerColors,
  statusColors,
  activityColors,
  funnelColors,
  typography,
  spacing,
  iconSizes,
  iconColors,
  interactive,
  card,
  table,
  form,
  button,
  a11y,
  layout,
  animations,
  zIndex,
  chartConfig,
  getOwnerColors,
  getStatusColors,
  getActivityColors,
  cn,
};
