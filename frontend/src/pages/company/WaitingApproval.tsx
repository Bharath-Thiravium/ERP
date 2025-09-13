import React from 'react'
import { Clock, CheckCircle, Mail, Phone, Building2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'

const WaitingApproval: React.FC = () => {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg mb-6">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Pending Approval
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your company information is under review
          </p>
        </div>

        {/* Status Card */}
        <Card variant="elevated" className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span>{user?.company_name}</span>
            </CardTitle>
            <CardDescription>
              Company registration submitted successfully
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status Timeline */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Company Information Submitted
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your detailed company information has been received
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Under Review
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Our team is reviewing your application
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Approval & Access
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You'll receive access once approved
                  </p>
                </div>
              </div>
            </div>

            {/* Information Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Our team will review your company information</li>
                <li>• We may contact you for additional details if needed</li>
                <li>• You'll receive an email notification once approved</li>
                <li>• Approval typically takes 1-2 business days</li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Need help or have questions?
              </h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span>support@athenasap.com</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4" />
                  <span>+1 (555) 123-4567</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Check Status
              </Button>
              
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2025 AthenaSAP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default WaitingApproval
