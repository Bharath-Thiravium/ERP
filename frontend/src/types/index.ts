// Authentication Types
export interface User {
  id: number
  email: string
  company_id?: number
  company_name?: string
  company_logo?: string
  is_master_admin?: boolean
  is_company_user?: boolean
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
  first_login_required?: boolean
  approval_pending?: boolean
  approval_status?: string
  must_change_password?: boolean
  force_password_reset?: boolean
  requires_2fa?: boolean
  user_id?: number
  message?: string
  // Phase 2: Security Features
  account_locked?: boolean
  remaining_attempts?: number
  lockout_expires_at?: string
  password_expires_in_days?: number
  password_expires_at?: string
  security_alerts?: SecurityAlert[]
  trusted_device?: boolean
  device_id?: string
}

export interface SecurityAlert {
  id: number
  type: 'suspicious_login' | 'new_device' | 'password_change' | 'failed_attempts'
  message: string
  timestamp: string
  ip_address?: string
  location?: string
  device_info?: string
}

// Phase 3: Enhanced Security
export interface IPRestriction {
  id: number
  ip_address: string
  description: string
  is_active: boolean
  created_at: string
  last_used?: string
}

export interface DeviceFingerprint {
  id: string
  device_name: string
  browser: string
  os: string
  ip_address: string
  location?: string
  is_trusted: boolean
  first_seen: string
  last_seen: string
}

export interface LoginNotification {
  id: number
  email_sent: boolean
  ip_address: string
  location?: string
  device_info: string
  timestamp: string
}

export interface SecuritySettings {
  ip_restrictions_enabled: boolean
  allowed_ips: IPRestriction[]
  device_fingerprinting_enabled: boolean
  login_notifications_enabled: boolean
  captcha_after_failed_attempts: number
  max_failed_attempts: number
  lockout_duration_minutes: number
}

export interface MasterAdminLoginRequest {
  email: string
  password: string
  totp_code?: string
  recovery_code?: string
}

export interface CompanyUserLoginRequest {
  email: string
  password: string
}

// Company Types
export interface Company {
  id: number
  name: string
  email: string
  phone: string
  address: string
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  detailed_info_submitted: boolean
  created_at: string
  created_by_name: string
  services_count: number
  
  // Detailed info fields
  business_type?: string
  industry?: string
  employee_count?: number
  annual_revenue?: number
  website?: string
  tax_id?: string
  registration_number?: string
  contact_person_name?: string
  contact_person_title?: string
  contact_person_email?: string
  contact_person_phone?: string
  description?: string
  special_requirements?: string
}

export interface CreateCompanyRequest {
  name: string
  email: string
  phone: string
  address: string
  services: number[]
  user_email: string
  user_password: string
}

export interface CompanyDetailedInfoRequest {
  business_type: string
  industry: string
  employee_count: number
  annual_revenue: number
  website: string
  tax_id: string
  gst_number: string
  registration_number: string
  contact_person_name: string
  contact_person_title: string
  contact_person_email: string
  contact_person_phone: string
  description: string
  special_requirements: string
}

// Service Types
export interface Service {
  id: number
  name: string
  service_type: string
  description: string
  is_active: boolean
  base_price: number
  features: string[]
  created_at: string
}

export interface CompanyService {
  id: number
  service: Service
  assigned_at: string
  is_active: boolean
  password_changed_at: string
  password_expires_at: string
  assigned_by_name: string
}

export interface ServiceAccessRequest {
  password: string
}

export interface ServicePasswordChangeRequest {
  current_password: string
  new_password: string
  confirm_password: string
}

// Notification Types
export interface Notification {
  id: number
  notification_type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  message: string
  company_id?: number
  service_id?: number
  is_read: boolean
  is_archived: boolean
  read_at?: string
  created_at: string
  expires_at?: string
  metadata: Record<string, any>
  sender_name?: string
  sender_email?: string
}

export interface NotificationStats {
  total: number
  unread: number
  read: number
  archived: number
  by_priority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  by_type: Record<string, number>
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  count: number
  next?: string
  previous?: string
  results: T[]
}

// Form Types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'multiselect' | 'url' | 'tel'
  placeholder?: string
  required?: boolean
  options?: { value: string | number; label: string }[]
  validation?: any
}

// Theme Types
export type Theme = 'light' | 'dark'

// Loading States
export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

// Dashboard Types
export interface DashboardStats {
  total_companies: number
  pending_approvals: number
  active_services: number
  total_notifications: number
  recent_activities: Activity[]
}

export interface Activity {
  id: number
  type: string
  description: string
  timestamp: string
  user: string
  company?: string
}
