import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CProgress,
  CButton,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWarning, cilCheckCircle, cilX, cilBell, cilInfo } from '@coreui/icons'

const SystemStatus = () => {
  const navigate = useNavigate()
  const [rovers, setRovers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alertModal, setAlertModal] = useState(false)
  const [selectedRover, setSelectedRover] = useState(null)

  // Buscar rovers da API
  useEffect(() => {
    const fetchRovers = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/rovers/')
        if (!response.ok) {
          throw new Error('Erro ao carregar rovers')
        }
        const data = await response.json()

        // Transformar os dados para o formato esperado
        const formattedData = data.map(rover => ({
          id: rover.id,
          identifier: rover.identifier,
          name: rover.name,
          status: rover.is_active ? 'online' : 'offline',
          batteryLevel: Math.floor(Math.random() * 100), // Simulado
          lastConnection: new Date().toISOString().replace('T', ' ').substring(0, 19),
          substationId: rover.substation_identifier, // Usar o identificador da subestação em vez do ID
          substationName: rover.substation_name,
          sensors: {
            camera: 'ok',
            gps: 'ok',
            temperature: 'ok',
            proximity: 'ok',
          },
          alerts: [],
        }))

        setRovers(formattedData)
        setLoading(false)
      } catch (error) {
        console.error('Erro ao carregar rovers:', error)
        // Dados de fallback caso a API falhe
        setRovers([
          {
            id: 6, // ID correto do rover no banco de dados
            identifier: 'Rover-Alpha',
            name: 'Rover Alpha',
            status: 'online',
            batteryLevel: 78,
            lastConnection: new Date().toISOString().replace('T', ' ').substring(0, 19),
            substationId: 'SUB001', // Identificador da subestação
            substationName: 'Subestação Principal',
            sensors: {
              camera: 'ok',
              gps: 'ok',
              temperature: 'ok',
              proximity: 'ok',
            },
            alerts: [],
          }
        ])
        setLoading(false)
      }
    }

    fetchRovers()

    // Simular atualizações periódicas
    const interval = setInterval(() => {
      setRovers(prevRovers => 
        prevRovers.map(rover => ({
          ...rover,
          batteryLevel: Math.min(100, Math.max(0, rover.batteryLevel + (Math.floor(Math.random() * 3) - 1))),
          lastConnection: rover.status === 'online' 
            ? new Date().toISOString().replace('T', ' ').substring(0, 19)
            : rover.lastConnection
        }))
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Função para navegar para a página de inspeção do rover
  const handleRoverClick = (rover) => {
    navigate(`/inspect/substation/${rover.substationId}/rover/${rover.identifier}`)
  }

  // Função para abrir o modal de alertas
  const handleAlertsClick = (e, rover) => {
    e.stopPropagation() // Evita que o clique propague para a linha da tabela
    setSelectedRover(rover)
    setAlertModal(true)
  }

  // Função para tentar reconectar um rover
  const handleReconnect = (roverId) => {
    // Em um ambiente real, isso enviaria uma solicitação para a API
    alert(`Tentando reconectar ao Rover ID: ${roverId}`)

    // Simulação de reconexão bem-sucedida após 2 segundos
    setTimeout(() => {
      setRovers((prevRovers) =>
        prevRovers.map((rover) =>
          rover.id === roverId
            ? {
                ...rover,
                status: 'online',
                lastConnection: new Date().toISOString().replace('T', ' ').substring(0, 19),
                alerts: [
                  {
                    type: 'info',
                    message: 'Conexão restabelecida',
                    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                  },
                  ...rover.alerts,
                ],
              }
            : rover,
        ),
      )
    }, 2000)
  }

  // Função para renderizar o status com cores apropriadas
  const renderStatus = (status) => {
    switch (status) {
      case 'online':
        return <CBadge color="success">Online</CBadge>
      case 'offline':
        return <CBadge color="danger">Offline</CBadge>
      case 'maintenance':
        return <CBadge color="warning">Manutenção</CBadge>
      default:
        return <CBadge color="secondary">Desconhecido</CBadge>
    }
  }

  // Função para renderizar o status dos sensores
  const renderSensorStatus = (status) => {
    switch (status) {
      case 'ok':
        return <CIcon icon={cilCheckCircle} className="text-success" />
      case 'warning':
        return <CIcon icon={cilWarning} className="text-warning" />
      case 'error':
        return <CIcon icon={cilX} className="text-danger" />
      default:
        return <span>-</span>
    }
  }

  // Função para determinar a cor da barra de progresso da bateria
  const getBatteryColor = (level) => {
    if (level > 60) return 'success'
    if (level > 30) return 'warning'
    return 'danger'
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Status do Sistema</strong>
              <small className="ms-2">Monitoramento em tempo real</small>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="d-flex justify-content-center p-5">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">Rover</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Bateria</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Última Conexão</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Sensores</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Alertas</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Ações</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rovers.map((rover) => (
                      <CTableRow 
                        key={rover.id} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRoverClick(rover)}
                      >
                        <CTableDataCell>{rover.name}</CTableDataCell>
                        <CTableDataCell>{renderStatus(rover.status)}</CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex align-items-center">
                            <CProgress
                              thin
                              className="flex-grow-1 me-2"
                              color={getBatteryColor(rover.batteryLevel)}
                              value={rover.batteryLevel}
                            />
                            <div className="small text-medium-emphasis">{rover.batteryLevel}%</div>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>{rover.lastConnection}</CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex gap-2">
                            <div title="Câmera">{renderSensorStatus(rover.sensors.camera)}</div>
                            <div title="GPS">{renderSensorStatus(rover.sensors.gps)}</div>
                            <div title="Temperatura">{renderSensorStatus(rover.sensors.temperature)}</div>
                            <div title="Proximidade">{renderSensorStatus(rover.sensors.proximity)}</div>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          {rover.alerts.length > 0 ? (
                            <CBadge 
                              color={rover.alerts[0].type === 'error' ? 'danger' : 'warning'}
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => handleAlertsClick(e, rover)}
                            >
                              <CIcon icon={cilBell} className="me-1" />
                              {rover.alerts.length} {rover.alerts.length === 1 ? 'alerta' : 'alertas'}
                            </CBadge>
                          ) : (
                            <CBadge 
                              color="info" 
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => handleAlertsClick(e, rover)}
                            >
                              <CIcon icon={cilInfo} className="me-1" />
                              Sistema normal
                            </CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {rover.status === 'offline' ? (
                            <CButton
                              color="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReconnect(rover.id);
                              }}
                            >
                              Reconectar
                            </CButton>
                          ) : (
                            <CButton
                              color="success"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRoverClick(rover);
                              }}
                            >
                              Inspecionar
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {alertModal && (
        <CModal visible={alertModal} onClose={() => setAlertModal(false)} size="lg">
          <CModalHeader onClose={() => setAlertModal(false)}>
            <CModalTitle>
              <CIcon icon={cilBell} className="me-2" />
              Alertas do Sistema - {selectedRover?.name}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            {selectedRover && selectedRover.alerts.length > 0 ? (
              <>
                <p className="text-medium-emphasis mb-4">
                  Listagem de alertas ativos para o rover {selectedRover.name}. Os alertas são ordenados do mais recente para o mais antigo.
                </p>
                {selectedRover.alerts.map((alert, index) => (
                  <CAlert key={index} color={alert.type === 'error' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{alert.type === 'error' ? 'Erro' : alert.type === 'warning' ? 'Aviso' : 'Informação'}</strong>: {alert.message}
                      </div>
                      <small className="text-medium-emphasis">{alert.timestamp}</small>
                    </div>
                  </CAlert>
                ))}
              </>
            ) : (
              <div className="text-center py-5">
                <CIcon icon={cilCheckCircle} size="3xl" className="text-success mb-4" />
                <h4>Nenhum alerta detectado</h4>
                <p className="text-medium-emphasis mb-0">
                  Todos os sistemas do {selectedRover?.name} estão operando dentro dos parâmetros normais. 
                  Não há condições de alerta ou anomalias detectadas no momento.
                </p>
                <p className="text-medium-emphasis mt-3">
                  Última verificação: {new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setAlertModal(false)}>
              Fechar
            </CButton>
          </CModalFooter>
        </CModal>
      )}
    </>
  )
}

export default SystemStatus
