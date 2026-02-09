import { Briefcase, CheckCircle, DollarSign, Lock } from 'lucide-react';
import { useFunnelStats } from '../../hooks/useFunnel';
import { useFilters } from '../../context/FilterContext';
import { typography, card, iconSizes } from '../../styles/designTokens';

export default function PipelineSection() {
  const { owner, dateRange } = useFilters();
  const { data, isLoading } = useFunnelStats(owner, dateRange);

  const pipeline = data?.pipeline || {};
  const meetingsHeld = pipeline.meetingsHeld || 0;
  const qualified = pipeline.qualified || 0;
  const pipelineValue = pipeline.value || 0;

  const hasSalesforceData = meetingsHeld > 0 || qualified > 0 || pipelineValue > 0;

  return (
    <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <h2 className={typography.cardTitle}>Pipeline</h2>
          {!hasSalesforceData && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              <Lock className="w-3 h-3" aria-hidden="true" />
              Salesforce
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 sm:gap-6">
        {/* Meeting Held */}
        <div className={`${hasSalesforceData ? '' : 'opacity-50'} text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30`}>
          <div className="flex justify-center mb-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Briefcase className={`${iconSizes.md} text-amber-600 dark:text-amber-400`} aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {meetingsHeld}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Meetings Held
          </div>
        </div>

        {/* Qualified */}
        <div className={`${hasSalesforceData ? '' : 'opacity-50'} text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30`}>
          <div className="flex justify-center mb-2">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <CheckCircle className={`${iconSizes.md} text-red-600 dark:text-red-400`} aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
            {qualified}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Qualified
          </div>
        </div>

        {/* Pipeline Value */}
        <div className={`${hasSalesforceData ? '' : 'opacity-50'} text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30`}>
          <div className="flex justify-center mb-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign className={`${iconSizes.md} text-green-600 dark:text-green-400`} aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
            ${pipelineValue.toLocaleString()}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Pipeline
          </div>
        </div>
      </div>

      {!hasSalesforceData && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4">
          Salesforce integration coming soon — pipeline data will populate automatically
        </p>
      )}
    </div>
  );
}
