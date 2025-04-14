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

        if (data.type === 'image_update') {
          setImage(data.data.image)
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

  // Função para enviar box clicada via WebSocket
  const handleBoxClick = (box) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        topic: `substations/${substationId}/rovers/${roverId}/box_clicked`,
        payload: box
      }
      wsRef.current.send(JSON.stringify(message))
      setToastMessage(`Box selecionada: ${box.class}`)
      setToastType('info')
      setToastVisible(true)
    }
  }

  // 2. Desenhar a imagem e as boxes no canvas
  useEffect(() => {
    console.log('Image state:', image)
    console.log('ObjectData state:', objectData)
    if (image && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        console.log('Image loaded successfully')
        // Limpar o canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Ajustar dimensões do canvas para corresponder à imagem
        canvas.width = img.width
        canvas.height = img.height

        // Desenhar a imagem
        ctx.drawImage(img, 0, 0)

        // Desenhar as boxes
        if (objectData && objectData.length > 0) {
          objectData.forEach((box, index) => {
            const x = box.x1 * canvas.width
            const y = box.y1 * canvas.height
            const width = (box.x2 - box.x1) * canvas.width
            const height = (box.y2 - box.y1) * canvas.height

            // Estilo moderno para as boxes
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)' // Ciano transparente
            ctx.lineWidth = 2
            ctx.setLineDash([5, 3]) // Linha tracejada
            ctx.strokeRect(x, y, width, height)

            // Texto minimalista
            ctx.font = '12px Inter, sans-serif'
            ctx.fillStyle = 'white'
            const text = `${box.class} (${Math.round(box.confidence * 100)}%)`
            const padding = 4

            // Fundo do texto
            const textMetrics = ctx.measureText(text)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
            ctx.fillRect(
              x,
              y - 20,
              textMetrics.width + padding * 2,
              20
            )

            // Texto
            ctx.fillStyle = 'white'
            ctx.fillText(text, x + padding, y - 6)
          })
        }
      }

      img.onerror = (error) => {
        console.error('Error loading image:', error)
      }

      console.log('Setting image source with base64 string length:', image?.length)
      img.src = `data:image/jpeg;base64,${image}`

      // Adicionar evento de clique
      const handleCanvasClick = (event) => {
        const rect = canvas.getBoundingClientRect()
        const x = (event.clientX - rect.left) / canvas.width
        const y = (event.clientY - rect.top) / canvas.height

        // Verificar se clicou em alguma box
        const clickedBox = objectData.find(box => 
          x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2
        )

        if (clickedBox) {
          handleBoxClick(clickedBox)
        }
      }

      canvas.addEventListener('click', handleCanvasClick)
      return () => canvas.removeEventListener('click', handleCanvasClick)
    }
  }, [image, objectData, substationId, roverId]);

  // 3. Evento de clique no canvas para identificar boxes
  const handleCanvasClick = (event) => {
    if (!canvasRef.current || !objectData?.length) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    let boxClicked = false;

    objectData.forEach((obj, index) => {
      const [x1, y1, x2, y2] = obj.box;
      // Lógica de rotação
      const rotatedX1 = y1 * canvas.width;
      const rotatedY1 = x1 * canvas.height;
      const rotatedX2 = y2 * canvas.width;
      const rotatedY2 = x2 * canvas.height;

      if (
        clickX >= rotatedX1 &&
        clickX <= rotatedX2 &&
        clickY >= rotatedY1 &&
        clickY <= rotatedY2
      ) {
        boxClicked = true;

        // Exibe Toast
        setToastVisible(true);

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
        }).catch((error) => console.error('Erro ao enviar box-click:', error));
      }
    });

    if (!boxClicked) {
      console.log('Nenhum box foi clicado');
    }
  };

  // 4. Função para solicitar uma nova imagem
  const handleRequestImage = async () => {
    try {
      setToastVisible(false); // Reset toast anterior

      const response = await fetch(`${API_BASE_URL}/request-image/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rover: roverId,
          substation: substationId,
          zoom: zoomLevel,
        }),
      });

      // Primeiro verifica se a resposta está ok
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || `Erro HTTP! status: ${response.status}`;
        } catch {
          errorMessage = `Erro HTTP! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // Tenta fazer o parse do JSON apenas se a resposta estiver ok
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.warn('Resposta vazia ou inválida:', parseError);
        data = {};
      }

      console.log('Resposta request-image:', data);

      // Mostrar toast de sucesso
      setToastMessage(data.message || 'Comando de captura enviado com sucesso');
      setToastType('success');
      setToastVisible(true);
    } catch (error) {
      console.error('Erro ao solicitar imagem:', error);
      // Mostrar toast de erro
      setToastMessage('Erro ao solicitar imagem: ' + error.message);
      setToastType('danger');
      setToastVisible(true);
    }
  };

  // 5. Atualiza a posição do tooltip com base em divisões discretas (20 pedaços)
  const updateTooltipPosition = (value) => {
    if (!rangeRef.current) return;
    const range = rangeRef.current;
    const rect = range.getBoundingClientRect();

    // Posição relativa no slider (0 a 1)
    const relativePosition = (value - 1) / 19;

    // Posição absoluta em pixels (dentro do range)
    const leftRelative = rect.width * relativePosition;

    setTooltipPosition({ left: leftRelative });
  };

  // 6. Atualiza o zoom (valor discreto) e posiciona o tooltip
  const handleZoomChange = (event) => {
    const newZoom = parseInt(event.target.value, 10);
    setZoomLevel(newZoom);
    setShowZoomTooltip(true);
    updateTooltipPosition(newZoom);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
  };

  // 7. Envia o zoom para o backend e mantém o tooltip visível por mais tempo
  const handleZoomComplete = async () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowZoomTooltip(false);
    }, 3000); // Tooltip visível por 3 segundos após soltar

    try {
      const response = await fetch('/api/update-zoom/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rover: roverId,
          substation: substationId,
          zoom: zoomLevel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.image) {
        setImage(data.image);
      }
    } catch (error) {
      console.error('Erro ao atualizar zoom:', error);
    }
  };

  // Limpa o timeout quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

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
          backgroundColor: '#2c2c2c',
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
