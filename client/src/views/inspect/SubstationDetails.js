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
import { API_BASE_URL } from '../../config'

const SubstationDetails = () => {
  const { substationId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [substation, setSubstation] = useState(null)
  const [rovers, setRovers] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSubstationDetails = async () => {
      try {
        // Buscar dados da subestação
        const subResponse = await fetch(`${API_BASE_URL}/substations/${substationId}/`)
        if (!subResponse.ok) {
          throw new Error('Erro ao buscar dados da subestação')
        }
        const subData = await subResponse.json()
        setSubstation(subData)

        // Buscar rovers da subestação
        const roversResponse = await fetch(`${API_BASE_URL}/rovers/?substation=${substationId}`)
        if (!roversResponse.ok) {
          throw new Error('Erro ao buscar dados dos rovers')
        }
        const roversData = await roversResponse.json()
        setRovers(roversData)

        setLoading(false)
      } catch (error) {
        console.error('Erro ao carregar detalhes da subestação:', error)
        setError('Falha ao carregar dados. Por favor, tente novamente.')
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

  if (error) {
    return (
      <div className="alert alert-danger m-3" role="alert">
        {error}
      </div>
    )
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>{substation?.name}</strong>
              <small className="ms-2">{getStatusBadge(substation?.status)}</small>
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
                    <CTableHeaderCell>Identificador</CTableHeaderCell>
                    <CTableDataCell>{substation?.identifier}</CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Localização</CTableHeaderCell>
                    <CTableDataCell>
                      {substation?.latitude && substation?.longitude ? (
                        `${substation.latitude.toFixed(6)}, ${substation.longitude.toFixed(6)}`
                      ) : (
                        'Localização não disponível'
                      )}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableDataCell>{getStatusBadge(substation?.status)}</CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </CCol>
            <CCol md={6}>
              <h5>Descrição</h5>
              <p>Subestação responsável pela transformação e distribuição de energia para a região.</p>
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
                  <CTableDataCell>{getRoverStatusBadge(rover.is_active ? 'active' : 'inactive')}</CTableDataCell>
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
              {rovers.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan="4" className="text-center">
                    Nenhum rover encontrado nesta subestação
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </>
  )
}

export default SubstationDetails
