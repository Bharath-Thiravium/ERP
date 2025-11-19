import React, { useState, useEffect } from 'react'
import { X, MessageCircle, Linkedin, Mail, Link, AtSign, Facebook, Twitter, Instagram, Send, BarChart3, Users, FileText, Share2, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { JobPosting } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface JobShareModalProps {
  isOpen: boolean
  onClose: () => void
  job: JobPosting | null
}

const JobShareModal: React.FC<JobShareModalProps> = ({ isOpen, onClose, job }) => {
  const { sessionKey } = useServiceUserStore()
  const [activeTab, setActiveTab] = useState('share')
  const [customMessage, setCustomMessage] = useState('')
  const [showCustomEditor, setShowCustomEditor] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  // Removed unused selectedTemplate state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [bulkMessage, setBulkMessage] = useState('')
  // Removed unused selectedContacts state

  useEffect(() => {
    if (isOpen && sessionKey) {
      if (activeTab === 'templates') {
        fetchTemplates()
      } else if (activeTab === 'analytics') {
        fetchAnalytics()
      }
    }
  }, [isOpen, sessionKey, activeTab])

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/api/hr/share-analytics/templates/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/api/hr/share-analytics/job/${job?.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const trackShare = async (platform: string) => {
    if (!sessionKey || !job) return
    
    try {
      await api.post('/api/hr/share-analytics/track-share/', {
        job_id: job.id,
        platform: platform,
        session_key: sessionKey
      })
    } catch (error) {
      console.error('Error tracking share:', error)
    }
  }

  if (!isOpen || !job) return null

  const jobUrl = `${window.location.origin}/jobs/${job.id}`
  
  // Ensure URL is properly formatted for WhatsApp
  const formatUrlForWhatsApp = (url: string) => {
    // WhatsApp needs http:// or https:// prefix to recognize URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`
    }
    return url
  }
  
  const generateJobMessage = (platform: string) => {
    // Create tracking URL with UTM parameters for better analytics
    const trackingUrl = `${jobUrl}?utm_source=${platform}&utm_medium=social&utm_campaign=job_sharing`
    
    const baseMessage = `🚀 Job Opportunity: ${job.title}

🏢 Company: ${job.company_name || 'Our Company'}
💼 Department: ${job.department_name}
💰 Salary: ₹${job.min_salary?.toLocaleString()} - ₹${job.max_salary?.toLocaleString()}
📍 Work Mode: ${job.work_mode || 'Office'}
⏰ Type: ${job.employment_type?.replace('_', ' ') || 'Full Time'}

${job.description?.substring(0, 200)}...`

    switch (platform) {
      case 'whatsapp':
        return `${baseMessage}

*Apply now:* ${formatUrlForWhatsApp(trackingUrl)}

#JobOpening #Hiring #Career`
      case 'linkedin':
        return `${baseMessage}

🔗 Apply now: ${trackingUrl}

#JobOpening #Hiring #${job.department_name} #Career #Opportunity`
      case 'facebook':
        return `${baseMessage}

🔗 Apply now: ${trackingUrl}

#JobOpening #Hiring #${job.department_name} #Career #Jobs`
      case 'twitter':
        return `🚀 ${job.title} at ${job.company_name || 'Our Company'}

💰 ₹${job.min_salary?.toLocaleString()} - ₹${job.max_salary?.toLocaleString()}
📍 ${job.work_mode || 'Office'}

🔗 Apply: ${trackingUrl}

#JobOpening #Hiring #Career`
      case 'instagram':
        return `🚀 We're Hiring! ${job.title}

🏢 ${job.company_name || 'Our Company'}
💼 ${job.department_name}
💰 ₹${job.min_salary?.toLocaleString()} - ₹${job.max_salary?.toLocaleString()}
📍 ${job.work_mode || 'Office'}

${job.description?.substring(0, 150)}...

🔗 Apply now: ${trackingUrl}

#JobOpening #Hiring #${job.department_name} #Career #Jobs #Opportunity`
      case 'telegram':
        return `${baseMessage}

🔗 Apply now: ${trackingUrl}

#JobOpening #Hiring #Career #Jobs`
      case 'email':
        return `Subject: Job Opportunity - ${job.title}

${baseMessage}

Apply now: ${trackingUrl}`
      default:
        return `${baseMessage}

🔗 Apply now: ${trackingUrl}`
    }
  }

  const shareToWhatsApp = () => {
    const message = customMessage || generateJobMessage('whatsapp')
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    trackShare('whatsapp')
    toast.success('Opening WhatsApp...')
    onClose()
  }

  const shareToLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`
    window.open(linkedinUrl, '_blank')
    trackShare('linkedin')
    toast.success('Opening LinkedIn...')
    onClose()
  }

  const shareViaEmail = () => {
    const message = customMessage || generateJobMessage('email')
    const subject = `Job Opportunity - ${job.title}`
    const body = message.replace('Subject: Job Opportunity - ' + job.title + '\n\n', '')
    
    // Directly copy to clipboard (no mailto: attempt)
    const emailContent = `Subject: ${subject}\n\n${body}`
    navigator.clipboard.writeText(emailContent)
    trackShare('email')
    toast.success('Email content copied to clipboard! Paste it in your email app.')
    onClose()
  }

  const shareViaGmail = () => {
    const message = customMessage || generateJobMessage('email')
    const subject = `Job Opportunity - ${job.title}`
    const body = message.replace('Subject: Job Opportunity - ' + job.title + '\n\n', '')
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(gmailUrl, '_blank')
    trackShare('gmail')
    toast.success('Opening Gmail...')
    onClose()
  }

  const shareViaOutlook = () => {
    const message = customMessage || generateJobMessage('email')
    const subject = `Job Opportunity - ${job.title}`
    const body = message.replace('Subject: Job Opportunity - ' + job.title + '\n\n', '')
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(outlookUrl, '_blank')
    trackShare('outlook')
    toast.success('Opening Outlook...')
    onClose()
  }

  const shareToFacebook = () => {
    const message = customMessage || generateJobMessage('facebook')
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobUrl)}&quote=${encodeURIComponent(message)}`
    window.open(facebookUrl, '_blank')
    trackShare('facebook')
    toast.success('Opening Facebook...')
    onClose()
  }

  const shareToTwitter = () => {
    const message = customMessage || generateJobMessage('twitter')
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(jobUrl)}&hashtags=JobOpening,Hiring,Career`
    window.open(twitterUrl, '_blank')
    trackShare('twitter')
    toast.success('Opening Twitter...')
    onClose()
  }

  const shareToInstagram = () => {
    const message = customMessage || generateJobMessage('instagram')
    navigator.clipboard.writeText(message)
    trackShare('instagram')
    toast.success('Instagram post content copied! Open Instagram app and paste.')
    onClose()
  }

  const shareToTelegram = () => {
    const message = customMessage || generateJobMessage('telegram')
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(jobUrl)}&text=${encodeURIComponent(message)}`
    window.open(telegramUrl, '_blank')
    trackShare('telegram')
    toast.success('Opening Telegram...')
    onClose()
  }

  const copyJobLink = () => {
    navigator.clipboard.writeText(jobUrl)
    trackShare('copy_link')
    toast.success('Job link copied to clipboard!')
    onClose()
  }

  const applyTemplate = (template: any) => {
    setCustomMessage(template.template_content)
    setActiveTab('share')
    toast.success(`Applied template: ${template.name}`)
  }

  const handleBulkShare = () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }
    
    selectedPlatforms.forEach((platform, index) => {
      const platformAction = platforms.find(p => p.id === platform)?.action
      if (platformAction) {
        setTimeout(() => platformAction(), index * 1000) // Stagger the shares
      }
    })
    
    toast.success(`Sharing to ${selectedPlatforms.length} platforms...`)
  }

  const createTemplate = async (name: string, content: string, type: string) => {
    try {
      await api.post('/api/hr/share-analytics/templates/', {
        name,
        template_content: content,
        template_type: type,
        session_key: sessionKey
      })
      fetchTemplates()
      toast.success('Template created successfully!')
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Failed to create template')
    }
  }

  const deleteTemplate = async (templateId: number) => {
    try {
      await api.delete(`/api/hr/share-analytics/templates/${templateId}/`, {
        params: { session_key: sessionKey }
      })
      fetchTemplates()
      toast.success('Template deleted successfully!')
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const platforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white',
      action: shareToWhatsApp
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      action: shareToLinkedIn
    },
    {
      id: 'gmail',
      name: 'Gmail',
      icon: AtSign,
      color: 'bg-red-500 hover:bg-red-600',
      textColor: 'text-white',
      action: shareViaGmail
    },
    {
      id: 'outlook',
      name: 'Outlook',
      icon: Mail,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-white',
      action: shareViaOutlook
    },
    {
      id: 'email',
      name: 'Other Email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-700',
      textColor: 'text-white',
      action: shareViaEmail
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      action: shareToFacebook
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-black hover:bg-gray-800',
      textColor: 'text-white',
      action: shareToTwitter
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      textColor: 'text-white',
      action: shareToInstagram
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: Send,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-white',
      action: shareToTelegram
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: Link,
      color: 'bg-gray-500 hover:bg-gray-600',
      textColor: 'text-white',
      action: copyJobLink
    }
  ]

  const tabs = [
    { id: 'share', label: 'Share Job', icon: Share2 },
    { id: 'bulk', label: 'Bulk Share', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'templates', label: 'Templates', icon: FileText }
  ]

  const renderShareTab = () => (
    <div>
      {/* Platform Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {platforms.map((platform) => {
          const Icon = platform.icon
          return (
            <button
              key={platform.id}
              onClick={platform.action}
              className={`${platform.color} ${platform.textColor} p-4 rounded-xl flex flex-col items-center space-y-2 transition-all hover:scale-105 shadow-lg`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{platform.name}</span>
            </button>
          )
        })}
      </div>

      {/* Message Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Message Preview
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomEditor(!showCustomEditor)}
          >
            {showCustomEditor ? 'Hide Editor' : 'Customize Message'}
          </Button>
        </div>

        {showCustomEditor ? (
          <textarea
            value={customMessage || generateJobMessage('whatsapp')}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            placeholder="Customize your message..."
          />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
              {generateJobMessage('whatsapp')}
            </pre>
          </div>
        )}
      </div>
    </div>
  )

  const renderBulkShareTab = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-700 mb-3">Select Platforms</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {platforms.slice(0, -1).map((platform) => {
            const Icon = platform.icon
            const isSelected = selectedPlatforms.includes(platform.id)
            
            return (
              <button
                key={platform.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedPlatforms(prev => prev.filter(p => p !== platform.id))
                  } else {
                    setSelectedPlatforms(prev => [...prev, platform.id])
                  }
                }}
                className={`${platform.color} ${platform.textColor} p-3 rounded-lg flex flex-col items-center space-y-1 transition-all relative ${
                  isSelected ? 'ring-2 ring-white ring-offset-2' : 'opacity-70'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{platform.name}</span>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-700 mb-2">Bulk Message</h4>
        <textarea
          value={bulkMessage || generateJobMessage('whatsapp')}
          onChange={(e) => setBulkMessage(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="Customize message for bulk sharing..."
        />
      </div>
      
      <Button
        onClick={handleBulkShare}
        disabled={selectedPlatforms.length === 0}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
      >
        <Send className="w-4 h-4 mr-2" />
        Share to {selectedPlatforms.length} Selected Platforms
      </Button>
    </div>
  )

  const renderAnalyticsTab = () => (
    <div>
      {analytics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.total_shares || 0}</div>
              <div className="text-sm text-gray-600">Total Shares</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.total_clicks || 0}</div>
              <div className="text-sm text-gray-600">Total Clicks</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{analytics.total_applications || 0}</div>
              <div className="text-sm text-gray-600">Applications</div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-700 mb-3">Platform Performance</h5>
            <div className="space-y-2">
              {analytics.platform_stats?.map((stat: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                  <span className="text-sm font-medium capitalize">{stat.platform}</span>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{stat.shares} shares</span>
                    <span>{stat.clicks} clicks</span>
                    <span>{stat.applications} apps</span>
                  </div>
                </div>
              )) || <div className="text-sm text-gray-500 text-center py-4">No analytics data available</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">Loading analytics...</div>
      )}
    </div>
  )

  const renderTemplatesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-700">Message Templates</h4>
        <Button
          size="sm"
          onClick={() => {
            const name = prompt('Template name:')
            const content = prompt('Template content:')
            if (name && content) {
              createTemplate(name, content, 'job_posting')
            }
          }}
          className="flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {templates.length > 0 ? templates.map((template) => (
          <div key={template.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h5 className="font-medium text-gray-700">{template.name}</h5>
                <span className="text-xs text-gray-500 capitalize">{template.template_type}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyTemplate(template)}
                >
                  Use
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteTemplate(template.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-xs">
              {template.template_content.substring(0, 150)}...
            </div>
          </div>
        )) : (
          <div className="text-center py-8 text-gray-500">
            No templates found. Create your first template!
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Share Job Posting
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {job.title} - {job.department_name}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'share' && renderShareTab()}
          {activeTab === 'bulk' && renderBulkShareTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default JobShareModal