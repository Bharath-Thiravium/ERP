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