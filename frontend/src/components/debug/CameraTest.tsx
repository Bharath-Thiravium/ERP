import React, { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CameraTest: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const checkCameraPermission = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser')
        return false
      }

      // Check permission status
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
      console.log('Camera permission status:', permission.state)
      
      if (permission.state === 'denied') {
        toast.error('Camera permission is denied. Please enable it in browser settings.')
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking camera permission:', error)
      return true // Assume permission is available if we can't check
    }
  }

  const startCamera = async () => {
    const hasPermissionCheck = await checkCameraPermission()
    if (!hasPermissionCheck) return

    try {
      console.log('Requesting camera access...')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user'
        },
        audio: false
      })

      console.log('Camera stream obtained:', stream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded')
          videoRef.current?.play()
          setShowCamera(true)
          toast.success('Camera is ready!')
        }

        videoRef.current.onerror = (error) => {
          console.error('Video error:', error)
          toast.error('Error with video stream')
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error)
      setHasPermission(false)
      
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please click "Allow" when prompted.')
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.')
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is being used by another application.')
      } else {
        toast.error(`Camera error: ${error.message}`)
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind)
        track.stop()
      })
      videoRef.current.srcObject = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Video not ready. Please wait...')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      
      // Convert to blob and create download link for testing
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'test-photo.jpg'
          a.click()
          URL.revokeObjectURL(url)
          toast.success('Photo captured and downloaded!')
        }
      }, 'image/jpeg', 0.9)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Camera Test</h2>
      
      <div className="space-y-4">
        <div className="text-sm">
          <p><strong>Permission Status:</strong> {
            hasPermission === null ? 'Unknown' : 
            hasPermission ? 'Granted' : 'Denied'
          }</p>
          <p><strong>Camera Active:</strong> {showCamera ? 'Yes' : 'No'}</p>
        </div>

        {!showCamera ? (
          <button
            onClick={startCamera}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center justify-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </button>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-gray-100 rounded overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Capture
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center justify-center"
              >
                <X className="h-4 w-4 mr-2" />
                Stop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CameraTest