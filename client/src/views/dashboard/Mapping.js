import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'

const Mapping = () => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [waitingMapping, setWaitingMapping] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Função para buscar dados do mapeamento
  const fetchMappingData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/mapping/')
      const data = await response.json()

      if (data.status === 'waiting') {
        setWaitingMapping(true)
        setImageLoaded(false)
      } else if (data.image) {
        setImageSrc(`data:image/png;base64,${data.image}`)
        setImageLoaded(true)
        setWaitingMapping(false)
      } else {
        throw new Error('Dados do mapeamento incompletos')
      }
    } catch (error) {
      console.error('Erro ao carregar dados do mapeamento:', error)
      setWaitingMapping(true)
      setImageLoaded(false)
      setToastMessage('Erro ao carregar mapeamento')
      setToastVisible(true)
    }
  }

  useEffect(() => {
    // Busca inicial
    fetchMappingData()

    // Configurar polling a cada 1 minuto
    const interval = setInterval(() => {
      fetchMappingData()
    }, 60000) // 60000 ms = 1 minuto

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <CCard style={{ maxWidth: '960px', margin: '0 auto' }}>
        <CCardHeader>Mapeamento</CCardHeader>
        <CCardBody style={{ position: 'relative', padding: 0 }}>
          {imageLoaded ? (
            <img src={imageSrc} alt="Mapeamento" style={{ width: '100%', height: 'auto' }} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '0',
                paddingTop: '56.25%', // Aspect ratio 16:9
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
                {waitingMapping ? 'Esperando por mapeamento...' : 'Carregando...'}
              </div>
            </div>
          )}
        </CCardBody>
      </CCard>

      <CToaster
        position="top-right"
        style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 9999 }}
      >
        {toastVisible && (
          <CToast
            autohide={true}
            delay={3000}
            visible={toastVisible}
            onClose={() => setToastVisible(false)}
          >
            <CToastHeader closeButton>Notificação</CToastHeader>
            <CToastBody>{toastMessage}</CToastBody>
          </CToast>
        )}
      </CToaster>
    </>
  )
}

export default Mapping
