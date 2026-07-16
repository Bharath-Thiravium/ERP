import React, { useRef, useState } from 'react'
import { Upload, FileImage, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import apiClient from '../../../../lib/api'

interface OCRResult {
  fields: Record<string, string>
  ocr_confidence: number
  low_confidence_fields: string[]
}

interface Props {
  onExtracted: (result: OCRResult) => void
}

const PTWOCRUpload: React.FC<Props> = ({ onExtracted }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setConfidence(null)

    const allowed = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Unsupported file type. Please upload JPEG, PNG, TIFF, BMP, or WebP.')
      return
    }

    setPreview(URL.createObjectURL(file))
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await apiClient.post<OCRResult>('/api/ptw/permits/ocr-extract/', formData)
      const result = response.data
      setConfidence(result.ocr_confidence)
      onExtracted(result)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'OCR processing failed. Please try a clearer image.')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const clearPreview = () => {
    setPreview(null)
    setConfidence(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mb-6">
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
          ${loading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'}
          dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-gray-800`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !loading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/tiff,image/bmp,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-blue-600">Extracting fields from document...</p>
            <p className="text-xs text-gray-500">This may take a few seconds</p>
          </div>
        ) : preview ? (
          <div className="flex items-center gap-4">
            <img src={preview} alt="PTW document" className="h-20 w-20 object-cover rounded-lg border" />
            <div className="flex-1 text-left">
              {confidence !== null && (
                <div className="flex items-center gap-2 mb-1">
                  {confidence >= 70 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className={`text-sm font-medium ${confidence >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                    OCR Confidence: {confidence}%
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500">Form fields have been auto-populated below. Review and edit as needed.</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearPreview() }}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="flex items-center gap-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <FileImage className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload PTW Document Image
            </p>
            <p className="text-xs text-gray-500">
              Drag & drop or click to upload · JPEG, PNG, TIFF, BMP, WebP
            </p>
            <p className="text-xs text-blue-500 font-medium">
              Fields will be auto-populated from the scanned document
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

export default PTWOCRUpload
