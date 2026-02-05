/**
 * Select - Accessible select component with label support
 * Usage: <Select id="owner" label="Owner" value={owner} onChange={setOwner} options={options} />
 */

export default function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  srOnlyLabel = false,
  placeholder,
  className = '',
  selectClassName = '',
}) {
  const labelClasses = srOnlyLabel
    ? 'sr-only'
    : 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  const selectClasses = disabled
    ? 'px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed'
    : 'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800';

  const handleChange = (e) => {
    if (typeof onChange === 'function') {
      // Support both direct value and event handlers
      onChange(e.target.value, e);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
      )}
      <select
        id={id}
        name={id}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`${selectClasses} ${selectClassName}`}
        aria-label={srOnlyLabel ? label : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
