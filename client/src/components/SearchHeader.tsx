import { useState, FormEvent } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';

interface SearchHeaderProps {
  onSearch: (organisationName: string, industry: string, product: string) => void;
  isLoading: boolean;
  currentStep?: string;
}

export function SearchHeader({ onSearch, isLoading, currentStep }: SearchHeaderProps) {
  const [organisationName, setOrganisationName] = useState('');
  const [industry, setIndustry] = useState('');
  const [product, setProduct] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(organisationName, industry, product);
  };

  const isDisabled = isLoading || !organisationName.trim() || !industry.trim() || !product.trim();

  return (
    <form onSubmit={handleSubmit} className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            value={organisationName}
            onChange={(e) => setOrganisationName(e.target.value)}
            placeholder="Organisation Name"
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400"
            disabled={isLoading}
          />
        </div>
        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Industry"
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400"
            disabled={isLoading}
          />
        </div>
        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Product / Service"
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400"
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isDisabled}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none transition-all font-bold text-sm flex items-center gap-2 active:scale-95"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {currentStep || 'Processing...'}
            </>
          ) : (
            'Generate Insights'
          )}
        </button>
        {isLoading && currentStep && (
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            {currentStep}
          </span>
        )}
      </div>
    </form>
  );
}
