import { Card } from './ui/Card';
import { BrainCircuit, Lightbulb } from 'lucide-react';
import type { Insight } from '../types';

interface InsightsPanelProps {
  insights: Insight[];
}

function getCategoryLabel(type: string): string {
  const map: Record<string, string> = {
    pricing: 'Pricing',
    messaging: 'Messaging',
    features: 'Features',
    trend: 'Trend',
  };
  return map[type] || 'Insight';
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-600" />
          Strategic Insights
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight) => (
          <Card key={insight.id} className="hover:border-indigo-200 transition-all group border-t-4 border-t-indigo-500">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  {getCategoryLabel(insight.insight_type)}
                </span>
              </div>
              <p className="text-sm text-slate-700 font-medium leading-relaxed mb-6 flex-1 italic">
                "{insight.insight_text}"
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {insight.competitorName || 'Competitor'}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-indigo-500">Score: {(insight.score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
