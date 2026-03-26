import { Card } from './ui/Card';
import { BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface InsightsPanelProps {
  report: string;
}

export function InsightsPanel({ report }: InsightsPanelProps) {
  if (!report) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-600" />
          Insights & Recommendations
        </h2>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-indigo-500">
        <div className="p-8">
          <div className="max-w-none text-slate-700">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-black text-slate-900 mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-indigo-950 mt-10 mb-5 tracking-tight border-b border-indigo-100 pb-2 flex items-center gap-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-800 mt-8 mb-4 tracking-tight" {...props} />,
                p: ({node, ...props}) => <p className="leading-relaxed mb-6 text-[15px]" {...props} />,
                ul: ({node, ...props}) => <ul className="pl-2 mb-8 space-y-3" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-8 space-y-3 font-medium text-[15px]" {...props} />,
                li: ({node, ...props}) => (
                  <li className="text-[15px] flex items-start relative group">
                    <span className="text-indigo-400 mr-3 mt-1.5 leading-none shrink-0">•</span>
                    <span className="group-hover:text-slate-900 transition-colors leading-relaxed">{props.children}</span>
                  </li>
                ),
                strong: ({node, ...props}) => <strong className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-5 py-3 my-6 bg-gradient-to-r from-indigo-50/80 to-transparent italic text-slate-700 rounded-r-xl shadow-sm" {...props} />,
              }}
            >
              {report}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </section>
  );
}
