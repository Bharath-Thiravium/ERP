import React from 'react'
import { Calendar } from 'lucide-react'

interface FinancialYearFilterProps {
  selectedYear: string
  onYearChange: (year: string) => void
  availableYears?: string[]
}

const FinancialYearFilter: React.FC<FinancialYearFilterProps> = ({
  selectedYear,
  onYearChange,
  availableYears
}) => {
  // Generate default years if not provided (last 5 years + next 2 years)
  const defaultYears = availableYears || (() => {
    const currentYear = new Date().getFullYear()
    const years: string[] = []
    for (let i = -5; i <= 2; i++) {
      const year = currentYear + i
      const nextYear = year + 1
      years.push(`${year}-${nextYear.toString().slice(-2)}`)
    }
    return years.reverse()
  })()

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        FY:
      </label>
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[120px]"
      >
        <option value="">All Years</option>
        {defaultYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}

export default FinancialYearFilter
