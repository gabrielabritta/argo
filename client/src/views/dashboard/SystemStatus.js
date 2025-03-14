import React, { useState, useEffect } from 'react'
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWarning, cilCheckCircle, cilX } from '@coreui/icons'

const SystemStatus = () => {
  // Dados simulados - em um ambiente real, estes viriam da API
  const [rovers, setRovers] = useState([
    {
      id: 1,
      name: 'Rover Alpha',
      status: 'online',
      batteryLevel: 78,
      lastConnection: '2024-10-15 14:32:45',
      sensors: {
        camera: 'ok',
        gps: 'ok',
        temperature: 'warning',
        proximity: 'ok',
      },
      alerts: [
        {
          type: 'warning',
          message: 'Temperatura acima do normal',
          timestamp: '2024-10-15 14:30:12',
        },
      ],
    },
    {
      id: 2,
      name: 'Rover Beta',
      status: 'offline',
      batteryLevel: 12,
      lastConnection: '2024-10-15 10:15:22',
      sensors: {
        camera: 'error',
        gps: 'ok',
        temperature: 'ok',
        proximity: 'ok',
      },
      alerts: [
        {
          type: 'error',
          message: 'Perda de conexão',
          timestamp: '2024-10-15 10:15:22',
        },
        {
          type: 'error',
          message: 'Câmera não responde',
          timestamp: '2024-10-15 10:14:55',
        },
      ],
    },
    {
      id: 3,
      name: 'Rover Gamma',
      status: 'online',
      batteryLevel: 45,
      lastConnection: '2024-10-15 14:35:10',
      sensors: {
        camera: 'ok',
        gps: 'ok',
        temperature: 'ok',
        proximity: 'ok',
      },
      alerts: [],
    },
  ])

  // Simulação de atualização periódica dos dados
  useEffect(() => {
    const interval = setInterval(() => {
      // Simular mudanças aleatórias nos dados
      setRovers((prevRovers) =>
        prevRovers.map((rover) => {
          // Simular flutuação de bateria
          let batteryChange = Math.floor(Math.random() * 3) - 1 // -1, 0, ou 1
          let newBatteryLevel = rover.batteryLevel + batteryChange

          // Manter dentro dos limites
          if (newBatteryLevel > 100) newBatteryLevel = 100
          if (newBatteryLevel < 0) newBatteryLevel = 0

          // Atualizar timestamp de última conexão para rovers online
          const lastConnection =
            rover.status === 'online'
              ? new Date().toISOString().replace('T', ' ').substring(0, 19)
              : rover.lastConnection

          return {
            ...rover,
            batteryLevel: newBatteryLevel,
            lastConnection,
          }
        }),
      )
    }, 5000) // Atualizar a cada 5 segundos

    return () => clearInterval(interval)
  }, [])

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

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Status do Sistema</strong>
            <small className="ms-2">Monitoramento em tempo real</small>
          </CCardHeader>
          <CCardBody>
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
                  <CTableRow key={rover.id}>
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
                        <CBadge color={rover.alerts[0].type === 'error' ? 'danger' : 'warning'}>
                          {rover.alerts.length} {rover.alerts.length === 1 ? 'alerta' : 'alertas'}
                        </CBadge>
                      ) : (
                        <CBadge color="light">Sem alertas</CBadge>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      {rover.status === 'offline' && (
                        <CButton
                          color="primary"
                          size="sm"
                          onClick={() => handleReconnect(rover.id)}
                        >
                          Reconectar
                        </CButton>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default SystemStatus
