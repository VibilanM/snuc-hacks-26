import { Card } from './ui/Card';
import { Zap, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { Recommendation } from '../types';

interface RecommendationsListProps {
  recommendations: Recommendation[];
}

function getPriorityLabel(priority: number): 'High' | 'Medium' | 'Low' {
  if (priority >= 0.7) return 'High';
  if (priority >= 0.4) return 'Medium';
  return 'Low';
}

function getPriorityStyle(label: string) {
  if (label === 'High') return 'bg-rose-50 text-rose-600';
  if (label === 'Medium') return 'bg-amber-50 text-amber-600';
  return 'bg-emerald-50 text-emerald-600';
}

function getPriorityIcon(label: string) {
  if (label === 'High') return <AlertCircle className="w-4 h-4 text-rose-400" />;
  if (label === 'Medium') return <Info className="w-4 h-4 text-amber-400" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  if (recommendations.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          Actionable Recommendations
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((rec) => {
          const label = getPriorityLabel(rec.priority);
          return (
            <Card key={rec.id} className="hover:border-indigo-200 transition-all group">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${getPriorityStyle(label)}`}>
                    {label} Priority
                  </div>
                  {getPriorityIcon(label)}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-6 flex-1">{rec.recommendation_text}</p>
                <button className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all active:scale-95">
                  Implement Now
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
