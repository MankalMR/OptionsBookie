import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface BenchmarkDataPoint {
  date: string;
  portfolioReturn: number;
  sp500Return: number;
  cumulativePortfolio: number;
  cumulativeSP500: number;
}

interface BenchmarkMetadata {
  totalMonths: number;
  portfolioTotalReturn: number;
  sp500TotalReturn: number;
  correlation?: number;
  alpha?: number;
  beta?: number;
}

interface BenchmarkComparisonChartProps {
  portfolioId?: string;
  months?: number;
  className?: string;
}

interface BenchmarkResponse {
  success: boolean;
  data?: BenchmarkDataPoint[];
  error?: string;
  metadata?: BenchmarkMetadata;
}

export default function BenchmarkComparisonChart({
  portfolioId,
  months = 24,
  className = ""
}: BenchmarkComparisonChartProps) {
  const [data, setData] = useState<BenchmarkDataPoint[]>([]);
  const [metadata, setMetadata] = useState<BenchmarkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cumulative' | 'monthly'>('cumulative');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchBenchmarkData();
  }, [portfolioId, months]);

  const fetchBenchmarkData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        months: months.toString(),
        ...(portfolioId && { portfolioId })
      });

      const response = await fetch(`/api/benchmark-comparison?${params}`);
      const result: BenchmarkResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch benchmark data');
      }

      if (result.data) {
        setData(result.data);
        setMetadata(result.metadata || null);
      }
    } catch (err) {
      console.error('Error fetching benchmark data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: '2-digit',
      month: 'short'
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = formatDate(label);

      if (viewMode === 'cumulative') {
        const portfolioValue = payload.find((p: any) => p.dataKey === 'cumulativePortfolio')?.value;
        const sp500Value = payload.find((p: any) => p.dataKey === 'cumulativeSP500')?.value;

        return (
          <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
            <p className="font-semibold">{date}</p>
            <p className="text-blue-600">
              Portfolio: {formatCurrency(portfolioValue)}
            </p>
            <p className="text-green-600">
              S&P 500: {formatCurrency(sp500Value)}
            </p>
          </div>
        );
      } else {
        const portfolioReturn = payload.find((p: any) => p.dataKey === 'portfolioReturn')?.value;
        const sp500Return = payload.find((p: any) => p.dataKey === 'sp500Return')?.value;

        return (
          <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
            <p className="font-semibold">{date}</p>
            <p className="text-blue-600">
              Portfolio: {formatPercentage(portfolioReturn)}
            </p>
            <p className="text-green-600">
              S&P 500: {formatPercentage(sp500Return)}
            </p>
          </div>
        );
      }
    }
    return null;
  };

  // Sort data chronologically and use as chart data
  const chartData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Benchmark Comparison
          </h3>
          <div className="text-red-600 dark:text-red-400 mb-4">
            <p className="font-medium">Error loading benchmark data</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchBenchmarkData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Benchmark Comparison
          </h3>
          <p className="text-gray-600 dark:text-gray-400">No data available for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Portfolio vs S&P 500 Performance
        </h3>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'cumulative'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Cumulative
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'monthly'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      {metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Portfolio Return</p>
            <p className={`text-lg font-bold ${
              metadata.portfolioTotalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatPercentage(metadata.portfolioTotalReturn)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">S&P 500 Return</p>
            <p className={`text-lg font-bold ${
              metadata.sp500TotalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatPercentage(metadata.sp500TotalReturn)}
            </p>
          </div>
          {metadata.alpha !== undefined && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Alpha</p>
              <p className={`text-lg font-bold ${
                metadata.alpha >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {formatPercentage(metadata.alpha)}
              </p>
            </div>
          )}
          {metadata.correlation !== undefined && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Correlation</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {metadata.correlation.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#f0f0f0"} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke={isDarkMode ? "#9CA3AF" : "#666"}
              fontSize={12}
            />
            <YAxis
              tickFormatter={viewMode === 'cumulative' ? formatCurrency : formatPercentage}
              stroke={isDarkMode ? "#9CA3AF" : "#666"}
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {viewMode === 'cumulative' ? (
              <>
                <ReferenceLine y={100} stroke={isDarkMode ? "#6B7280" : "#ccc"} strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="cumulativePortfolio"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  name="Portfolio Value"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeSP500"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  name="S&P 500 Value"
                />
              </>
            ) : (
              <>
                <ReferenceLine y={0} stroke="#ccc" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="portfolioReturn"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  name="Portfolio Return"
                />
                <Line
                  type="monotone"
                  dataKey="sp500Return"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  name="S&P 500 Return"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Data covers {metadata?.totalMonths || data.length} months • S&P 500 data via SPY ETF
      </div>
    </div>
  );
}
