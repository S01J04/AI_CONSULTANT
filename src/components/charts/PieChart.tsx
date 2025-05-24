import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface PieChartProps {
  title: string;
  data: ChartData<'pie'>;
  height?: number;
  options?: ChartOptions<'pie'>;
}

const PieChart: React.FC<PieChartProps> = ({ 
  title, 
  data, 
  height = 300,
  options = {} 
}) => {
  const defaultOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.formattedValue;
            const dataset = context.dataset;
            const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
            const percentage = Math.round((context.raw as number) / total * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-full">
      <div style={{ height: height }}>
        <Pie data={data} options={mergedOptions} />
      </div>
    </div>
  );
};

export default PieChart;
