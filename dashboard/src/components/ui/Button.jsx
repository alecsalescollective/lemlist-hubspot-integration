/**
 * Button - Consistent button component with variants and sizes
 * Usage: <Button variant="primary" size="md" icon={RefreshCw}>Sync</Button>
 */
import { forwardRef } from 'react';

const variants = {
  primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500',
  ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500',
  success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 focus:ring-green-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

const iconOnlySizes = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    iconOnly = false,
    disabled = false,
    loading = false,
    className = '',
    ...props
  },
  ref
) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-current';

  const variantClasses = variants[variant] || variants.primary;
  const sizeClasses = iconOnly ? iconOnlySizes[size] : sizes[size];

  const iconElement = Icon && (
    <Icon
      className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} ${loading ? 'animate-spin' : ''}`}
      aria-hidden="true"
    />
  );

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {iconPosition === 'left' && iconElement}
      {!iconOnly && children}
      {iconPosition === 'right' && iconElement}
    </button>
  );
});

export default Button;
