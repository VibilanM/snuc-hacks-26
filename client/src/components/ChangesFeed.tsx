import { Card } from './ui/Card';
import { RefreshCw, ArrowRight, Info } from 'lucide-react';
import type { ChangeRecord } from '../types';

interface ChangesFeedProps {
  changes: ChangeRecord[];
}

function formatCategory(field: string): string {
  const map: Record<string, string> = {
    pricing: 'Pricing',
    headline: 'Messaging',
    features: 'Feature',
    keywords: 'Keywords',
  };
  return map[field] || 'Other';
}

export function ChangesFeed({ changes }: ChangesFeedProps) {
  if (changes.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-indigo-600" />
          Recent Market Changes
        </h2>
      </div>
      <div className="space-y-4">
        {changes.map((change, idx) => (
          <Card key={idx} className="hover:border-indigo-100 transition-all border-l-4 border-l-indigo-500">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">
                    {formatCategory(change.field)}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {change.competitorName || change.competitor_id.substring(0, 8)}
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded uppercase tracking-wider">
                  {change.type}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative">
                  <div className="absolute -top-2 left-3 px-2 bg-white border border-slate-100 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">Previous</div>
                  <p className="text-sm text-slate-500 line-through decoration-slate-300/50">
                    {change.old_value || '—'}
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100 relative">
                  <div className="absolute -top-2 left-3 px-2 bg-white border border-indigo-100 rounded text-[9px] font-black text-indigo-500 uppercase tracking-widest">Current</div>
                  <p className="text-sm text-indigo-900 font-bold">
                    {change.new_value || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <Info className="w-3 h-3" />
                Detected via automated website crawling and data analysis.
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
