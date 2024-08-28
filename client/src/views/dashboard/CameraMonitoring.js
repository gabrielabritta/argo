import React, { useState, useEffect } from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

const CameraMonitoring = () => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const checkCameraConnection = () => {
    const img = new Image()
    img.src = 'http://localhost:8000/api/camera-feed/'

    img.onload = () => {
      setImageLoaded(true)
    }

    img.onerror = () => {
      setImageLoaded(false)
      setReconnectAttempts((prev) => prev + 1)
    }
  }

  useEffect(() => {
    checkCameraConnection()
    const interval = setInterval(() => {
      checkCameraConnection()
    }, 5000) // tenta reconectar a cada 5 segundos

    return () => clearInterval(interval)
  }, [])

  return (
    <CCard>
      <CCardHeader>Monitoramento de Câmera</CCardHeader>
      <CCardBody style={{ position: 'relative', padding: 0 }}>
        {imageLoaded ? (
          <img
            src="http://localhost:8000/api/camera-feed/"
            alt="Camera"
            style={{ width: '100%', height: 'auto' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '0',
              paddingTop: '56.25%',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0f0f0',
              color: '#000',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '1.5rem',
                textAlign: 'center',
              }}
            >
              Esperando por conexão da câmera...
            </div>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default CameraMonitoring
