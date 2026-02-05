import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useFunnelStats } from '../../hooks/useFunnel';
import { useFilters } from '../../context/FilterContext';

export default function FunnelChart() {
  const { owner, dateRange } = useFilters();
  const { data, isLoading, error } = useFunnelStats(owner, dateRange);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Funnel</h2>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Funnel</h2>
        <div className="text-center py-8 text-red-500">
          <p>Error loading funnel data</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  const stages = data?.stages || [];
  const conversions = data?.conversions || {};
  const trend = data?.trend?.leadToMeeting || 0;

  // If no stages, show empty state
  if (stages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Funnel</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No funnel data available</p>
          <p className="text-sm mt-2">Sync leads to see your funnel</p>
        </div>
      </div>
    );
  }

  // Prepare data for the horizontal bar chart
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const chartData = stages.map(stage => ({
    ...stage,
    percentage: Math.round((stage.count / maxCount) * 100)
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Sales Funnel</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Lead to Meeting:</span>
          <span className="font-bold text-lg text-gray-900">{conversions.leadToMeeting || 0}%</span>
          {trend !== 0 && (
            <span className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {chartData.map((stage, index) => (
          <div key={stage.name} className="flex items-center">
            {/* Stage Box */}
            <div className="text-center">
              <div
                className="rounded-lg px-6 py-4 min-w-[140px] transition-all hover:scale-105"
                style={{ backgroundColor: `${stage.color}15`, borderLeft: `4px solid ${stage.color}` }}
              >
                <div className="text-2xl font-bold" style={{ color: stage.color }}>
                  {stage.count.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mt-1">{stage.name}</div>
              </div>
            </div>

            {/* Arrow with conversion rate */}
            {index < chartData.length - 1 && (
              <div className="flex flex-col items-center mx-2">
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">
                  {index === 0 ? conversions.leadToSequence : conversions.sequenceToMeeting}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bar Chart Representation */}
      <div className="h-20 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" barGap={0}>
            <XAxis type="number" hide domain={[0, maxCount]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(value) => [value.toLocaleString(), 'Count']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList dataKey="name" position="insideLeft" fill="#fff" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Lead to Sequence</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{conversions.leadToSequence || 0}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Sequence to Meeting</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{conversions.sequenceToMeeting || 0}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Overall Conversion</div>
          <div className="text-lg font-semibold text-green-600 mt-1">{conversions.leadToMeeting || 0}%</div>
        </div>
      </div>
    </div>
  );
}
