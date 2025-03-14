import React, { useState, useRef, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CSpinner,
} from '@coreui/react'

const Missoes = () => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    // Carregar a imagem quando o componente for montado
    const img = new Image()
    img.src = '/mapaNovo.png' // Caminho para a imagem estática
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0, img.width, img.height)
    }
    img.onerror = () => {
      setError('Erro ao carregar a imagem do mapa')
    }
  }, [])

  const handleCanvasClick = (e) => {
    if (!imageLoaded || loading) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Desenhar um círculo no ponto clicado
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, 2 * Math.PI)
    ctx.fillStyle = 'red'
    ctx.fill()

    // Enviar as coordenadas para o backend
    enviarCoordenadas(x, y)
  }

  const enviarCoordenadas = async (x, y) => {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      // Usar o mesmo padrão de chamada que funciona em outros componentes
      const response = await fetch(`http://localhost:8000/api/iniciar-missao/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y }),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json()
      setMessage(data.message)
    } catch (err) {
      console.error('Erro ao enviar coordenadas:', err)
      setError('Erro de conexão com o servidor: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Missões</strong> <small>Selecione um ponto no mapa para iniciar uma missão</small>
            </CCardHeader>
            <CCardBody>
              <p className="text-medium-emphasis small">
                Clique em qualquer ponto do mapa para definir o destino da missão.
              </p>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {message && (
                <div className="alert alert-success" role="alert">
                  {message}
                </div>
              )}

              <div className="position-relative">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  style={{
                    border: '1px solid #ccc',
                    cursor: loading ? 'wait' : 'crosshair',
                    maxWidth: '100%'
                  }}
                />

                {!imageLoaded && (
                  <div className="position-absolute top-50 start-50 translate-middle">
                    <CSpinner color="primary" />
                  </div>
                )}
              </div>

              {loading && (
                <div className="mt-3 text-center">
                  <CSpinner color="primary" />
                  <p className="mt-2">Processando solicitação...</p>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Missoes
