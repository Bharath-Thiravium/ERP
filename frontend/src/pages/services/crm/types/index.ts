export interface Lead {
  id: number;
  lead_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'website' | 'referral' | 'social_media' | 'email_campaign' | 'cold_call' | 'trade_show' | 'advertisement' | 'other';
  estimated_value?: number;
  expected_close_date?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  last_contacted?: string;
  description?: string;
  tags: string[];
}

export interface Contact {
  id: number;
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  tags: string[];
  is_active: boolean;
  full_name?: string;
}

export interface Account {
  id: number;
  account_id: string;
  name: string;
  account_type: 'prospect' | 'customer' | 'partner' | 'vendor';
  industry: 'technology' | 'healthcare' | 'finance' | 'manufacturing' | 'retail' | 'education' | 'government' | 'other';
  website?: string;
  phone?: string;
  email?: string;
  annual_revenue?: number;
  employee_count?: number;
  billing_address?: string;
  shipping_address?: string;
  primary_contact?: number;
  primary_contact_name?: string;
  account_manager?: number;
  account_manager_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags: string[];
  is_active: boolean;
  opportunities_count?: number;
}

export interface Opportunity {
  id: number;
  opportunity_id: string;
  name: string;
  account: number;
  account_name?: string;
  contact?: number;
  contact_name?: string;
  stage: 'prospecting' | 'qualification' | 'needs_analysis' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  stage_display?: string;
  amount: number;
  probability: number;
  expected_close_date: string;
  owner: number;
  owner_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  closed_date?: string;
  description?: string;
  next_step?: string;
  tags: string[];
  weighted_amount?: number;
}

export interface Activity {
  id: number;
  activity_id: string;
  subject: string;
  activity_type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'demo' | 'proposal';
  activity_type_display?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  status_display?: string;
  lead?: number;
  lead_name?: string;
  contact?: number;
  contact_name?: string;
  account?: number;
  account_name?: string;
  opportunity?: number;
  opportunity_name?: string;
  due_date: string;
  duration_minutes: number;
  assigned_to: number;
  assigned_to_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  description?: string;
  outcome?: string;
}

export interface Campaign {
  id: number;
  campaign_id: string;
  name: string;
  campaign_type: 'email' | 'social' | 'webinar' | 'event' | 'advertisement' | 'direct_mail' | 'telemarketing';
  campaign_type_display?: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  status_display?: string;
  start_date: string;
  end_date: string;
  budget?: number;
  target_audience?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  leads_generated: number;
  opportunities_created: number;
  revenue_generated: number;
  description?: string;
  tags: string[];
  members_count?: number;
}

export interface SalesTarget {
  id: number;
  user: number;
  user_name?: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  period_display?: string;
  year: number;
  month?: number;
  quarter?: number;
  target_amount: number;
  achieved_amount: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  achievement_percentage?: number;
}

export interface DashboardStats {
  total_leads: number;
  total_opportunities: number;
  total_accounts: number;
  total_contacts: number;
  pipeline_value: number;
  won_opportunities: number;
  activities_today: number;
  overdue_activities: number;
}

export interface LeadsByStatus {
  status: string;
  count: number;
}

export interface OpportunitiesByStage {
  stage: string;
  count: number;
  total_value: number;
}

export interface CRMFilters {
  search?: string;
  status?: string;
  priority?: string;
  source?: string;
  assigned_to?: string;
  account_type?: string;
  industry?: string;
  stage?: string;
  probability?: string;
  activity_type?: string;
  campaign_type?: string;
  period?: string;
  year?: string;
  is_active?: boolean;
}

// Customer Support Types
export interface TicketCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface SLA {
  id: number;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  priority_display?: string;
  response_time_hours: number;
  resolution_time_hours: number;
  is_active: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  status_display?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  priority_display?: string;
  source: 'email' | 'web' | 'phone' | 'chat' | 'social';
  source_display?: string;
  category?: number;
  category_name?: string;
  contact: number;
  contact_name?: string;
  account?: number;
  account_name?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  sla?: number;
  response_due?: string;
  resolution_due?: string;
  first_response_at?: string;
  resolved_at?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  satisfaction_rating?: number;
  satisfaction_comment?: string;
  is_overdue?: boolean;
  response_overdue?: boolean;
}

export interface KnowledgeBase {
  id: number;
  title: string;
  content: string;
  category?: number;
  category_name?: string;
  tags: string[];
  is_published: boolean;
  view_count: number;
  helpful_count: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

// AI Lead Scoring Types
export interface LeadScore {
  id: number;
  lead: number;
  lead_name?: string;
  lead_company?: string;
  lead_email?: string;
  lead_status?: string;
  behavioral_score: number;
  demographic_score: number;
  engagement_score: number;
  predictive_score: number;
  total_score: number;
  grade: 'cold' | 'warm' | 'hot' | 'very_hot';
  grade_display?: string;
  last_calculated: string;
  calculation_count: number;
  conversion_probability: number;
  recommended_actions: string[];
  score_factors: {
    behavioral: { score: number; factors: string[] };
    demographic: { score: number; factors: string[] };
    engagement: { score: number; factors: string[] };
    predictive: { score: number; factors: string[] };
  };
}

export interface ScoringCriteria {
  id: number;
  name: string;
  criteria_type: 'behavioral' | 'demographic' | 'engagement' | 'predictive';
  criteria_type_display?: string;
  weight: number;
  max_points: number;
  is_active: boolean;
  created_at: string;
}

export interface SupportDashboardStats {
  total_tickets: number;
  open_tickets: number;
  overdue_tickets: number;
  avg_response_time: number;
  avg_resolution_time: number;
  satisfaction_avg: number;
}

export interface LeadScoringDashboard {
  overview: {
    total_leads: number;
    scored_leads: number;
    unscored_leads: number;
    avg_score: number;
  };
  score_distribution: {
    very_hot: number;
    hot: number;
    warm: number;
    cold: number;
  };
  component_averages: {
    behavioral: number;
    demographic: number;
    engagement: number;
    predictive: number;
  };
  conversion_metrics: {
    high_probability: number;
    medium_probability: number;
    low_probability: number;
    avg_probability: number;
  };
  top_leads: Array<{
    id: number;
    name: string;
    company: string;
    score: number;
    grade: string;
    probability: number;
  }>;
  recent_scores: Array<{
    id: number;
    name: string;
    score: number;
    grade: string;
    calculated_at: string;
  }>;
}

// Phase 2: Advanced Sales Pipeline Management Types
export interface PipelineStage {
  id: number;
  name: string;
  order: number;
  probability: number;
  is_active: boolean;
  color: string;
  created_at: string;
  deals_count?: number;
}

export interface Deal {
  id: number;
  deal_id: string;
  name: string;
  account: number;
  account_name?: string;
  contact?: number;
  contact_name?: string;
  opportunity?: number;
  current_stage: number;
  current_stage_name?: string;
  status: 'open' | 'won' | 'lost' | 'on_hold';
  status_display?: string;
  value: number;
  probability: number;
  expected_close_date: string;
  actual_close_date?: string;
  owner: number;
  owner_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  next_action?: string;
  tags: string[];
  weighted_value?: number;
  days_in_stage?: number;
}

export interface DealStageHistory {
  id: number;
  deal: number;
  deal_name?: string;
  stage: number;
  stage_name?: string;
  changed_by: number;
  changed_by_name?: string;
  changed_at: string;
  notes?: string;
  duration_days?: number;
}

export interface SalesQuota {
  id: number;
  user: number;
  user_name?: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  period_display?: string;
  year: number;
  month?: number;
  quarter?: number;
  quota_amount: number;
  achieved_amount: number;
  deals_target: number;
  deals_achieved: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  achievement_percentage?: number;
  // Additional properties for compatibility
  percentage?: number;
  achieved?: number;
  quota?: number;
}

export interface PipelineOverview {
  stage: PipelineStage;
  deals_count: number;
  total_value: number;
  weighted_value: number;
  avg_days_in_stage: number;
  deals: Deal[];
}

export interface VelocityMetrics {
  avg_sales_cycle: number;
  win_rate: number;
  avg_deal_size: number;
  conversion_rate_by_stage: Array<{
    stage: string;
    conversion_rate: number;
  }>;
  velocity_trend: Array<{
    period: string;
    velocity: number;
  }>;
}

// Phase 2: Customer Relationship Analytics Types
export interface CustomerInteraction {
  id: number;
  interaction_id: string;
  contact: number;
  contact_name?: string;
  account: number;
  account_name?: string;
  deal?: number;
  deal_name?: string;
  interaction_type: 'email' | 'call' | 'meeting' | 'demo' | 'support' | 'purchase' | 'website_visit' | 'social_media';
  interaction_type_display?: string;
  subject: string;
  description?: string;
  outcome?: string;
  interaction_date: string;
  duration_minutes?: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  metadata: Record<string, any>;
}

export interface CustomerHealthScore {
  id: number;
  account: number;
  account_name?: string;
  account_type?: string;
  engagement_score: number;
  satisfaction_score: number;
  usage_score: number;
  financial_score: number;
  overall_score: number;
  health_status: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  health_status_display?: string;
  churn_risk: number;
  upsell_opportunity: number;
  last_calculated: string;
  calculation_count: number;
  risk_factors: string[];
  recommendations: string[];
}

export interface CustomerSegment {
  id: number;
  name: string;
  description?: string;
  criteria: Record<string, any>;
  color: string;
  is_active: boolean;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  account_count?: number;
}

export interface CustomerSegmentMembership {
  id: number;
  segment: number;
  segment_name?: string;
  account: number;
  account_name?: string;
  added_at: string;
  added_by: number;
  added_by_name?: string;
}

export interface SalesAnalytics {
  id: number;
  metric_type: 'conversion_rate' | 'avg_deal_size' | 'sales_cycle_length' | 'win_rate' | 'pipeline_velocity' | 'customer_acquisition_cost' | 'customer_lifetime_value';
  metric_type_display?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_display?: string;
  date: string;
  year: number;
  month?: number;
  week?: number;
  quarter?: number;
  value: number;
  count: number;
  metadata: Record<string, any>;
  calculated_at: string;
}

export interface InteractionSummary {
  total_interactions: number;
  recent_interactions: number;
  interactions_by_type: Array<{
    interaction_type: string;
    count: number;
  }>;
  top_accounts: Array<{
    account__name: string;
    count: number;
  }>;
  avg_interactions_per_account: number;
}

export interface HealthDashboard {
  total_accounts: number;
  health_distribution: Array<{
    health_status: string;
    count: number;
  }>;
  avg_health_score: number;
  high_risk_accounts: number;
  upsell_opportunities: number;
  recent_calculations: number;
}

export interface AnalyticsDashboard {
  conversion_rate_trend: Array<{
    date: string;
    value: number;
    count: number;
  }>;
  avg_deal_size_trend: Array<{
    date: string;
    value: number;
    count: number;
  }>;
  win_rate_trend: Array<{
    date: string;
    value: number;
    count: number;
  }>;
  key_metrics: {
    conversion_rate?: {
      current_value: number;
      date: string;
    };
    avg_deal_size?: {
      current_value: number;
      date: string;
    };
    win_rate?: {
      current_value: number;
      date: string;
    };
  };
}