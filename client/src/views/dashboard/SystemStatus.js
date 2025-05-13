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
import { API_BASE_URL } from '../../config'

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
        console.log('Tentando buscar rovers em:', `${API_BASE_URL}/rovers/`);
        const response = await fetch(`${API_BASE_URL}/rovers/`);
        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar rovers: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Dados dos rovers recebidos:', data);

        // Transformar os dados para o formato esperado
        const formattedData = data.map(rover => ({
          id: rover.identifier,
          name: rover.name,
          status: rover.is_active ? 'operational' : 'maintenance',
          battery: rover.battery_level || 100,
          lastInspection: new Date().toISOString().split('T')[0],
          substation: rover.substation_identifier || 'N/A',
          substationName: rover.substation_name || 'N/A',
          sensors: rover.sensors || {
            camera: 'ok',
            temperature: 'ok',
            humidity: 'ok',
            pressure: 'ok'
          },
          alerts: rover.alerts || []
        }));

        console.log('Dados dos rovers formatados:', formattedData);
        setRovers(formattedData);
        setLoading(false);
      } catch (error) {
        console.error('Erro detalhado ao carregar rovers:', error);
        setLoading(false);
      }
    };

    fetchRovers();

    // Simular atualizações periódicas
    const interval = setInterval(() => {
      setRovers(prevRovers => 
        prevRovers.map(rover => ({
          ...rover,
          battery: Math.min(100, Math.max(0, rover.battery + (Math.floor(Math.random() * 3) - 1))),
          lastInspection: rover.status === 'operational' 
            ? new Date().toISOString().split('T')[0]
            : rover.lastInspection
        }))
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Função para navegar para a página de inspeção do rover
  const handleRoverClick = (rover) => {
    navigate(`/inspect/substation/${rover.substation}/rover/${rover.id}`)
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
                status: 'operational',
                lastInspection: new Date().toISOString().split('T')[0],
              }
            : rover,
        ),
      )
    }, 2000)
  }

  // Função para renderizar o status com cores apropriadas
  const renderStatus = (status) => {
    switch (status) {
      case 'operational':
        return <CBadge color="success">Operacional</CBadge>
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
                      <CTableHeaderCell scope="col">Sensores</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Última Inspeção</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Subestação</CTableHeaderCell>
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
                              color={getBatteryColor(rover.battery)}
                              value={rover.battery}
                            />
                            <div className="small text-medium-emphasis">{rover.battery}%</div>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex gap-2">
                            <div title="Câmera">{renderSensorStatus(rover.sensors.camera)}</div>
                            <div title="Temperatura">{renderSensorStatus(rover.sensors.temperature)}</div>
                            <div title="Umidade">{renderSensorStatus(rover.sensors.humidity)}</div>
                            <div title="Pressão">{renderSensorStatus(rover.sensors.pressure)}</div>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>{rover.lastInspection}</CTableDataCell>
                        <CTableDataCell>{rover.substationName}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="primary"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleAlertsClick(e, rover)}
                          >
                            <CIcon icon={cilBell} />
                          </CButton>
                        </CTableDataCell>
                        <CTableDataCell>
                          {rover.status === 'maintenance' ? (
                            <CButton
                              color="success"
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
                              color="primary"
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
            {selectedRover && selectedRover.alerts && selectedRover.alerts.length > 0 ? (
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
