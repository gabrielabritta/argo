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
} from '@coreui/react'
import { WS_BASE_URL } from 'src/config'

const CameraMonitoring = ({ roverId, substationId }) => {
  const [image, setImage] = useState(null)
  const [objectData, setObjectData] = useState([])
  const [toastVisible, setToastVisible] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const canvasRef = useRef(null)
  const wsRef = useRef(null)

  // 1. Conexão ao WebSocket
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/rovers/${roverId}/`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setWsConnected(true)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket received:', data) // Debug

      if (data.type === 'image_update') {
        // Atualizar imagem
        setImage(data.data.image)
        console.log('Image updated') // Debug
      } else if (data.type === 'boxes_update') {
        setObjectData(data.data.objects)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setWsConnected(false)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setWsConnected(false)
    }

    return () => {
      if (ws) ws.close()
    }
  }, [roverId])

  // 2. Desenhar a imagem + boxes no canvas
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        console.log('Image loaded, dimensions:', img.width, 'x', img.height) // Debug
        canvas.width = img.width
        canvas.height = img.height
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }

      img.src = `data:image/jpeg;base64,${image}`
    }
  }, [image])

  // 3. Evento de clique no canvas para identificar boxes
  const handleCanvasClick = (event) => {
    if (!canvasRef.current || !objectData?.length) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clickX = (event.clientX - rect.left) * scaleX
    const clickY = (event.clientY - rect.top) * scaleY

    objectData.forEach((obj, index) => {
      const [x1, y1, x2, y2] = obj.box
      const scaledX1 = x1 * canvas.width
      const scaledY1 = y1 * canvas.height
      const scaledX2 = x2 * canvas.width
      const scaledY2 = y2 * canvas.height

      if (clickX >= scaledX1 && clickX <= scaledX2 && clickY >= scaledY1 && clickY <= scaledY2) {
        // Exibe Toast
        setToastVisible(true)

        // Envia requisição HTTP para notificar o back-end
        fetch('/api/box-click/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boxIndex: index,
            coordinates: obj.box,
            tag: obj.tag,
            rover: roverId,
            substation: substationId,
          }),
        }).catch((error) => console.error('Error sending box-click:', error))
      }
    })
  }

  const handleRequestImage = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/request-image/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rover: roverId,
          substation: substationId, // Adicionar substationId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('request-image response:', data)
    } catch (error) {
      console.error('Error requesting image:', error)
      setToastVisible(true)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="m-0">Monitoramento de Câmera</h5>
        </div>
        {!wsConnected && <div className="text-danger fw-bold">Desconectado</div>}

        {/* Botão para Capturar Imagem */}
        <CButton color="primary" onClick={handleRequestImage}>
          Capturar Imagem
        </CButton>
      </CCardHeader>

      <CCardBody style={{ padding: 0 }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: 'auto', cursor: 'pointer' }}
        />
      </CCardBody>

      <CToaster position="top-right">
        {toastVisible && (
          <CToast
            autohide={true}
            delay={3000}
            visible={toastVisible}
            onClose={() => setToastVisible(false)}
          >
            <CToastHeader>Notificação</CToastHeader>
            <CToastBody>Box selecionada</CToastBody>
          </CToast>
        )}
      </CToaster>
    </CCard>
  )
}

export default CameraMonitoring
