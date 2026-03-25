import { Card } from './ui/Card';
import { Building2 } from 'lucide-react';
import type { Competitor } from '../types';

interface CompetitorGridProps {
  competitors: Competitor[];
}

export function CompetitorGrid({ competitors }: CompetitorGridProps) {
  if (competitors.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          Key Competitors
        </h2>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {competitors.length} found
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitors.map((comp) => (
          <Card key={comp.id} className="hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-tight">
                    {comp.industry}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{comp.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{comp.domain}</p>
              {comp.official_site && comp.official_site !== 'Not found' && (
                <a href={comp.official_site} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-medium truncate block">
                  {comp.official_site}
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
