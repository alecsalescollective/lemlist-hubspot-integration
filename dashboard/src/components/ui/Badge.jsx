/**
 * Badge - Status and activity badges with consistent styling
 * Usage: <Badge variant="success">Active</Badge>, <Badge variant="info" count={5}>Opens</Badge>
 */

const variants = {
  // Status badges
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',

  // Owner colors
  alec: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  janae: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  kate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const sizes = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  count,
  className = '',
}) {
  const variantClasses = variants[variant] || variants.neutral;
  const sizeClasses = sizes[size] || sizes.md;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${variantClasses} ${sizeClasses} ${className}`}
    >
      {count !== undefined && <span className="font-semibold">{count}</span>}
      {children}
    </span>
  );
}

// Helper to get badge variant from status
export function getStatusVariant(status) {
  const statusMap = {
    running: 'success',
    active: 'success',
    paused: 'warning',
    draft: 'neutral',
    completed: 'info',
    failed: 'danger',
    new: 'neutral',
    in_sequence: 'info',
    converted: 'success',
  };
  return statusMap[status?.toLowerCase()] || 'neutral';
}

// Helper to get badge variant from owner
export function getOwnerVariant(owner) {
  const ownerMap = {
    alec: 'alec',
    janae: 'janae',
    kate: 'kate',
  };
  return ownerMap[owner?.toLowerCase()] || 'neutral';
}
