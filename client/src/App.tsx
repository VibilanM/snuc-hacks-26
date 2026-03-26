import { useState } from 'react';
import { SearchHeader } from './components/SearchHeader';
import { CompetitorGrid } from './components/CompetitorGrid';
import { ChangesFeed } from './components/ChangesFeed';
import { InsightsPanel } from './components/InsightsPanel';
import { TrendsChart } from './components/TrendsChart';
import { BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { runPipeline } from './api';
import type { Competitor, ChangeRecord, Insight, Recommendation, TrendData } from './types';

export default function App() {
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [marketReport, setMarketReport] = useState<string | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);

  const handleSearch = async (organisationName: string, industry: string, product: string) => {
    if (!organisationName.trim() || !industry.trim() || !product.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasResults(false);

    try {
      const result = await runPipeline(
        organisationName,
        industry,
        product,
        (_step, label) => setCurrentStep(label)
      );

      const competitorList: Competitor[] = (result.searchResult?.competitors || []).map(
        (c: any, i: number) => ({
          id: c.id || String(i),
          name: c.name,
          industry,
          domain: product,
          official_site: c.official_site,
          reviews: c.reviews,
          discussions: c.discussions,
        })
      );
      setCompetitors(competitorList);

      const changeList: ChangeRecord[] = (result.changesResult?.details || []).map(
        (ch: any) => ({
          ...ch,
          competitorName: competitorList.find(c => c.id === ch.competitor_id)?.name || ch.competitor_id?.substring(0, 8),
        })
      );
      setChanges(changeList);

      setMarketReport(result.insightsResult?.report || null);
      setTrends([]);

      try {
        const BASE = '/api';
        const trendsRes = await fetch(`${BASE}/normalize-data`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).then(r => r.json()).catch(() => null);

        if (trendsRes?.trends) {
          setTrends(trendsRes.trends.map((t: any) => ({
            keyword: t.keyword,
            frequency: t.frequency,
            trend_direction: t.trend_direction,
          })));
        }
      } catch {
        // Non-critical: trends may not be fetchable directly
      }

      setHasResults(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSearching(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">MarketIntel</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            Intelligence Engine <span className="text-indigo-600">v1.2</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
            Market Intelligence Dashboard
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Enter your organisation details to identify competitors, track changes, and generate strategic insights.
          </p>
        </div>

        <SearchHeader onSearch={handleSearch} isLoading={isSearching} currentStep={currentStep} />

        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20 text-slate-400"
            >
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-600" />
              <p className="font-bold uppercase tracking-widest text-xs mb-2">Processing Pipeline...</p>
              <p className="text-sm text-indigo-500 font-medium">{currentStep}</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-slate-400"
            >
              <AlertTriangle className="w-12 h-12 mb-4 text-rose-400" />
              <p className="font-bold text-rose-600 mb-2">Pipeline Error</p>
              <p className="text-sm text-slate-500 max-w-md text-center">{error}</p>
            </motion.div>
          ) : hasResults ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 gap-16"
            >
              <CompetitorGrid competitors={competitors} />

              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 items-start">
                <ChangesFeed changes={changes} />
                <TrendsChart trends={trends} />
              </div>

              {marketReport && <InsightsPanel report={marketReport} />}
            </motion.div>
          ) : (
            <div key="empty" className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
              <p className="text-slate-400 font-medium">Enter your organisation details above to begin analysis.</p>
            </div>
          )}
        </AnimatePresence>

        <footer className="mt-20 py-12 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <BarChart3 className="w-4 h-4" />
            © 2026 MarketIntel AI.
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Privacy</a>
            <a href="#" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Terms</a>
            <a href="#" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Support</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

async function fetchTable(table: string) {
  try {
    const res = await fetch(`/api/${table}`, { method: 'GET' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
