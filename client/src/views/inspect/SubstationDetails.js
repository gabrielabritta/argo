import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  CButton,
  CProgress,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilRobot, cilLocationPin, cilCameraControl, cilBattery5, cilWarning } from '@coreui/icons'

const SubstationDetails = () => {
  const { substationId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [substation, setSubstation] = useState(null)
  const [rovers, setRovers] = useState([])

  useEffect(() => {
    // Simular carregamento de dados da API
    const fetchSubstationDetails = async () => {
      try {
        // Em um ambiente real, isso seria uma chamada à API
        // const response = await fetch(`http://localhost:8000/api/substations/${substationId}/`)
        // const data = await response.json()

        // Dados simulados da subestação
        const mockSubstation = {
          id: parseInt(substationId),
          name: `Subestação ${['Itumbiara', 'Belo Monte', 'Xingu', 'Santo Ângelo', 'Campinas'][parseInt(substationId) - 1] || 'Desconhecida'}`,
          location: [-18.4086, -49.2207],
          status: ['operational', 'maintenance', 'operational', 'operational', 'alert'][parseInt(substationId) - 1] || 'operational',
          voltage: ['500kV', '800kV', '800kV', '230kV', '440kV'][parseInt(substationId) - 1] || '500kV',
          area: ['150.000m²', '200.000m²', '180.000m²', '120.000m²', '160.000m²'][parseInt(substationId) - 1] || '150.000m²',
          lastInspection: ['2024-10-12', '2024-10-05', '2024-10-10', '2024-10-08', '2024-10-14'][parseInt(substationId) - 1] || '2024-10-01',
          nextScheduledInspection: ['2024-11-12', '2024-11-05', '2024-11-10', '2024-11-08', '2024-11-14'][parseInt(substationId) - 1] || '2024-11-01',
          description: 'Esta subestação é responsável pela transformação e distribuição de energia para a região.',
        }

        // Dados simulados dos rovers na subestação
        const mockRovers = [
          {
            id: 1,
            name: 'Rover Alpha',
            model: 'Argo-N-0',
            status: 'active',
            batteryLevel: 78,
            lastMission: '2024-10-15 14:32:45',
            location: 'Setor Norte',
            alerts: 1,
          },
          {
            id: 2,
            name: 'Rover Beta',
            model: 'Argo-N-1',
            status: 'charging',
            batteryLevel: 42,
            lastMission: '2024-10-15 10:15:22',
            location: 'Estação de Carregamento',
            alerts: 0,
          },
        ]

        // Se a subestação for a 2 ou 5, adicionar um terceiro rover
        if (parseInt(substationId) === 2 || parseInt(substationId) === 5) {
          mockRovers.push({
            id: 3,
            name: 'Rover Gamma',
            model: 'Argo-N-0',
            status: parseInt(substationId) === 5 ? 'maintenance' : 'active',
            batteryLevel: 65,
            lastMission: '2024-10-15 12:45:30',
            location: 'Setor Sul',
            alerts: parseInt(substationId) === 5 ? 2 : 0,
          })
        }

        setSubstation(mockSubstation)
        setRovers(mockRovers)
        setLoading(false)
      } catch (error) {
        console.error('Erro ao carregar detalhes da subestação:', error)
        setLoading(false)
      }
    }

    fetchSubstationDetails()
  }, [substationId])

  const handleRoverClick = (roverId) => {
    navigate(`/inspect/substation/${substationId}/rover/${roverId}`)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'operational':
        return <CBadge color="success">Operacional</CBadge>
      case 'maintenance':
        return <CBadge color="warning">Em Manutenção</CBadge>
      case 'alert':
        return <CBadge color="danger">Alerta</CBadge>
      default:
        return <CBadge color="secondary">Desconhecido</CBadge>
    }
  }

  const getRoverStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <CBadge color="success">Ativo</CBadge>
      case 'charging':
        return <CBadge color="info">Carregando</CBadge>
      case 'maintenance':
        return <CBadge color="warning">Manutenção</CBadge>
      case 'inactive':
        return <CBadge color="danger">Inativo</CBadge>
      default:
        return <CBadge color="secondary">Desconhecido</CBadge>
    }
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
              <strong>{substation.name}</strong>
              <small className="ms-2">{getStatusBadge(substation.status)}</small>
            </div>
            <CButton color="primary" size="sm" onClick={() => navigate('/dashboard')}>
              Voltar ao Mapa
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <h5>Informações Gerais</h5>
              <CTable small borderless>
                <CTableBody>
                  <CTableRow>
                    <CTableHeaderCell>Tensão</CTableHeaderCell>
                    <CTableDataCell>{substation.voltage}</CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Área</CTableHeaderCell>
                    <CTableDataCell>{substation.area}</CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Última Inspeção</CTableHeaderCell>
                    <CTableDataCell>{substation.lastInspection}</CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Próxima Inspeção</CTableHeaderCell>
                    <CTableDataCell>{substation.nextScheduledInspection}</CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </CCol>
            <CCol md={6}>
              <h5>Descrição</h5>
              <p>{substation.description}</p>
              <div className="mt-3">
                <CButton color="success" className="me-2">
                  <CIcon icon={cilLocationPin} className="me-2" />
                  Ver no Mapa
                </CButton>
                <CButton color="info">
                  <CIcon icon={cilCameraControl} className="me-2" />
                  Câmeras de Segurança
                </CButton>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Rovers na Subestação</strong>
          <small className="ms-2">Clique em um rover para controlar</small>
        </CCardHeader>
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Rover</CTableHeaderCell>
                <CTableHeaderCell scope="col">Modelo</CTableHeaderCell>
                <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                <CTableHeaderCell scope="col">Bateria</CTableHeaderCell>
                <CTableHeaderCell scope="col">Localização</CTableHeaderCell>
                <CTableHeaderCell scope="col">Última Missão</CTableHeaderCell>
                <CTableHeaderCell scope="col">Alertas</CTableHeaderCell>
                <CTableHeaderCell scope="col">Ações</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rovers.map((rover) => (
                <CTableRow key={rover.id}>
                  <CTableDataCell>
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilRobot} className="me-2" />
                      {rover.name}
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>{rover.model}</CTableDataCell>
                  <CTableDataCell>{getRoverStatusBadge(rover.status)}</CTableDataCell>
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
                  <CTableDataCell>{rover.location}</CTableDataCell>
                  <CTableDataCell>{rover.lastMission}</CTableDataCell>
                  <CTableDataCell>
                    {rover.alerts > 0 ? (
                      <CBadge color="danger">
                        <CIcon icon={cilWarning} className="me-1" />
                        {rover.alerts}
                      </CBadge>
                    ) : (
                      <CBadge color="light">Sem alertas</CBadge>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => handleRoverClick(rover.id)}
                    >
                      Controlar
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </>
  )
}

export default SubstationDetails
