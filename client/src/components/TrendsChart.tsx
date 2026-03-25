import { Card } from './ui/Card';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { TrendData } from '../types';

interface TrendsChartProps {
  trends: TrendData[];
}

function getDirectionIcon(direction: string) {
  if (direction.includes('growth')) return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
  if (direction.includes('decline')) return <ArrowDownRight className="w-4 h-4 text-rose-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function getDirectionColor(direction: string) {
  if (direction.includes('growth')) return 'text-emerald-600 bg-emerald-50';
  if (direction.includes('decline')) return 'text-rose-600 bg-rose-50';
  return 'text-slate-600 bg-slate-50';
}

export function TrendsChart({ trends }: TrendsChartProps) {
  if (trends.length === 0) return null;

  const chartData = trends
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8)
    .map(t => ({
      name: t.keyword,
      frequency: t.frequency,
      direction: t.trend_direction,
    }));

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Keyword Trends
        </h2>
      </div>
      <Card className="p-0 overflow-visible">
        <div className="h-[300px] w-full p-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={120}
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  padding: '12px',
                }}
                itemStyle={{ color: '#6366f1', fontWeight: 700 }}
              />
              <Bar dataKey="frequency" fill="#6366f1" radius={[0, 6, 6, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
          <div className="flex flex-wrap gap-2">
            {trends.slice(0, 5).map((t) => (
              <div key={t.keyword} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getDirectionColor(t.trend_direction)}`}>
                {getDirectionIcon(t.trend_direction)}
                {t.keyword}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
