import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import toast from 'react-hot-toast'

const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100, 'Name too long'),
  description: z.string().optional()
})

type DepartmentFormData = z.infer<typeof departmentSchema>

interface DepartmentFormProps {
  department?: any
  onClose: () => void
  onSuccess: () => void
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({ department, onClose, onSuccess }) => {
  const { sessionKey } = useServiceUserStore()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: department?.name || '',
      description: department?.description || ''
    }
  })

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      if (department) {
        await apiClient.put(`/hr/departments/${department.id}/?session_key=${sessionKey}`, data)
        toast.success('Department updated successfully')
      } else {
        await apiClient.post(`/hr/departments/?session_key=${sessionKey}`, data)
        toast.success('Department created successfully')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save department')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {department ? 'Edit Department' : 'Add Department'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Name *
            </label>
            <input
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter department name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter department description"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : department ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DepartmentForm