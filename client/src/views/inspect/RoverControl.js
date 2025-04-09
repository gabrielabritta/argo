import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import RoverSimulation from '../../utils/RoverSimulation'
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
  cilMap,
  cilTask,
  cilGraph,
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

  // Referência para a simulação do rover
  const roverSimulationRef = useRef(null)

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

  // Inicializa a simulação do rover quando o componente é montado
  useEffect(() => {
    if (!loading && activeTab === 2) {
      // Inicializa a simulação apenas quando a aba de localização está ativa
      setTimeout(() => {
        const canvas = document.getElementById('rover-simulation-canvas');
        if (canvas) {
          // Ajusta o tamanho do canvas para corresponder ao seu container
          const container = canvas.parentElement;
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;

          // Inicializa a simulação
          roverSimulationRef.current = new RoverSimulation('rover-simulation-canvas');
          roverSimulationRef.current.start();
        }
      }, 100); // Pequeno delay para garantir que o canvas está renderizado
    }

    return () => {
      // Limpa a simulação quando o componente é desmontado
      if (roverSimulationRef.current) {
        roverSimulationRef.current.stop();
      }
    };
  }, [loading, activeTab]);

  // Funções de controle do rover
  const handleMove = (direction) => {
    // Em um ambiente real, isso enviaria comandos para a API
    console.log(`Movendo rover ${roverId} na direção: ${direction}`)

    // Atualiza a simulação do rover
    if (roverSimulationRef.current) {
      roverSimulationRef.current.setControls(direction);
    }

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

    // Simular uma rota para a missão
    if (roverSimulationRef.current) {
      // Resetar a posição do rover para simular o início da missão
      roverSimulationRef.current.resetRover();

      // Adicionar alguns obstáculos para a missão
      roverSimulationRef.current.clearObstacles();

      // Diferentes obstáculos dependendo do tipo de missão
      if (missionType === 'Inspeção Completa') {
        roverSimulationRef.current.addObstacle(2, 1, 1, 0.5);
        roverSimulationRef.current.addObstacle(-1.5, -1, 0.8, 0.8);
        roverSimulationRef.current.addObstacle(1, -2, 0.5, 0.5);
      } else if (missionType === 'Inspeção Perimetral') {
        roverSimulationRef.current.addObstacle(3, 3, 1, 1);
        roverSimulationRef.current.addObstacle(-3, -3, 1, 1);
        roverSimulationRef.current.addObstacle(3, -3, 1, 1);
        roverSimulationRef.current.addObstacle(-3, 3, 1, 1);
      } else {
        roverSimulationRef.current.addObstacle(0, 2, 0.5, 0.5);
        roverSimulationRef.current.addObstacle(2, 0, 0.5, 0.5);
        roverSimulationRef.current.addObstacle(0, -2, 0.5, 0.5);
        roverSimulationRef.current.addObstacle(-2, 0, 0.5, 0.5);
      }

      // Mudar para a aba de localização para mostrar a simulação
      setActiveTab(2);
    }

    // Simular feedback visual
    alert(`Missão ${missionType} iniciada com sucesso! Veja a simulação na aba de Localização.`)
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
                    <CIcon icon={cilTask} className="me-2" />
                    Missões
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 4}
                    onClick={() => setActiveTab(4)}
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
                    <div className="bg-light rounded p-3" style={{ height: '400px' }}>
                      <div className="d-flex justify-content-between mb-3">
                        <div>
                          <strong>Posição:</strong> {rover.location}
                        </div>
                        <div>
                          <strong>Coordenadas:</strong> X: <span id="rover-x">0.0</span>m, Y: <span id="rover-y">0.0</span>m
                        </div>
                        <div>
                          <strong>Orientação:</strong> <span id="rover-theta">0.0</span>°
                        </div>
                      </div>

                      <div className="position-relative" style={{ height: '300px', border: '1px solid #ccc' }}>
                        {/* Canvas para renderização do rover e ambiente */}
                        <canvas
                          id="rover-simulation-canvas"
                          width="100%"
                          height="100%"
                          style={{ width: '100%', height: '100%' }}
                        ></canvas>

                        {/* Controles de visualização */}
                        <div className="position-absolute bottom-0 end-0 p-2">
                          <CButton
                            color="light"
                            size="sm"
                            className="me-2"
                            onClick={() => {
                              if (roverSimulationRef.current) {
                                roverSimulationRef.current.resetRover();
                              }
                            }}
                          >
                            <CIcon icon={cilLocationPin} size="sm" /> Resetar Posição
                          </CButton>
                          <CButton
                            color="light"
                            size="sm"
                            onClick={() => {
                              if (roverSimulationRef.current) {
                                roverSimulationRef.current.clearObstacles();
                                roverSimulationRef.current.addObstacle(2, 1, 1, 0.5);
                                roverSimulationRef.current.addObstacle(-1.5, -1, 0.8, 0.8);
                              }
                            }}
                          >
                            <CIcon icon={cilSettings} size="sm" /> Gerar Obstáculos
                          </CButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </CTabPane>

                <CTabPane role="tabpanel" visible={activeTab === 3}>
                  <div className="missions-container">
                    <h5>Planejamento de Missões</h5>
                    <div className="p-3">
                      <CRow>
                        <CCol md={6}>
                          <div className="mb-3">
                            <label className="form-label">Tipo de Missão</label>
                            <select className="form-select">
                              <option>Inspeção de Equipamentos</option>
                              <option>Monitoramento Perimetral</option>
                              <option>Verificação de Anomalias</option>
                              <option>Coleta de Dados</option>
                            </select>
                          </div>

                          <div className="mb-3">
                            <label className="form-label">Pontos de Interesse</label>
                            <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                              <div className="form-check">
                                <input className="form-check-input" type="checkbox" value="" id="poi1" />
                                <label className="form-check-label" htmlFor="poi1">TPC1_6 - Transformador</label>
                              </div>
                              <div className="form-check">
                                <input className="form-check-input" type="checkbox" value="" id="poi2" />
                                <label className="form-check-label" htmlFor="poi2">TPC2_0 - Disjuntor</label>
                              </div>
                              <div className="form-check">
                                <input className="form-check-input" type="checkbox" value="" id="poi3" />
                                <label className="form-check-label" htmlFor="poi3">PR11_7 - Reator</label>
                              </div>
                              <div className="form-check">
                                <input className="form-check-input" type="checkbox" value="" id="poi4" />
                                <label className="form-check-label" htmlFor="poi4">PR12_2 - Barramento</label>
                              </div>
                              <div className="form-check">
                                <input className="form-check-input" type="checkbox" value="" id="poi5" />
                                <label className="form-check-label" htmlFor="poi5">TPC3_0 - Seccionadora</label>
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="form-label">Prioridade</label>
                            <select className="form-select">
                              <option>Normal</option>
                              <option>Alta</option>
                              <option>Urgente</option>
                            </select>
                          </div>

                          <div className="d-grid gap-2">
                            <CButton
                              color="primary"
                              onClick={() => {
                                // Simular o planejamento de rota
                                alert('Planejando rota com o algoritmo MultiGraphPlanner...');

                                // Atualizar as informações da rota após um breve delay
                                setTimeout(() => {
                                  const distanciaElement = document.querySelector('.missions-container .d-flex span:nth-child(1) strong');
                                  const tempoElement = document.querySelector('.missions-container .d-flex span:nth-child(2) strong');
                                  const pontosElement = document.querySelector('.missions-container .d-flex span:nth-child(3) strong');

                                  if (distanciaElement) distanciaElement.nextSibling.textContent = ' 120 m';
                                  if (tempoElement) tempoElement.nextSibling.textContent = ' 5 min';
                                  if (pontosElement) pontosElement.nextSibling.textContent = ' 5';
                                }, 1500);
                              }}
                            >
                              Planejar Rota
                            </CButton>
                            <CButton
                              color="success"
                              onClick={() => {
                                // Mudar para a aba de localização e iniciar a simulação
                                if (roverSimulationRef.current) {
                                  roverSimulationRef.current.resetRover();
                                  roverSimulationRef.current.clearObstacles();

                                  // Adicionar obstáculos baseados nos pontos de interesse selecionados
                                  const checkboxes = document.querySelectorAll('.missions-container .form-check-input:checked');
                                  if (checkboxes.length > 0) {
                                    // Adicionar obstáculos em posições diferentes para cada ponto selecionado
                                    checkboxes.forEach((checkbox, index) => {
                                      const x = Math.cos(index * Math.PI / 2) * 2;
                                      const y = Math.sin(index * Math.PI / 2) * 2;
                                      roverSimulationRef.current.addObstacle(x, y, 0.5, 0.5);
                                    });
                                  } else {
                                    // Adicionar obstáculos padrão se nenhum ponto for selecionado
                                    roverSimulationRef.current.addObstacle(2, 1, 1, 0.5);
                                    roverSimulationRef.current.addObstacle(-1.5, -1, 0.8, 0.8);
                                  }

                                  setActiveTab(2);
                                }

                                alert('Missão iniciada! Veja a simulação na aba de Localização.');
                              }}
                            >
                              Iniciar Missão
                            </CButton>
                          </div>
                        </CCol>

                        <CCol md={6}>
                          <div className="border rounded p-2" style={{ height: '300px', position: 'relative' }}>
                            <div className="text-center" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                              <p><CIcon icon={cilGraph} size="xl" /></p>
                              <p>Visualização do grafo de navegação</p>
                              <p><small>Aqui será exibido o grafo de navegação com a rota planejada</small></p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <h6>Informações da Rota</h6>
                            <div className="d-flex justify-content-between small">
                              <span><strong>Distância:</strong> -- m</span>
                              <span><strong>Tempo estimado:</strong> -- min</span>
                              <span><strong>Pontos:</strong> 0</span>
                            </div>
                          </div>
                        </CCol>
                      </CRow>
                    </div>
                  </div>
                </CTabPane>

                <CTabPane role="tabpanel" visible={activeTab === 4}>
                  <div className="settings-container">
                    <h5>Configurações do Rover</h5>
                    <div className="p-3">
                      <CRow>
                        <CCol md={6}>
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
                        </CCol>

                        <CCol md={6}>
                          <h6 className="mb-3">Parâmetros do Modelo</h6>

                          <div className="mb-2">
                            <label className="form-label small">Torque Máximo (Nm)</label>
                            <input type="number" className="form-control form-control-sm" defaultValue="80" />
                          </div>

                          <div className="mb-2">
                            <label className="form-label small">Distância entre Rodas (m)</label>
                            <input type="number" className="form-control form-control-sm" defaultValue="0.5" />
                          </div>

                          <div className="mb-2">
                            <label className="form-label small">Raio das Rodas (m)</label>
                            <input type="number" className="form-control form-control-sm" defaultValue="0.1" />
                          </div>

                          <div className="mb-2">
                            <label className="form-label small">Resistência ao Giro</label>
                            <input type="number" className="form-control form-control-sm" defaultValue="0.3" />
                          </div>
                        </CCol>
                      </CRow>

                      <div className="d-grid mt-3">
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
