export interface Competitor {
  id: string;
  name: string;
  industry: string;
  domain: string;
  official_site?: string;
  reviews?: string;
  discussions?: string;
}

export interface ChangeRecord {
  competitor_id: string;
  source_id: string;
  field: string;
  type: string;
  old_value: string | null;
  new_value: string | null;
  status: string;
  competitorName?: string;
}

export interface Insight {
  id: string;
  competitor_id: string;
  insight_text: string;
  insight_type: string;
  score: number;
  competitorName?: string;
}

export interface Recommendation {
  id: string;
  insight_id: string;
  recommendation_text: string;
  priority: number;
}

export interface TrendData {
  keyword: string;
  frequency: number;
  trend_direction: string;
}

export interface PipelineState {
  step: number;
  totalSteps: number;
  stepLabel: string;
  competitors: Competitor[];
  changes: ChangeRecord[];
  insights: Insight[];
  recommendations: Recommendation[];
  trends: TrendData[];
  error: string | null;
}
