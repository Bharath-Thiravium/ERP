import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Card variant="elevated" className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          {/* 404 Illustration */}
          <div className="text-6xl mb-6">🔍</div>
          
          {/* Error Message */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            404
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              className="flex-1"
            >
              Go Back
            </Button>
            <Button
              onClick={() => navigate('/')}
              icon={<Home className="h-4 w-4" />}
              className="flex-1"
            >
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotFoundPage
