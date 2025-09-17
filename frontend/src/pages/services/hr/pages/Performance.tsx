import React from 'react'
import { TrendingUp, Award } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent } from '../../../../components/ui/Card'

interface PerformanceProps {
  sessionKey: string
}

const Performance: React.FC<PerformanceProps> = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Performance Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track employee performance, conduct reviews, and manage goals
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardContent className="p-6">
          <div className="text-center">
            <TrendingUp className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Performance Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Advanced performance tracking with goal setting and review management
            </p>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              <Award className="w-4 h-4 mr-2" />
              Start Performance Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Performance