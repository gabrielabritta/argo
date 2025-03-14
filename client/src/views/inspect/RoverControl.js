import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CProgress,
  CSpinner,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowTop,
  cilArrowBottom,
  cilArrowLeft,
  cilArrowRight,
  cilMediaStop,
  cilCameraControl,
  cilLocationPin,
  cilSpeedometer,
  cilBattery5,
  cilSettings,
} from '@coreui/icons'

const RoverControl = () => {
  const { substationId, roverId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rover, setRover] = useState(null)
  const [activeTab, setActiveTab] = useState(1)
  const [speed, setSpeed] = useState(0)
  const [batteryLevel, setBatteryLevel] = useState(0)
  const [temperature, setTemperature] = useState(0)
  const [cameraFeed, setCameraFeed] = useState(null)

  useEffect(() => {
    // Simular carregamento de dados da API
    const fetchRoverDetails = async () => {
      try {
        // Em um ambiente real, isso seria uma chamada à API
        // const response = await fetch(`http://localhost:8000/api/rovers/${roverId}/`)
        // const data = await response.json()

        // Dados simulados do rover
        const mockRover = {
          id: parseInt(roverId),
          name: `Rover ${['Alpha', 'Beta', 'Gamma'][parseInt(roverId) - 1] || 'Desconhecido'}`,
          model: `Argo-N-${parseInt(roverId) % 2}`,
          status: ['active', 'charging', 'maintenance'][parseInt(roverId) - 1] || 'active',
          batteryLevel: [78, 42, 65][parseInt(roverId) - 1] || 50,
          temperature: [32, 28, 35][parseInt(roverId) - 1] || 30,
          speed: 0,
          location: ['Setor Norte', 'Estação de Carregamento', 'Setor Sul'][parseInt(roverId) - 1] || 'Desconhecido',
          lastMission: '2024-10-15 14:32:45',
          sensors: {
            camera: 'ok',
            gps: 'ok',
            temperature: parseInt(roverId) === 1 ? 'warning' : 'ok',
            proximity: 'ok',
          },
        }

        setRover(mockRover)
        setBatteryLevel(mockRover.batteryLevel)
        setTemperature(mockRover.temperature)
        setLoading(false)

        // Simular feed de câmera
        setCameraFeed(`https://picsum.photos/800/600?random=${roverId}`)
      } catch (error) {
        console.error('Erro ao carregar detalhes do rover:', error)
        setLoading(false)
      }
    }

    fetchRoverDetails()

    // Simular atualizações de telemetria
    const telemetryInterval = setInterval(() => {
      if (!loading) {
        // Pequenas flutuações aleatórias nos valores
        setBatteryLevel(prev => Math.max(0, Math.min(100, prev + (Math.random() * 0.4 - 0.2))))
        setTemperature(prev => Math.max(20, Math.min(45, prev + (Math.random() * 0.6 - 0.3))))
      }
    }, 3000)

    return () => clearInterval(telemetryInterval)
  }, [roverId, loading])

  // Funções de controle do rover
  const handleMove = (direction) => {
    // Em um ambiente real, isso enviaria comandos para a API
    console.log(`Movendo rover ${roverId} na direção: ${direction}`)

    // Simular mudança de velocidade
    if (direction === 'stop') {
      setSpeed(0)
    } else {
      setSpeed(prev => Math.min(10, prev + 2))

      // Simular consumo de bateria
      setBatteryLevel(prev => Math.max(0, prev - 0.1))
    }
  }

  const handleMissionStart = (missionType) => {
    // Em um ambiente real, isso enviaria comandos para a API
    console.log(`Iniciando missão ${missionType} para o rover ${roverId}`)

    // Simular feedback visual
    alert(`Missão ${missionType} iniciada com sucesso!`)
  }

  const getBatteryColor = (level) => {
    if (level > 60) return 'success'
    if (level > 30) return 'warning'
    return 'danger'
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Controle do {rover.name}</strong>
              <small className="ms-2">Modelo: {rover.model}</small>
            </div>
            <CButton
              color="primary"
              size="sm"
              onClick={() => navigate(`/inspect/substation/${substationId}`)}
            >
              Voltar à Subestação
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={4}>
              <div className="mb-3">
                <h5>Status do Rover</h5>
                <div className="d-flex justify-content-between mb-2">
                  <span>Bateria:</span>
                  <div className="d-flex align-items-center" style={{ width: '60%' }}>
                    <CProgress
                      thin
                      className="flex-grow-1 me-2"
                      color={getBatteryColor(batteryLevel)}
                      value={batteryLevel}
                    />
                    <div className="small text-medium-emphasis">{batteryLevel.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Temperatura:</span>
                  <div className="d-flex align-items-center" style={{ width: '60%' }}>
                    <CProgress
                      thin
                      className="flex-grow-1 me-2"
                      color={temperature > 40 ? 'danger' : temperature > 35 ? 'warning' : 'success'}
                      value={(temperature / 50) * 100}
                    />
                    <div className="small text-medium-emphasis">{temperature.toFixed(1)}°C</div>
                  </div>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Velocidade:</span>
                  <div className="d-flex align-items-center" style={{ width: '60%' }}>
                    <CProgress
                      thin
                      className="flex-grow-1 me-2"
                      color="info"
                      value={(speed / 10) * 100}
                    />
                    <div className="small text-medium-emphasis">{speed} km/h</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h5>Controles de Movimento</h5>
                <div className="d-flex flex-column align-items-center mt-3">
                  <CButton
                    color="primary"
                    className="mb-2"
                    style={{ width: '60px' }}
                    onClick={() => handleMove('forward')}
                  >
                    <CIcon icon={cilArrowTop} size="lg" />
                  </CButton>
                  <div className="d-flex justify-content-between" style={{ width: '180px' }}>
                    <CButton
                      color="primary"
                      style={{ width: '60px' }}
                      onClick={() => handleMove('left')}
                    >
                      <CIcon icon={cilArrowLeft} size="lg" />
                    </CButton>
                    <CButton
                      color="danger"
                      style={{ width: '60px' }}
                      onClick={() => handleMove('stop')}
                    >
                      <CIcon icon={cilMediaStop} size="lg" />
                    </CButton>
                    <CButton
                      color="primary"
                      style={{ width: '60px' }}
                      onClick={() => handleMove('right')}
                    >
                      <CIcon icon={cilArrowRight} size="lg" />
                    </CButton>
                  </div>
                  <CButton
                    color="primary"
                    className="mt-2"
                    style={{ width: '60px' }}
                    onClick={() => handleMove('backward')}
                  >
                    <CIcon icon={cilArrowBottom} size="lg" />
                  </CButton>
                </div>
              </div>

              <div className="mt-4">
                <h5>Missões Pré-programadas</h5>
                <div className="d-grid gap-2 mt-2">
                  <CButton color="success" onClick={() => handleMissionStart('Inspeção Completa')}>
                    Inspeção Completa
                  </CButton>
                  <CButton color="info" onClick={() => handleMissionStart('Inspeção Perimetral')}>
                    Inspeção Perimetral
                  </CButton>
                  <CButton color="warning" onClick={() => handleMissionStart('Verificação de Equipamentos')}>
                    Verificação de Equipamentos
                  </CButton>
                </div>
              </div>
            </CCol>

            <CCol md={8}>
              <CNav variant="tabs" role="tablist">
                <CNavItem>
                  <CNavLink
                    active={activeTab === 1}
                    onClick={() => setActiveTab(1)}
                  >
                    <CIcon icon={cilCameraControl} className="me-2" />
                    Câmera
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 2}
                    onClick={() => setActiveTab(2)}
                  >
                    <CIcon icon={cilLocationPin} className="me-2" />
                    Localização
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 3}
                    onClick={() => setActiveTab(3)}
                  >
                    <CIcon icon={cilSettings} className="me-2" />
                    Configurações
                  </CNavLink>
                </CNavItem>
              </CNav>

              <CTabContent className="p-3 border border-top-0 rounded-bottom">
                <CTabPane role="tabpanel" visible={activeTab === 1}>
                  <div className="camera-feed-container">
                    <h5>Feed da Câmera</h5>
                    {cameraFeed ? (
                      <div className="position-relative">
                        <img
                          src={cameraFeed}
                          alt="Feed da câmera do rover"
                          className="img-fluid rounded"
                          style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'cover' }}
                        />
                        <div className="position-absolute top-0 start-0 p-2 bg-dark bg-opacity-50 text-white rounded">
                          <small>Rover {rover.name} • {new Date().toLocaleTimeString()}</small>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-5 bg-light rounded">
                        <p>Feed de câmera não disponível</p>
                      </div>
                    )}

                    <div className="d-flex justify-content-between mt-3">
                      <CButton color="dark" size="sm">
                        Tirar Foto
                      </CButton>
                      <CButton color="danger" size="sm">
                        Iniciar Gravação
                      </CButton>
                      <CButton color="info" size="sm">
                        Alternar Câmera
                      </CButton>
                    </div>
                  </div>
                </CTabPane>

                <CTabPane role="tabpanel" visible={activeTab === 2}>
                  <div className="map-container">
                    <h5>Localização do Rover</h5>
                    <div className="bg-light rounded p-3 text-center" style={{ height: '400px' }}>
                      <p className="mt-5">Mapa de localização do rover na subestação</p>
                      <p><small>Em um ambiente real, aqui seria exibido um mapa detalhado da subestação com a posição atual do rover.</small></p>
                    </div>
                  </div>
                </CTabPane>

                <CTabPane role="tabpanel" visible={activeTab === 3}>
                  <div className="settings-container">
                    <h5>Configurações do Rover</h5>
                    <div className="p-3">
                      <div className="mb-3">
                        <label className="form-label">Velocidade Máxima</label>
                        <select className="form-select">
                          <option>Baixa (2 km/h)</option>
                          <option>Média (5 km/h)</option>
                          <option>Alta (10 km/h)</option>
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Modo de Operação</label>
                        <select className="form-select">
                          <option>Manual</option>
                          <option>Semiautomático</option>
                          <option>Automático</option>
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Intervalo de Telemetria</label>
                        <select className="form-select">
                          <option>1 segundo</option>
                          <option>5 segundos</option>
                          <option>10 segundos</option>
                        </select>
                      </div>

                      <div className="d-grid">
                        <CButton color="primary">Salvar Configurações</CButton>
                      </div>
                    </div>
                  </div>
                </CTabPane>
              </CTabContent>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </>
  )
}

export default RoverControl
