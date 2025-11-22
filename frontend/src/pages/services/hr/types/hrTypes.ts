// Core HR Types
export interface Company {
  name: string;
  logo?: string;
}

export interface User {
  username: string;
  email: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Designation {
  id: number;
  title: string;
  code: string;
  department: number;
  department_name?: string;
  level: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'executive';
  min_salary: number;
  max_salary: number;
  is_active: boolean;
  created_at: string;
}

export interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  department: number;
  department_name?: string;
  designation: number;
  designation_title?: string;
  address?: string;
  salary?: number;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern' | 'consultant';
  work_mode: 'office' | 'remote' | 'hybrid';
  date_of_joining: string;
  date_of_leaving?: string;
  status: 'active' | 'inactive' | 'terminated' | 'resigned' | 'on_leave';

  base_salary: number;
  currency: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
  aadhar_number?: string;
  pan_number?: string;
  pf_number?: string;
  uan_number?: string;
  esi_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_branch?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_address?: string;
  skills: string[];
  performance_score: number;
  engagement_score: number;
  retention_risk: 'low' | 'medium' | 'high';
  profile_picture?: string;
  face_photo?: string;
  face_encoding?: number[];
  mobile_app_password?: string;
  mobile_app_enabled: boolean;
  last_mobile_login?: string;
  mobile_device_id?: string;
  created_at: string;
  updated_at: string;
  
  // Form XIII Required Fields
  father_husband_name?: string;
  nature_of_employment?: string;
  employee_signature?: string;
  termination_reason?: string;
  termination_date?: string;
  employee_remarks?: string;
  permanent_address_line1?: string;
  permanent_address_line2?: string;
  permanent_city?: string;
  permanent_state?: string;
  permanent_pincode?: string;
  permanent_country?: string;
  local_address_line1?: string;
  local_address_line2?: string;
  local_city?: string;
  local_state?: string;
  local_pincode?: string;
  local_country?: string;
}

export interface JobPosting {
  id: number;
  title: string;
  department: number;
  department_name?: string;
  designation: number;
  designation_title?: string;
  company_name?: string;
  description: string;
  requirements: string;
  responsibilities: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern' | 'consultant';
  work_mode: 'office' | 'remote' | 'hybrid';
  min_salary: number;
  max_salary: number;
  required_skills: string[];
  ai_screening_enabled: boolean;
  status: 'draft' | 'active' | 'paused' | 'closed';
  posted_date?: string;
  application_deadline?: string;
  applications_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: number;
  job_posting: number;
  job_posting_title?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  
  // Professional Details
  current_position?: string;
  current_company?: string;
  total_experience: number;
  relevant_experience: number;
  current_salary?: number;
  expected_salary?: number;
  notice_period?: string;
  
  // Contact & Location
  current_location?: string;
  willing_to_relocate: boolean;
  linkedin_profile?: string;
  portfolio_url?: string;
  
  // Education & Skills
  education_details: any[];
  skills: string[];
  certifications: string[];
  languages: string[];
  
  // Application Materials
  resume: string;
  cover_letter?: string;
  
  // Source Tracking
  application_source: 'direct' | 'whatsapp' | 'linkedin' | 'gmail' | 'outlook' | 'facebook' | 'twitter' | 'instagram' | 'telegram' | 'other_email' | 'copy_link';
  share_id?: string;
  
  // AI Analysis
  ai_score: number;
  skill_match_percentage: number;
  ai_screening_notes?: string;
  
  // Application Status
  status: 'submitted' | 'screening' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'offer_sent' | 'offer_accepted' | 'offer_rejected' | 'selected' | 'rejected' | 'withdrawn';
  
  // Interview Details
  interview_date?: string;
  interview_notes?: string;
  interviewer?: number;
  
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: number;
  employee: number;
  employee_name?: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  work_mode: 'office' | 'remote' | 'hybrid';
  location?: string;
  total_hours: number;
  status: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday';
  notes?: string;
  created_at: string;
}

export interface PerformanceReview {
  id: number;
  employee: number;
  employee_name?: string;
  reviewer: number;
  reviewer_name?: string;
  review_period_start: string;
  review_period_end: string;
  goals_achievement: number;
  quality_score: number;
  productivity_score: number;
  collaboration_score: number;
  overall_rating: number;
  ai_performance_prediction: number;
  improvement_suggestions: string[];
  strengths?: string;
  areas_for_improvement?: string;
  goals_for_next_period?: string;
  status: 'draft' | 'submitted' | 'approved';
  created_at: string;
  updated_at: string;
}

export interface PayrollCycle {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: 'draft' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  payslips_count: number;
  created_at: string;
  updated_at: string;
}

export interface Payslip {
  id: number;
  payroll_cycle: number;
  payroll_name?: string;
  employee: number;
  employee_name?: string;
  basic_salary: number;
  allowances: number;
  overtime_amount: number;
  bonus: number;
  gross_salary: number;
  tax_deduction: number;
  pf_deduction: number;
  esi_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  status: 'draft' | 'generated' | 'paid';
  created_at: string;
  updated_at: string;
}

// Dashboard Data Interfaces
export interface HRDashboardData {
  company: Company;
  user: User;
  employee_stats: {
    total_employees: number;
    active_employees: number;
    departments: number;
    avg_performance_score: number;
  };
  recruitment_stats: {
    active_job_postings: number;
    pending_applications: number;
  };
  attendance_stats: {
    weekly_attendance: number;
  };
  ai_insights: {
    high_retention_risk_employees: number;
    performance_trend: string;
    recruitment_efficiency: number;
  };
}

// API Response Types
export interface APIResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
}

export interface APIError {
  error: string;
  details?: string;
}

// Form Types
export interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  department: number;
  designation: number;
  employment_type: string;
  work_mode: string;
  date_of_joining: string;

  base_salary: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
  aadhar_number?: string;
  pan_number?: string;
  pf_number?: string;
  uan_number?: string;
  esi_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_branch?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_address?: string;
  skills: string[];
  profile_picture?: File;
  face_photo?: File;
  capture_face_photo?: boolean;
  
  // Form XIII Required Fields
  father_husband_name?: string;
  nature_of_employment?: string;
  employee_signature?: File;
  termination_reason?: string;
  termination_date?: string;
  employee_remarks?: string;
  permanent_address_line1?: string;
  permanent_address_line2?: string;
  permanent_city?: string;
  permanent_state?: string;
  permanent_pincode?: string;
  permanent_country?: string;
  local_address_line1?: string;
  local_address_line2?: string;
  local_city?: string;
  local_state?: string;
  local_pincode?: string;
  local_country?: string;
}

export interface JobPostingFormData {
  title: string;
  department: number;
  designation: number;
  description: string;
  requirements: string;
  responsibilities: string;
  employment_type: string;
  work_mode: string;
  min_salary: number;
  max_salary: number;
  required_skills: string[];
  ai_screening_enabled: boolean;
  application_deadline?: string;
}

// Filter Types
export interface EmployeeFilters {
  search?: string;
  department?: number;
  status?: string;
  work_mode?: string;
  employment_type?: string;
}

export interface JobPostingFilters {
  search?: string;
  department?: number;
  status?: string;
  employment_type?: string;
}

export interface AttendanceFilters {
  employee?: number;
  date_from?: string;
  date_to?: string;
  status?: string;
  work_mode?: string;
}