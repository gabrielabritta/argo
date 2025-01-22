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
import { WS_BASE_URL } from 'src/config' // Assegure-se de que este caminho está correto

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
      console.log('WebSocket conectado')
      setWsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('WebSocket recebeu:', data) // Debug

        if (data.type === 'image_update') {
          // Atualizar imagem
          setImage(data.data.image)
          console.log('Imagem atualizada') // Debug
        } else if (data.type === 'boxes_update') {
          setObjectData(data.data.objects)
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

  // 2. Desenhar a imagem + boxes no canvas
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        console.log('Imagem carregada, dimensões:', img.width, 'x', img.height) // Debug
        canvas.width = img.width
        canvas.height = img.height
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        // Desenhar boxes
        objectData.forEach((obj) => {
          const [x1, y1, x2, y2] = obj.box
          const scaledX1 = x1 * canvas.width
          const scaledY1 = y1 * canvas.height
          const scaledX2 = x2 * canvas.width
          const scaledY2 = y2 * canvas.height
          const boxWidth = scaledX2 - scaledX1
          const boxHeight = scaledY2 - scaledY1

          // Desenhar retângulo da box
          ctx.strokeStyle = '#00FF00' // Cor da borda
          ctx.lineWidth = 2
          ctx.strokeRect(scaledX1, scaledY1, boxWidth, boxHeight)

          // Desenhar etiqueta (tag) se existir
          if (obj.tag) {
            ctx.fillStyle = '#00FF00' // Cor da etiqueta
            ctx.font = '16px Arial'
            ctx.fillText(obj.tag, scaledX1, scaledY1 - 5)
          }
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

    // Variável para verificar se algum box foi clicado
    let boxClicked = false

    objectData.forEach((obj, index) => {
      const [x1, y1, x2, y2] = obj.box
      const scaledX1 = x1 * canvas.width
      const scaledY1 = y1 * canvas.height
      const scaledX2 = x2 * canvas.width
      const scaledY2 = y2 * canvas.height

      if (clickX >= scaledX1 && clickX <= scaledX2 && clickY >= scaledY1 && clickY <= scaledY2) {
        boxClicked = true

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
        }).catch((error) => console.error('Erro ao enviar box-click:', error))
      }
    })

    // Opcional: Exibir Toast diferente se nenhum box foi clicado
    if (!boxClicked) {
      // Você pode optar por não exibir nada ou exibir uma mensagem diferente
      console.log('Nenhum box foi clicado')
    }
  }

  // 4. Função para solicitar uma nova imagem
  const handleRequestImage = async () => {
    try {
      const response = await fetch('/api/request-image/', {
        // Use URL relativa
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rover: roverId,
          substation: substationId, // Adicionar substationId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro HTTP! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Resposta request-image:', data)
    } catch (error) {
      console.error('Erro ao solicitar imagem:', error)
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

      {/* Toaster para notificações */}
      <CToaster position="top-right">
        {toastVisible && (
          <CToast
            autohide={true}
            delay={3000}
            visible={toastVisible}
            onClose={() => setToastVisible(false)}
          >
            <CToastHeader closeButton={false}>Notificação</CToastHeader>
            <CToastBody>Box selecionada</CToastBody>
          </CToast>
        )}
      </CToaster>
    </CCard>
  )
}

export default CameraMonitoring
