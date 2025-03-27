import React, { useState, useEffect } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CButton, CFormInput, CAlert } from '@coreui/react'
import { useNavigate } from 'react-router-dom'

const Stream360 = () => {
  const [rtmpUrl, setRtmpUrl] = useState('')
  const [streamKey, setStreamKey] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')

  const generateStreamKey = () => {
    // Gera uma chave de stream aleatória
    const key = Math.random().toString(36).substring(2, 15)
    setStreamKey(key)
    setRtmpUrl(`${import.meta.env.VITE_RTMP_URL}/${key}`)
  }

  const startStream = () => {
    if (!rtmpUrl || !streamKey) {
      setError('Por favor, gere uma chave de stream primeiro')
      return
    }
    setIsStreaming(true)
  }

  const stopStream = () => {
    setIsStreaming(false)
  }

  // Extrai o IP da URL RTMP
  const getPlayerUrl = () => {
    const rtmpUrl = import.meta.env.VITE_RTMP_URL
    const ip = rtmpUrl.split('://')[1].split(':')[0]
    return `http://${ip}:8080/hls/${streamKey}.m3u8`
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Streaming 360° - Insta360 Streammar</strong>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}

            <div className="mb-4">
              <h5>Configuração do Stream</h5>
              <CButton color="primary" className="mb-3" onClick={generateStreamKey}>
                Gerar Nova Chave de Stream
              </CButton>

              {rtmpUrl && (
                <div className="mb-3">
                  <label className="form-label">URL RTMP:</label>
                  <CFormInput
                    type="text"
                    value={rtmpUrl}
                    readOnly
                    className="mb-2"
                  />
                  <CButton
                    color="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(rtmpUrl)}
                  >
                    Copiar URL
                  </CButton>
                </div>
              )}

              {streamKey && (
                <div className="mb-3">
                  <label className="form-label">Chave do Stream:</label>
                  <CFormInput
                    type="text"
                    value={streamKey}
                    readOnly
                    className="mb-2"
                  />
                  <CButton
                    color="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(streamKey)}
                  >
                    Copiar Chave
                  </CButton>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h5>Controles do Stream</h5>
              {!isStreaming ? (
                <CButton color="success" onClick={startStream}>
                  Iniciar Stream
                </CButton>
              ) : (
                <CButton color="danger" onClick={stopStream}>
                  Parar Stream
                </CButton>
              )}
            </div>

            {isStreaming && (
              <div className="mb-4">
                <h5>Visualização 360°</h5>
                <div className="ratio ratio-16x9">
                  <iframe
                    src={getPlayerUrl()}
                    title="Stream 360°"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Stream360 