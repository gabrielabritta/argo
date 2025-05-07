import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CButton,
  CButtonGroup,
} from '@coreui/react'
import RoverPathVisualizer from '../../components/RoverPathVisualizer'

const Missoes = () => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [visualizerSize, setVisualizerSize] = useState({ width: 800, height: 600 })

  // Handle window resize to make the visualizer responsive
  React.useEffect(() => {
    const handleResize = () => {
      const cardBody = document.querySelector('.card-body-visualizer')
      if (cardBody) {
        const width = Math.min(cardBody.clientWidth - 30, 1200)
        setVisualizerSize({ width, height: width * 0.75 })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLocationSelect = async (x, y) => {
    if (loading) return

    setLoading(true)
    setMessage('')
    setError('')

    try {
      // Convert the world coordinates to the format expected by the backend
      const response = await fetch(`http://localhost:8000/api/iniciar-missao/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y }),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
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
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Missões</strong> <small>Visualização de Rotas do Rover</small>
              </div>
              <CButton color="primary" size="sm">Rover 1</CButton>
            </CCardHeader>
            <CCardBody className="card-body-visualizer">
              <p className="text-medium-emphasis small">
                Clique em qualquer ponto do mapa para definir o destino da missão. O sistema calculará a rota ideal para o rover.
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

              <div className="position-relative d-flex justify-content-center">
                <RoverPathVisualizer
                  width={visualizerSize.width}
                  height={visualizerSize.height}
                  onLocationSelect={handleLocationSelect}
                />
                
                {loading && (
                  <div className="position-absolute top-50 start-50 translate-middle" style={{ zIndex: 10 }}>
                    <div className="bg-white p-3 rounded shadow-sm">
                      <CSpinner color="primary" />
                      <p className="mt-2 mb-0">Calculando rota...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <h5>Informações da Missão</h5>
                <div className="card bg-light mb-3">
                  <div className="card-header">Rover 1</div>
                  <div className="card-body">
                    <p className="card-text">
                      <strong>Status:</strong> Em missão<br />
                      <strong>Posição atual:</strong> (-165.98, -96.13)<br />
                      <strong>Destino:</strong> (-101.98, 8.19)<br />
                      <strong>Distância:</strong> 127.32m<br />
                      <strong>Tempo estimado:</strong> 4min 24s
                    </p>
                  </div>
                </div>
                <div className="card bg-primary text-white mb-3">
                  <div className="card-header">Detalhes da Rota</div>
                  <div className="card-body">
                    <p className="card-text">
                      <strong>Origem:</strong> ls_pr1_1<br />
                      <strong>Destino:</strong> b_busip4_1<br />
                      <strong>Pontos de passagem:</strong> 17<br />
                      <strong>Obstáculos evitados:</strong> 4
                    </p>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Missoes
