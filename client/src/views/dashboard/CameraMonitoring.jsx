// src/views/dashboard/CameraMonitoring.jsx
import React, { useState, useEffect, useRef } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
  CFormRange,
  CTooltip,
} from '@coreui/react'
import { WS_BASE_URL, API_BASE_URL } from 'src/config'

const CameraMonitoring = ({ roverId, substationId }) => {
  const [image, setImage] = useState(null)
  const [objectData, setObjectData] = useState([])
  const [toastVisible, setToastVisible] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showZoomTooltip, setShowZoomTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0 })
  const tooltipTimeoutRef = useRef(null)
  const rangeRef = useRef(null)
  const [toastMessage, setToastMessage] = useState('Box selecionada')
  const [toastType, setToastType] = useState('info')

  // 1. Conexão ao WebSocket
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/rovers/${roverId}/`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket conectado')
      setWsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('WebSocket recebeu:', data)

        // Handle direct message format or wrapped format
        if (data.type === 'image_update') {
          setImage(data.data.image)
        } else if (data.type === 'boxes_update') {
          setObjectData(data.data.objects)
        } else if (Array.isArray(data)) {
          // Direct array of objects format
          setObjectData(data)
        } else {
          // Try to parse as direct message
          setObjectData([data])
        }
      } catch (err) {
        console.error('Erro ao parsear mensagem WebSocket:', err)
      }
    }

    ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error)
      setWsConnected(false)
    }

    ws.onclose = () => {
      console.log('WebSocket desconectado')
      setWsConnected(false)
    }

    return () => {
      if (ws) ws.close()
    }
  }, [roverId])

  // 2. Desenhar a imagem e as boxes no canvas
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        const originalWidth = img.width
        const originalHeight = img.height

        // Dimensões do container
        const containerWidth = canvas.parentElement.clientWidth
        const containerHeight = canvas.parentElement.clientHeight - 40

        // Ajusta o canvas para o tamanho do container
        canvas.width = containerWidth
        canvas.height = containerHeight

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Desenha a imagem ajustada ao canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Desenhar bounding boxes com estilo moderno
        if (objectData && Array.isArray(objectData)) {
          objectData.forEach((obj) => {
            if (!obj || typeof obj.x1 === 'undefined') return;
            
            const x1 = obj.x1 * canvas.width
            const y1 = obj.y1 * canvas.height
            const width = (obj.x2 - obj.x1) * canvas.width
            const height = (obj.y2 - obj.y1) * canvas.height

            // Gradiente para borda
            const gradient = ctx.createLinearGradient(x1, y1, x1 + width, y1 + height)
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)')
            gradient.addColorStop(1, 'rgba(0, 128, 255, 0.8)')

            // Desenha a box com efeito de glow
            ctx.shadowColor = 'rgba(0, 255, 255, 0.5)'
            ctx.shadowBlur = 10
            ctx.strokeStyle = gradient
            ctx.lineWidth = 2
            ctx.setLineDash([5, 3])
            ctx.strokeRect(x1, y1, width, height)
            ctx.setLineDash([])
            ctx.shadowBlur = 0

            // Desenha o rótulo com design moderno
            const label = `${obj.class} ${Math.round(obj.confidence * 100)}%`
            const padding = 8
            const fontSize = 14
            ctx.font = `${fontSize}px Inter, system-ui, -apple-system, sans-serif`
            const textWidth = ctx.measureText(label).width
            const labelHeight = fontSize + padding * 2
            const labelY = y1 > labelHeight ? y1 - labelHeight : y1 + labelHeight

            // Fundo do rótulo com gradiente
            const labelGradient = ctx.createLinearGradient(x1, labelY, x1 + textWidth + padding * 2, labelY + labelHeight)
            labelGradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)')
            labelGradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)')
            
            // Desenha o fundo do rótulo com cantos arredondados
            ctx.fillStyle = labelGradient
            const radius = 4
            ctx.beginPath()
            ctx.moveTo(x1 + radius, labelY)
            ctx.lineTo(x1 + textWidth + padding * 2 - radius, labelY)
            ctx.quadraticCurveTo(x1 + textWidth + padding * 2, labelY, x1 + textWidth + padding * 2, labelY + radius)
            ctx.lineTo(x1 + textWidth + padding * 2, labelY + labelHeight - radius)
            ctx.quadraticCurveTo(x1 + textWidth + padding * 2, labelY + labelHeight, x1 + textWidth + padding * 2 - radius, labelY + labelHeight)
            ctx.lineTo(x1 + radius, labelY + labelHeight)
            ctx.quadraticCurveTo(x1, labelY + labelHeight, x1, labelY + labelHeight - radius)
            ctx.lineTo(x1, labelY + radius)
            ctx.quadraticCurveTo(x1, labelY, x1 + radius, labelY)
            ctx.closePath()
            ctx.fill()

            // Texto do rótulo com sombra suave
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
            ctx.shadowBlur = 2
            ctx.shadowOffsetY = 1
            ctx.fillStyle = '#fff'
            ctx.fillText(label, x1 + padding, labelY + padding + fontSize - 2)
            ctx.shadowBlur = 0
            ctx.shadowOffsetY = 0
        })
      }

      img.onerror = (err) => {
        console.error('Erro ao carregar a imagem:', err)
      }

      img.src = `data:image/jpeg;base64,${image}`
    }
  }, [image, objectData])

  // 3. Evento de clique no canvas para identificar boxes
  const handleCanvasClick = (event) => {
    if (!canvasRef.current || !objectData?.length) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clickX = (event.clientX - rect.left) * scaleX
    const clickY = (event.clientY - rect.top) * scaleY

    // Normaliza as coordenadas do clique para 0-1
    const normalizedX = clickX / canvas.width
    const normalizedY = clickY / canvas.height

    for (const obj of objectData) {
      if (normalizedX >= obj.x1 && normalizedX <= obj.x2 && 
          normalizedY >= obj.y1 && normalizedY <= obj.y2) {
        
        // Exibe Toast com informações da box
        setToastMessage(`${obj.class} - Confiança: ${Math.round(obj.confidence * 100)}%`)
        setToastType('info')
        setToastVisible(true)

        // Envia a box clicada via WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const message = {
            topic: `substations/${substationId}/rovers/${roverId}/box_click`,
            payload: obj
          }
          wsRef.current.send(JSON.stringify(message))
        }
        
        break
      }
    }
  }

  // 4. Função para solicitar uma nova imagem
  const handleRequestImage = async () => {
    try {
      setToastVisible(false) // Reset toast anterior
      
      const response = await fetch(`${API_BASE_URL}/request-image/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rover: roverId,
          substation: substationId,
          zoom: zoomLevel
        }),
      })

      // Primeiro verifica se a resposta está ok
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || `Erro HTTP! status: ${response.status}`
        } catch {
          errorMessage = `Erro HTTP! status: ${response.status}`
        }
        throw new Error(errorMessage)
      }

      // Tenta fazer o parse do JSON apenas se a resposta estiver ok
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.warn('Resposta vazia ou inválida:', parseError)
        data = {}
      }

      console.log('Resposta request-image:', data)
      
      // Mostrar toast de sucesso
      setToastMessage(data.message || 'Comando de captura enviado com sucesso')
      setToastType('success')
      setToastVisible(true)
    } catch (error) {
      console.error('Erro ao solicitar imagem:', error)
      // Mostrar toast de erro
      setToastMessage('Erro ao solicitar imagem: ' + error.message)
      setToastType('danger')
      setToastVisible(true)
    }
  }

  // 5. Atualiza a posição do tooltip com base em divisões discretas (20 pedaços)
  const updateTooltipPosition = (value) => {
    if (!rangeRef.current) return
    const range = rangeRef.current
    const rect = range.getBoundingClientRect()

    // Posição relativa no slider (0 a 1)
    const relativePosition = (value - 1) / 19

    // Posição absoluta em pixels (dentro do range)
    const leftRelative = rect.width * relativePosition

    setTooltipPosition({ left: leftRelative })
  }

  // 6. Atualiza o zoom (valor discreto) e posiciona o tooltip
  const handleZoomChange = (event) => {
    const newZoom = parseInt(event.target.value, 10)
    setZoomLevel(newZoom)
    setShowZoomTooltip(true)
    updateTooltipPosition(newZoom)
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
  }

  // 7. Envia o zoom para o backend e mantém o tooltip visível por mais tempo
  const handleZoomComplete = async () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowZoomTooltip(false)
    }, 3000) // Tooltip visível por 3 segundos após soltar

    try {
      const response = await fetch('/api/update-zoom/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rover: roverId,
          substation: substationId,
          zoom: zoomLevel,
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.image) {
        setImage(data.image)
      }
    } catch (error) {
      console.error('Erro ao atualizar zoom:', error)
    }
  }

  // Limpa o timeout quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="m-0">Monitoramento de Câmera</h5>
        </div>
        {!wsConnected && <div className="text-danger fw-bold">Desconectado</div>}

        <CButton 
          color="primary" 
          onClick={handleRequestImage}
          disabled={!wsConnected}
        >
          Capturar Imagem
        </CButton>
      </CCardHeader>

      <CCardBody
        className="d-flex flex-column p-0"
        style={{ 
          minHeight: '0',
          height: 'calc(100vh - 400px)',
          backgroundColor: '#2c2c2c' 
        }}
      >
        {/* Container do canvas sem padding */}
        <div 
          style={{ 
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            // padding: '20px', // removido para evitar grandes margens
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Slider de Zoom */}
        <div className="px-3 py-2" style={{ backgroundColor: '#1e1e1e', borderTop: '1px solid #3a3a3a' }}>
          <CTooltip
            content={`Zoom: ${zoomLevel}x`}
            placement="top"
            visible={showZoomTooltip}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: `${tooltipPosition.left}px`,
              transform: 'translateX(-50%)',
              zIndex: 1000,
              marginBottom: '4px'
            }}
          >
            <div className="position-relative">
              <CFormRange
                ref={rangeRef}
                min={1}
                max={20}
                step={1}
                value={zoomLevel}
                onChange={handleZoomChange}
                onMouseUp={handleZoomComplete}
                onTouchEnd={handleZoomComplete}
                className="mb-0"
                style={{ 
                  backgroundColor: '#2c2c2c',
                  borderColor: '#3a3a3a'
                }}
              />
            </div>
          </CTooltip>
        </div>
      </CCardBody>

      <CToaster position="top-right">
        {toastVisible && (
          <CToast
            autohide={true}
            delay={3000}
            visible={toastVisible}
            onClose={() => setToastVisible(false)}
            color={toastType}
          >
            <CToastHeader closeButton={false}>Notificação</CToastHeader>
            <CToastBody>{toastMessage}</CToastBody>
          </CToast>
        )}
      </CToaster>
    </CCard>
  )
}

export default CameraMonitoring
