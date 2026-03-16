import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Users, Target, Building, Phone, Calendar, Megaphone, Settings,
  LogOut, Sun, Moon, Shield, ChevronRight,
  BarChart3, Brain, Headphones, TrendingUp, Mail, FileText,
  Plug, Bell, Menu, X
} from 'lucide-react'
import { useThemeStore } from '../../../store/themeStore'
import { useServiceUserStore } from '../../../store/serviceUserStore'
import api from '../../../lib/api'
import { CRMDashboard } from './components/CRMDashboard'

interface CRMLayoutProps {
  children?: React.ReactNode
  currentPage?: string
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ children, currentPage = 'overview' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { serviceUser, sessionKey, logout: serviceUserLogout } = useServiceUserStore()
  const [activeTab, setActiveTab] = useState(currentPage)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [companyData, setCompanyData] = useState<any>(null)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Fetch company data including logo
  const fetchCompanyData = async () => {
    try {
      const currentSessionKey = useServiceUserStore.getState().sessionKey
      if (serviceUser?.company_id && currentSessionKey) {
        const response = await api.get(`/api/auth/service-user/company/${serviceUser.company_id}/`, {
          headers: {
            'Authorization': `Bearer ${currentSessionKey}`
          },
          params: {
            session_key: currentSessionKey
          }
        })
        setCompanyData(response.data)
      }
    } catch (error: any) {
      console.error('Error fetching company logo:', error)
    }
  }

  // Update activeTab based on current route
  useEffect(() => {
    const path = location.pathname.replace('/services/crm/', '').replace('/services/crm', '')
    if (path === '' || path === '/') {
      setActiveTab('overview')
    } else {
      setActiveTab(path)
    }
  }, [location.pathname])

  useEffect(() => {
    if (serviceUser?.company_name) {
      setCompanyData({
        id: serviceUser.company_id,
        name: serviceUser.company_name,
        logo: null
      })

      if (sessionKey) {
        fetchCompanyData()
      } else {
        setTimeout(() => {
          const currentSessionKey = useServiceUserStore.getState().sessionKey
          if (currentSessionKey) {
            fetchCompanyData()
          }
        }, 1000)
      }
    }
  }, [serviceUser?.company_id, sessionKey])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // CRM sidebar menu items with better organization
  const sidebarSections = [
    {
      title: 'Dashboard',
      items: [
        { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-blue-600' }
      ]
    },
    {
      title: 'Sales Management',
      items: [
        { id: 'leads', label: 'Leads', icon: Users, color: 'text-orange-600' },
        { id: 'opportunities', label: 'Opportunities', icon: Target, color: 'text-green-600' },
        { id: 'pipeline', label: 'Sales Pipeline', icon: TrendingUp, color: 'text-purple-600' },
        { id: 'lead-scoring', label: 'AI Lead Scoring', icon: Brain, color: 'text-indigo-600' }
      ]
    },
    {
      title: 'Customer Management',
      items: [
        { id: 'accounts', label: 'Accounts', icon: Building, color: 'text-blue-600' },
        { id: 'contacts', label: 'Contacts', icon: Phone, color: 'text-green-600' },
        { id: 'analytics', label: 'Customer Analytics', icon: BarChart3, color: 'text-purple-600' },
        { id: 'support', label: 'Customer Support', icon: Headphones, color: 'text-red-600' }
      ]
    },
    {
      title: 'Marketing & Automation',
      items: [
        { id: 'campaigns', label: 'Campaigns', icon: Megaphone, color: 'text-yellow-600' },
        { id: 'marketing', label: 'Marketing Automation', icon: Mail, color: 'text-pink-600' },
        { id: 'activities', label: 'Activities', icon: Calendar, color: 'text-indigo-600' }
      ]
    },
    {
      title: 'Analytics & Reports',
      items: [
        { id: 'reporting', label: 'Advanced Reporting', icon: FileText, color: 'text-gray-600' }
      ]
    },
    {
      title: 'System Management',
      items: [
        { id: 'integration', label: 'Integrations', icon: Plug, color: 'text-blue-600' },
        { id: 'security', label: 'Security & Compliance', icon: Shield, color: 'text-red-600' },
        { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600' }
      ]
    }
  ]

  const renderContent = () => {
    if (children) return children
    
    switch (activeTab) {
      case 'overview':
        return <CRMDashboard />
      default:
        return <CRMDashboard />
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-[var(--z-overlay)] bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside id="sidebar" className={`fixed inset-y-0 left-0 z-[var(--z-sidebar)] w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Sidebar Header */}
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
              {companyData?.logo ? (
                <img src={companyData.logo} alt="Company logo" className="h-full w-full object-cover" />
              ) : (
                <Building className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">CRM Management</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {companyData?.name || serviceUser?.company_name || 'Company'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 py-6">
            <div className="space-y-6">
              {sidebarSections.map((section) => (
                <div key={section.title}>
                  <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = activeTab === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === 'overview') {
                              navigate('/services/crm/')
                            } else {
                              navigate(`/services/crm/${item.id}`)
                            }
                          }}
                          className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : item.color}`} />
                          {item.label}
                          {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* User Info at Bottom */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {serviceUser?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {serviceUser?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {serviceUser?.role || 'CRM User'}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={serviceUserLogout}
              className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : 'ml-0'}`}>
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigate('/company/services')}
                  className="hidden lg:flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Services
                </button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden lg:block"></div>
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  CRM Module
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative" ref={notificationRef}>
                  <button 
                    onClick={() => setNotificationOpen(!notificationOpen)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                  </button>
                  {notificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[var(--z-dropdown)]">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      </div>
                      <div className="p-4">
                        <div className="text-center py-8">
                          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You're all caught up!</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default CRMLayout
