import React, { useState } from 'react'
import { Filter, X, Search } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent } from '../../../../../components/ui/Card'

interface AdvancedFiltersProps {
  onFiltersChange: (filters: any) => void
  jobPostings: any[]
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ onFiltersChange, jobPostings }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    job_posting: '',
    ai_score_min: '',
    ai_score_max: '',
    date_from: '',
    date_to: '',
    skill_match_min: ''
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters = {
      search: '',
      status: '',
      job_posting: '',
      ai_score_min: '',
      ai_score_max: '',
      date_from: '',
      date_to: '',
      skill_match_min: ''
    }
    setFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

  return (
    <div className="space-y-4">
      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Advanced Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {Object.values(filters).filter(v => v !== '').length}
            </span>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Candidate
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Name, email, phone..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Application Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Job Posting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Position
                </label>
                <select
                  value={filters.job_posting}
                  onChange={(e) => handleFilterChange('job_posting', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Positions</option>
                  {jobPostings.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Score Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Score Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={filters.ai_score_min}
                    onChange={(e) => handleFilterChange('ai_score_min', e.target.value)}
                    placeholder="Min"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    type="number"
                    value={filters.ai_score_max}
                    onChange={(e) => handleFilterChange('ai_score_max', e.target.value)}
                    placeholder="Max"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Application Date From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Application Date To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Skill Match */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Skill Match %
                </label>
                <input
                  type="number"
                  value={filters.skill_match_min}
                  onChange={(e) => handleFilterChange('skill_match_min', e.target.value)}
                  placeholder="e.g. 70"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdvancedFilters