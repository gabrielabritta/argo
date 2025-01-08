import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CProgress,
  CBadge,
} from '@coreui/react'

// Importar os componentes existentes
import CameraMonitoring from '../camera/CameraMonitoring'
import LocationMonitoring from '../location/LocationMonitoring'

const RoverInspection = () => {
  const { roverId } = useParams()
  const [activeTab, setActiveTab] = useState('info')
  const [roverInfo, setRoverInfo] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRoverData = async () => {
      setLoading(true)
      try {
        // Buscar informações do rover
        const response = await fetch(`http://localhost:8000/api/rovers/${roverId}/`)
        const data = await response.json()
        setRoverInfo(data)
        setError(null)
      } catch (err) {
        setError('Falha ao carregar dados do rover')
        console.error('Error:', err)
      }
      setLoading(false)
    }

    fetchRoverData()
  }, [roverId])

  // Efeito para buscar telemetria em tempo real
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/sensor-data/?rover=${roverId}`)
        const data = await response.json()
        setTelemetry(data)
      } catch (err) {
        console.error('Error fetching telemetry:', err)
      }
    }

    fetchTelemetry()
    const interval = setInterval(fetchTelemetry, 5000)
    return () => clearInterval(interval)
  }, [roverId])

  if (loading) {
    return (
      <div className="text-center mt-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <h4>Inspeção do Rover: {roverInfo?.name}</h4>
        </CCardHeader>
        <CCardBody>
          {error && (
            <CAlert color="danger" dismissible>
              {error}
            </CAlert>
          )}

          <CNav variant="tabs" className="mb-4">
            <CNavItem>
              <CNavLink
                active={activeTab === 'info'}
                onClick={() => setActiveTab('info')}
                style={{ cursor: 'pointer' }}
              >
                Informações
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'camera'}
                onClick={() => setActiveTab('camera')}
                style={{ cursor: 'pointer' }}
              >
                Câmera
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'location'}
                onClick={() => setActiveTab('location')}
                style={{ cursor: 'pointer' }}
              >
                Localização
              </CNavLink>
            </CNavItem>
          </CNav>

          <CTabContent>
            <CTabPane visible={activeTab === 'info'}>
              <CRow>
                <CCol md={6}>
                  <h5>Detalhes do Rover</h5>
                  <table className="table">
                    <tbody>
                      <tr>
                        <th>ID</th>
                        <td>{roverInfo?.identifier}</td>
                      </tr>
                      <tr>
                        <th>Modelo</th>
                        <td>{roverInfo?.model}</td>
                      </tr>
                      <tr>
                        <th>Subestação</th>
                        <td>{roverInfo?.substation}</td>
                      </tr>
                      <tr>
                        <th>Status</th>
                        <td>
                          <CBadge color={roverInfo?.is_active ? 'success' : 'danger'}>
                            {roverInfo?.is_active ? 'Ativo' : 'Inativo'}
                          </CBadge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CCol>

                <CCol md={6}>
                  <h5>Telemetria em Tempo Real</h5>
                  {telemetry ? (
                    <div>
                      <div className="mb-3">
                        <div className="text-medium-emphasis small mb-1">Bateria</div>
                        <CProgress thin color="success" value={telemetry.battery}>
                          {telemetry.battery}%
                        </CProgress>
                      </div>

                      <div className="mb-3">
                        <div className="text-medium-emphasis small mb-1">Temperatura</div>
                        <CProgress thin color="warning" value={telemetry.temperature}>
                          {telemetry.temperature}°C
                        </CProgress>
                      </div>

                      <div className="mb-3">
                        <div className="text-medium-emphasis small mb-1">Velocidade</div>
                        <CProgress thin color="info" value={telemetry.speed}>
                          {telemetry.speed} km/h
                        </CProgress>
                      </div>
                    </div>
                  ) : (
                    <div className="text-medium-emphasis">Carregando dados de telemetria...</div>
                  )}
                </CCol>
              </CRow>
            </CTabPane>

            <CTabPane visible={activeTab === 'camera'}>
              <CameraMonitoring roverId={roverId} />
            </CTabPane>

            <CTabPane visible={activeTab === 'location'}>
              <LocationMonitoring roverId={roverId} />
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>
    </>
  )
}

export default RoverInspection
