import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CBadge,
  CProgress,
} from '@coreui/react'

const SubstationInspection = () => {
  const { substationId } = useParams()
  const navigate = useNavigate()

  const [substationInfo, setSubstationInfo] = useState(null)
  const [loadingSubstation, setLoadingSubstation] = useState(true)

  const [rovers, setRovers] = useState([])
  const [loadingRovers, setLoadingRovers] = useState(true)

  const [error, setError] = useState(null)

  // Estado para atualizar o tempo atual a cada segundo
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Função para atualizar os rovers apenas se houver mudança
  const updateRovers = (newData) => {
    setRovers((prevRovers) => {
      if (JSON.stringify(prevRovers) === JSON.stringify(newData)) {
        return prevRovers
      }
      return newData
    })
  }

  // Função para atualizar as informações da subestação apenas se houver mudança
  const updateSubstationInfo = (newInfo) => {
    setSubstationInfo((prevInfo) => {
      if (JSON.stringify(prevInfo) === JSON.stringify(newInfo)) {
        return prevInfo
      }
      return newInfo
    })
  }

  // 1) Buscar informações da subestação (executa apenas uma vez ou quando o substationId muda)
  useEffect(() => {
    const fetchSubstationData = async () => {
      setLoadingSubstation(true)
      try {
        const subResponse = await fetch(`http://localhost:8000/api/substations/${substationId}/`)
        if (!subResponse.ok) {
          throw new Error('Erro na requisição da subestação')
        }
        const subData = await subResponse.json()
        updateSubstationInfo(subData)
        setError(null)
      } catch (err) {
        setError('Falha ao carregar dados da subestação')
        console.error('Error:', err)
      }
      setLoadingSubstation(false)
    }

    fetchSubstationData()
  }, [substationId])

  // 2) Buscar dados dos rovers com polling a cada 5 segundos
  useEffect(() => {
    let isMounted = true // para evitar atualizações após desmontagem

    const fetchRoversData = async () => {
      try {
        const roversResponse = await fetch(
          `http://localhost:8000/api/rovers/?substation=${substationId}`,
        )
        if (!roversResponse.ok) {
          throw new Error('Erro na requisição dos rovers')
        }
        const roversData = await roversResponse.json()
        updateRovers(roversData)
        setError(null)
        if (isMounted) setLoadingRovers(false)
      } catch (err) {
        setError('Falha ao carregar dados dos rovers')
        console.error('Error:', err)
      }
    }

    // Primeira chamada
    fetchRoversData()

    // Configurar polling
    const interval = setInterval(() => {
      if (isMounted) {
        fetchRoversData()
      }
    }, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [substationId])

  // 3) Atualizar o estado currentTime a cada segundo para re-renderização
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Função para determinar a cor do badge com base no status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'carregando':
        return 'warning'
      case 'em missão':
        return 'primary'
      case 'parado':
        return 'secondary'
      case 'offline':
        return 'danger'
      default:
        return 'info'
    }
  }

  const formatLastSeen = (timestamp) => {
    if (!timestamp || timestamp === 'now') {
      return 'Agora'
    }

    try {
      const dateVal = new Date(timestamp)
      if (isNaN(dateVal.getTime())) {
        throw new Error('Invalid date')
      }

      const diffSeconds = Math.floor((currentTime - dateVal.getTime()) / 1000)

      if (diffSeconds < 5) return 'Agora'
      if (diffSeconds < 60) {
        return `${diffSeconds} segundos atrás`
      }
      if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60)
        return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} atrás`
      }
      if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600)
        return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`
      }

      return dateVal.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      console.error('Error parsing date:', timestamp, error)
      return 'Indisponível'
    }
  }

  // Função para navegar para a inspeção de um rover específico
  const handleRoverClick = (roverId) => {
    navigate(`/inspect/substation/${substationId}/rover/${roverId}`)
  }

  // Exibir spinner enquanto carrega os dados iniciais
  if (loadingSubstation || loadingRovers) {
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
          <h4>Inspeção da Subestação: {substationInfo?.name}</h4>
        </CCardHeader>
        <CCardBody>
          {error && (
            <CAlert color="danger" dismissible>
              {error}
            </CAlert>
          )}

          <CRow>
            {rovers.map((rover) => (
              <CCol md={6} key={rover.id} className="mb-4">
                <CCard
                  className="h-100"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleRoverClick(rover.id)}
                >
                  <CCardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5>{rover.name}</h5>
                      <CBadge color={getStatusColor(rover.status)}>
                        {rover.status || 'Status Desconhecido'}
                      </CBadge>
                    </div>

                    <div className="mb-3">
                      <small className="text-medium-emphasis">Bateria</small>
                      <CProgress thin color="success" value={rover.battery}>
                        {rover.battery}%
                      </CProgress>
                    </div>

                    <div className="mb-3">
                      <small className="text-medium-emphasis">Temperatura</small>
                      <div className="fs-5">{rover.temperature}°C</div>
                    </div>

                    <div className="text-medium-emphasis small">
                      Última atualização: {formatLastSeen(rover.last_seen)}
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
            {rovers.length === 0 && (
              <CCol>
                <div className="text-center p-4">
                  <h5 className="text-medium-emphasis">Nenhum rover encontrado nesta subestação</h5>
                </div>
              </CCol>
            )}
          </CRow>
        </CCardBody>
      </CCard>
    </>
  )
}

export default SubstationInspection
