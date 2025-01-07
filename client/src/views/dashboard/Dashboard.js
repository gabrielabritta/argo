import React, { useState, useEffect, useCallback } from 'react'
import Select, { components } from 'react-select'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CProgress,
  CFormSelect,
  CAlert,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'

// Importação das imagens dos rovers
import roverN0Image from '../../assets/images/rover-icons/rover-argo-n0.png'
import roverN1Image from '../../assets/images/rover-icons/rover-argo-n1.png'

// Componente para renderizar opção do Select com imagem
const CustomOption = (props) => {
  return (
    <components.Option {...props}>
      <img
        src={props.data.image}
        alt={props.data.label}
        style={{ width: '40px', height: '40px', marginRight: '15px' }}
      />
      <span style={{ fontSize: '18px' }}>{props.data.label}</span>
    </components.Option>
  )
}

const Dashboard = () => {
  // Estados
  const [telemetryData, setTelemetryData] = useState({
    batteryLevel: 0,
    temperature: 0,
    speed: 0,
  })
  const [selectedRover, setSelectedRover] = useState('Rover-Argo-N-0')
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [error, setError] = useState(null)
  const [wsRetryCount, setWsRetryCount] = useState(0)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Constantes
  const MAX_RETRY_ATTEMPTS = 3
  const RETRY_DELAY = 5000
  const API_BASE_URL = 'http://localhost:8000/api'
  const WS_BASE_URL = 'ws://localhost:8000/ws'

  const roverOptions = [
    {
      value: 'Rover-Argo-N-0',
      label: 'Rover-Argo-N-0',
      image: roverN0Image,
    },
    {
      value: 'Rover-Argo-N-1',
      label: 'Rover-Argo-N-1',
      image: roverN1Image,
    },
  ]

  // Função para buscar dados de telemetria via HTTP
  const fetchTelemetryData = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sensor-data/?rover=${selectedRover}`,
      )
      if (!response.ok) {
        throw new Error(`Erro na resposta do servidor: ${response.status}`)
      }
      const data = await response.json()
      console.log('Dados recebidos da API:', data)

      setTelemetryData({
        batteryLevel: data.battery || 0,
        temperature: data.temperature || 0,
        speed: data.speed || 0,
      })
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar dados de telemetria:', err)
      setError('Falha ao carregar dados. Tentando novamente...')
    }
  }, [selectedRover])

  // Configuração do WebSocket
  const setupWebSocket = useCallback(() => {
    if (wsRetryCount >= MAX_RETRY_ATTEMPTS) {
      setError('Máximo de tentativas de reconexão WebSocket atingido')
      return null
    }

    const ws = new WebSocket(`${WS_BASE_URL}/rovers/${selectedRover}/`)

    ws.onopen = () => {
      console.log('Conexão WebSocket estabelecida')
      setWsStatus('connected')
      setWsRetryCount(0)
      setError(null)
      showToast('Conexão estabelecida com sucesso')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Dados recebidos via WebSocket:', data)
        setTelemetryData({
          batteryLevel: data.battery || 0,
          temperature: data.temperature || 0,
          speed: data.speed || 0,
        })
      } catch (err) {
        console.error('Erro ao processar mensagem WebSocket:', err)
      }
    }

    ws.onerror = (err) => {
      console.warn('Erro na conexão WebSocket:', err)
      setWsStatus('error')
      setError('Erro na conexão WebSocket')
    }

    ws.onclose = (event) => {
      console.log('WebSocket fechado:', event.code, event.reason)
      setWsStatus('disconnected')

      if (wsRetryCount < MAX_RETRY_ATTEMPTS) {
        setTimeout(() => {
          setWsRetryCount(prev => prev + 1)
          setupWebSocket()
        }, RETRY_DELAY)
      }
    }

    return ws
  }, [selectedRover, wsRetryCount])

  // Efeito para iniciar conexões e polling
  useEffect(() => {
    fetchTelemetryData()
    const ws = setupWebSocket()
    const telemetryInterval = setInterval(fetchTelemetryData, 5000)

    return () => {
      clearInterval(telemetryInterval)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [selectedRover, fetchTelemetryData, setupWebSocket])

  // Handler para mudança de rover
  const handleRoverChange = (selectedOption) => {
    setSelectedRover(selectedOption.value)
    setWsRetryCount(0)
    setError(null)
    showToast(`Rover alterado para ${selectedOption.value}`)
  }

  // Handler para seleção de missão
  const handleMissionChange = async (event) => {
    const mission = event.target.value
    if (!mission) return

    try {
      const response = await fetch(`${API_BASE_URL}/select-mission/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission,
          rover: selectedRover
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro na resposta do servidor: ${response.status}`)
      }

      const data = await response.json()
      console.log('Missão selecionada:', data)
      showToast(`Missão ${mission} iniciada`)
      setError(null)
    } catch (err) {
      console.error('Erro ao selecionar missão:', err)
      setError('Falha ao selecionar missão. Por favor, tente novamente.')
      showToast('Erro ao iniciar missão', 'error')
    }
  }

  // Função auxiliar para mostrar toast
  const showToast = (message, type = 'success') => {
    setToastMessage(message)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  // Render
  return (
    <>
      <CCard className="mb-4" style={{ padding: '20px', fontSize: '18px' }}>
        <CCardBody>
          <CRow>
            <CCol xs={12}>
              <h5 style={{ fontSize: '24px' }}>Selecione o Rover</h5>
              <Select
                value={roverOptions.find((option) => option.value === selectedRover)}
                onChange={handleRoverChange}
                options={roverOptions}
                components={{ Option: CustomOption }}
                styles={{
                  control: (provided) => ({
                    ...provided,
                    minHeight: '60px',
                  }),
                  valueContainer: (provided) => ({
                    ...provided,
                    padding: '10px 15px',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    fontSize: '18px',
                  }),
                }}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {error && (
        <CAlert color="warning" dismissible onDismiss={() => setError(null)}>
          {error}
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol xs={12} md={4}>
              <h5>Nível de Bateria</h5>
              <CProgress
                thin
                color="success"
                value={telemetryData.batteryLevel}
                className="mb-1"
              />
              <span>{telemetryData.batteryLevel}%</span>
            </CCol>
            <CCol xs={12} md={4}>
              <h5>Temperatura</h5>
              <CProgress
                thin
                color="warning"
                value={telemetryData.temperature}
                className="mb-1"
              />
              <span>{telemetryData.temperature}°C</span>
            </CCol>
            <CCol xs={12} md={4}>
              <h5>Velocidade</h5>
              <CProgress
                thin
                color="info"
                value={telemetryData.speed}
                className="mb-1"
              />
              <span>{telemetryData.speed} km/h</span>
            </CCol>
          </CRow>

          <CRow className="mt-4">
            <CCol xs={12}>
              <h5>Missões Pré-programadas</h5>
              <CFormSelect
                onChange={handleMissionChange}
                style={{ fontSize: '18px', padding: '10px' }}
                defaultValue=""
              >
                <option value="">Selecione uma missão</option>
                <option value="MISSAO A">MISSÃO A</option>
                <option value="MISSAO B">MISSÃO B</option>
                <option value="MISSAO C">MISSÃO C</option>
              </CFormSelect>
            </CCol>
          </CRow>

          {wsStatus === 'connected' && (
            <CAlert color="info" className="mt-3">
              Conexão em tempo real ativa
            </CAlert>
          )}
        </CCardBody>
      </CCard>

      <CToaster
        position="top-right"
        style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}
      >
        {toastVisible && (
          <CToast
            autohide={true}
            delay={3000}
            visible={toastVisible}
            onClose={() => setToastVisible(false)}
          >
            <CToastHeader closeButton>Notificação</CToastHeader>
            <CToastBody>{toastMessage}</CToastBody>
          </CToast>
        )}
      </CToaster>
    </>
  )
}

export default Dashboard
