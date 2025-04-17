import React, { useState, useEffect, useRef } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CFormRange,
  CRow,
  CCol,
  CAlert,
  CFormSelect,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormFeedback,
  CToast,
  CToastBody,
  CToastHeader
} from '@coreui/react'
import Hls from 'hls.js'
import { API_BASE_URL } from '../config'

const RTMPStream360 = (props) => {
  // Extrair parâmetros das props
  const { 
    roverId, 
    substationId,
    streamUrl = `${import.meta.env.VITE_HLS_URL}/hls/stream.m3u8`
  } = props;
  
  // Verificar se temos os IDs necessários
  useEffect(() => {
    if (!roverId || !substationId) {
      console.warn('RTMPStream360: roverId ou substationId não fornecidos. Usando valores padrão.');
    }
  }, [roverId, substationId]);

  // Refs
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const hlsRef = useRef(null)
  const viewerRef = useRef(null)
  const panoramaRef = useRef(null)
  const frameIntervalRef = useRef(null)
  const toastRef = useRef(null)

  // Estado
  const [isPlaying, setIsPlaying] = useState(false)
  const [fov, setFov] = useState(90)
  const [status, setStatus] = useState({ type: 'loading', message: 'Carregando...' })
  const [projectionType, setProjectionType] = useState('dual-fisheye')
  const [streamAddress, setStreamAddress] = useState(streamUrl)
  const [frameRate, setFrameRate] = useState(5) // 5 FPS por padrão, pode ser ajustado
  const [latency, setLatency] = useState(0)
  
  // Estado para configuração da Insta360
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configForm, setConfigForm] = useState({
    ssid: '',
    password: '',
    rtmp: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [responseToast, setResponseToast] = useState({
    visible: false,
    status: null,
    message: ''
  })
  
  // Valores efetivos dos IDs (usando valores padrão como fallback)
  const effectiveRoverId = roverId || 'Rover-Argo-N-0';
  const effectiveSubstationId = substationId || 'SUB001';

  // Inicializar o player
  useEffect(() => {
    if (!containerRef.current || !videoRef.current || !canvasRef.current) return

    // Inicializar o contexto do canvas
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctxRef.current = ctx

    // Configurar HLS
    const setupHls = () => {
      try {
        const video = videoRef.current
        if (!video) {
          console.error('Elemento de vídeo não encontrado para HLS')
          setStatus({ type: 'error', message: 'Erro ao inicializar player de vídeo' })
          return
        }

        if (!Hls.isSupported()) {
          console.warn('HLS não é suportado neste navegador')
          setStatus({ type: 'warning', message: 'Seu navegador pode não suportar streaming HLS' })
          // Tentar usar suporte nativo se disponível
          video.src = streamAddress
          return
        }

        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          // Configurações otimizadas para baixa latência
          maxBufferLength: 5,           // Reduzir de 30 para 5 segundos
          maxMaxBufferLength: 10,       // Limitar buffer máximo a 10 segundos
          liveSyncDuration: 1,          // Sincronizar com o ao vivo a cada 1 segundo
          liveMaxLatencyDuration: 5,    // Latência máxima de 5 segundos
          liveDurationInfinity: true,   // Tratar stream como infinito
          backBufferLength: 5,          // Reduzir buffer traseiro para 5 segundos
          // Configurações de fragmento
          fragLoadingMaxRetry: 15,      // Mais tentativas para carregar fragmentos
          manifestLoadingMaxRetry: 15,  // Mais tentativas para carregar manifesto
          levelLoadingMaxRetry: 15      // Mais tentativas para carregar níveis
        })

        hlsRef.current = hls
        console.log('HLS inicializado com sucesso')

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('HLS attached to video element')
          setStatus({ type: 'loading', message: 'Conectando ao stream...' })
          hls.loadSource(streamAddress)
        })

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('HLS manifest parsed, found ' + data.levels.length + ' quality levels')
          setStatus({ type: 'playing', message: 'Stream conectado' })

          // Iniciar reprodução automática
          video.play().catch(error => {
            console.error('Erro ao reproduzir vídeo:', error)
          })
        })

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Verificar se é um erro 404 (stream não encontrado)
                if (data.details === 'manifestLoadError') {
                  console.warn('Stream não disponível ainda:', data.response)
                  setStatus({
                    type: 'warning',
                    message: `Nenhum stream disponível. Inicie uma transmissão RTMP para ${import.meta.env.VITE_RTMP_URL}/stream`
                  })
                  // Tentar novamente após 5 segundos
                  setTimeout(() => {
                    if (hlsRef.current) {
                      hlsRef.current.startLoad()
                    }
                  }, 5000)
                } else {
                  console.error('HLS network error', data)
                  setStatus({ type: 'error', message: 'Erro de conexão com o stream' })
                  hls.startLoad()
                }
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('HLS media error', data)
                setStatus({ type: 'error', message: 'Erro de mídia' })
                hls.recoverMediaError()
                break
              default:
                console.error('HLS fatal error', data)
                setStatus({ type: 'error', message: 'Erro fatal no stream' })
                break
            }
          }
        })

        hls.attachMedia(video)

        // Eventos do vídeo
        video.addEventListener('play', () => {
          setIsPlaying(true)
          startFrameCapture()
        })

        video.addEventListener('pause', () => {
          setIsPlaying(false)
          stopFrameCapture()
        })

        video.addEventListener('canplay', () => {
          setStatus({ type: 'playing', message: 'Reproduzindo' })
          // Atualizar dimensões do canvas
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          console.log(`Dimensões do vídeo: ${video.videoWidth}x${video.videoHeight}`)
          // Iniciar captura de frames
          startFrameCapture()
        })
      } catch (error) {
        console.error('Erro ao configurar HLS:', error)
        setStatus({ type: 'error', message: 'Erro ao configurar player de vídeo' })
      }
    }

    // Configurar HLS
    setupHls()

    // Limpeza
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
      if (viewerRef.current) {
        viewerRef.current.dispose()
      }
      stopFrameCapture()
    }
  }, [streamAddress])

  // Função para iniciar a captura de frames
  const startFrameCapture = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
    }

    console.log(`Iniciando captura de frames a ${frameRate} FPS`)
    
    // Calculando o intervalo em milissegundos
    const intervalMs = 1000 / frameRate

    frameIntervalRef.current = setInterval(() => {
      captureFrame()
    }, intervalMs)
  }

  // Função para parar a captura de frames
  const stopFrameCapture = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
  }
  
  // Funções para configuração da Insta360
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setConfigForm({
      ...configForm,
      [name]: value
    })
  }

  const validateForm = () => {
    const errors = {}
    
    // Check SSID and password dependency
    if (configForm.ssid && !configForm.password) {
      errors.password = 'Password is required when SSID is provided'
    }
    
    if (configForm.password && !configForm.ssid) {
      errors.ssid = 'SSID is required when Password is provided'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    // Criar payload com os campos preenchidos e IDs
    const payload = {
      rover_id: effectiveRoverId,
      substation_id: effectiveSubstationId
    }
    
    if (configForm.ssid) payload.ssid = configForm.ssid
    if (configForm.password) payload.password = configForm.password
    if (configForm.rtmp) payload.rtmp = configForm.rtmp
    
    // Verificar se pelo menos um campo de configuração está preenchido
    if (!configForm.ssid && !configForm.password && !configForm.rtmp) {
      setFormErrors({ form: 'Pelo menos um campo deve ser preenchido' })
      return;
    }
    
    // Mostrar indicador de carregamento
    setResponseToast({
      visible: true,
      status: null,
      message: 'Enviando configuração...'
    })
    
    try {
      // Usar a URL relativa com API_BASE_URL do arquivo de configuração
      const apiUrl = `${API_BASE_URL || 'http://localhost:8000/api'}/configurar-insta360/`;
      console.log(`Enviando configuração para: ${apiUrl}`);
      console.log('Payload:', payload);
      
      // Enviar requisição para a API do backend
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      
      const result = await response.json()
      console.log('Resposta da API:', result);
      
      if (response.ok) {
        setResponseToast({
          visible: true,
          status: 1,
          message: `Configuração enviada com sucesso para ${effectiveRoverId}!`
        })
        
        // Resetar formulário em caso de sucesso
        setConfigForm({ ssid: '', password: '', rtmp: '' })
      } else {
        setResponseToast({
          visible: true,
          status: 0,
          message: `Erro: ${result.error || 'Falha ao enviar configuração'}`
        })
      }
    } catch (error) {
      console.error('Erro ao enviar configuração:', error)
      setResponseToast({
        visible: true,
        status: 0,
        message: `Erro de conexão: ${error.message}`
      })
    }
    
    // Fechar modal e resetar formulário
    setShowConfigModal(false)
    setConfigForm({ ssid: '', password: '', rtmp: '' })
  }

  // Função para capturar um frame do vídeo
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !ctxRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = ctxRef.current

    try {
      // Verificar se o vídeo está pronto
      if (video.readyState < 2) return

      // Desenhar o frame atual do vídeo no canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Obter a imagem do canvas como um dataURL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

      // Criar panorama com o frame capturado
      createPanorama(dataUrl)
    } catch (error) {
      console.error('Erro ao capturar frame:', error)
    }
  }

  // Função para criar panorama a partir de uma imagem
  const createPanorama = (imageUrl) => {
    if (!containerRef.current) return

    try {
      // Verificar se as bibliotecas estão disponíveis
      if (typeof PANOLENS === 'undefined' || typeof THREE === 'undefined') {
        console.error('PANOLENS ou THREE não estão disponíveis')
        setStatus({ type: 'error', message: 'Bibliotecas necessárias não encontradas' })
        return
      }

      // Limpar visualizador anterior se existir
      if (viewerRef.current) {
        try {
          // Remover panorama do visualizador antes de descartá-lo
          if (panoramaRef.current) {
            viewerRef.current.remove(panoramaRef.current)
          }
          viewerRef.current.dispose()
        } catch (error) {
          console.warn('Erro ao descartar visualizador:', error)
        }
        viewerRef.current = null
      }

      // Limpar panorama anterior se existir
      if (panoramaRef.current) {
        try {
          panoramaRef.current.dispose()
        } catch (error) {
          console.warn('Erro ao descartar panorama:', error)
        }
        panoramaRef.current = null
      }

      // Criar um novo panorama com a imagem
      let imagePanorama

      try {
        // Criar o panorama com base no tipo de projeção
        if (projectionType === 'dual-fisheye') {
          // Para dual-fisheye, podemos tentar usar o tipo DUAL_FISHEYE se disponível
          if (PANOLENS.ImagePanorama.TYPE && PANOLENS.ImagePanorama.TYPE.DUAL_FISHEYE) {
            console.log('Usando projeção DUAL_FISHEYE')
            imagePanorama = new PANOLENS.ImagePanorama(
              imageUrl,
              {
                imageType: PANOLENS.ImagePanorama.TYPE.DUAL_FISHEYE
              }
            )
          } else {
            // Fallback para panorama padrão
            console.log('DUAL_FISHEYE não disponível, usando panorama padrão')
            imagePanorama = new PANOLENS.ImagePanorama(imageUrl)
          }
        } else {
          // Panorama padrão para outros tipos
          imagePanorama = new PANOLENS.ImagePanorama(imageUrl)
        }

        panoramaRef.current = imagePanorama
      } catch (error) {
        console.error('Erro ao criar panorama de imagem:', error)
        // Tentar criar um panorama simples como fallback
        imagePanorama = new PANOLENS.ImagePanorama(imageUrl)
        panoramaRef.current = imagePanorama
      }

      // Configurar o visualizador
      const viewer = new PANOLENS.Viewer({
        container: containerRef.current,
        controlBar: false,
        autoRotate: false,
        autoRotateSpeed: 0.5,
        cameraFov: fov
      })
      viewerRef.current = viewer

      // Adicionar o panorama ao visualizador
      viewer.add(imagePanorama)
    } catch (error) {
      console.error('Erro ao criar panorama:', error)
    }
  }

  // Atualizar FOV quando mudar
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.setCameraFov(fov)
    }
  }, [fov])

  // Atualizar taxa de frames quando mudar
  useEffect(() => {
    if (isPlaying) {
      // Reiniciar a captura com a nova taxa
      stopFrameCapture()
      startFrameCapture()
    }
  }, [frameRate])

  // Reinicializar panorama quando o tipo de projeção mudar
  useEffect(() => {
    console.log('Tipo de projeção alterado para:', projectionType)
  }, [projectionType])

  // Controlar reprodução do vídeo
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play().catch(error => {
        console.error('Erro ao reproduzir vídeo:', error)
        setStatus({ type: 'error', message: 'Erro ao reproduzir: ' + error.message })
      })
    } else {
      video.pause()
    }
  }

  // Reiniciar stream
  const restartStream = () => {
    if (hlsRef.current && videoRef.current) {
      setStatus({ type: 'loading', message: 'Reconectando ao stream...' })
      hlsRef.current.stopLoad()
      hlsRef.current.startLoad()
      if (!videoRef.current.paused) {
        videoRef.current.play().catch(console.error)
      }
    }
  }

  // Forçar sincronização com o ao vivo (reduzir latência)
  const syncWithLive = () => {
    if (hlsRef.current && videoRef.current) {
      setStatus({ type: 'loading', message: 'Sincronizando com o ao vivo...' })

      try {
        // Obter o nível atual
        const currentLevel = hlsRef.current.currentLevel;

        // Parar carregamento
        hlsRef.current.stopLoad();

        // Verificar se a duração é válida antes de definir currentTime
        if (videoRef.current.duration &&
            isFinite(videoRef.current.duration) &&
            videoRef.current.duration > 0) {
          // Limpar buffer - ir para o final do stream menos 0.1 segundos
          const newTime = Math.max(0, videoRef.current.duration - 0.1);
          console.log(`Definindo currentTime para ${newTime}s (duração: ${videoRef.current.duration}s)`);
          videoRef.current.currentTime = newTime;
        } else {
          console.warn('Duração inválida:', videoRef.current.duration);
        }

        // Reiniciar carregamento no mesmo nível
        hlsRef.current.startLoad();
        if (currentLevel !== null && currentLevel !== undefined) {
          hlsRef.current.currentLevel = currentLevel;
        }

        // Reproduzir
        videoRef.current.play().then(() => {
          setStatus({ type: 'playing', message: 'Sincronizado com o ao vivo' })
        }).catch(error => {
          console.error('Erro ao sincronizar:', error)
          setStatus({ type: 'error', message: 'Erro ao sincronizar' })
        });
      } catch (error) {
        console.error('Erro ao sincronizar com o ao vivo:', error);
        setStatus({ type: 'error', message: 'Erro ao sincronizar' });
      }
    }
  }

  return (
    <>
      {responseToast.visible && (
        <CToast 
          ref={toastRef}
          visible={true} 
          autohide={true} 
          delay={5000} 
          onClose={() => setResponseToast({...responseToast, visible: false})}
          className={`mb-3 ${responseToast.status === 1 ? 'bg-success text-white' : 
                            responseToast.status === 0 ? 'bg-danger text-white' : 
                            'bg-info text-white'}`}
        >
          <CToastHeader closeButton>
            {responseToast.status === 1 ? 'Sucesso' : 
             responseToast.status === 0 ? 'Erro' : 'Informação'}
          </CToastHeader>
          <CToastBody>
            {responseToast.message}
          </CToastBody>
        </CToast>
      )}
      
      <CCard className="mb-4">
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4>Insta360 X3 - Player Stream RTMP 360° (Frame-by-Frame)</h4>
          <CButton
            color="success"
            size="sm"
            onClick={() => setShowConfigModal(true)}
          >
            Configurar Insta
          </CButton>
        </div>
        <div className="d-flex align-items-center">
          <CAlert color={
            status.type === 'loading' ? 'warning' :
            status.type === 'playing' ? 'success' :
            'danger'
          }
          className="py-1 px-3 mb-0 me-2">
            {status.message}
          </CAlert>

          {/* Indicador de FPS */}
          <CAlert
            color="info"
            className="py-1 px-3 mb-0 me-2 d-flex align-items-center"
          >
            <i className="cil-movie me-1"></i>
            {frameRate} FPS
          </CAlert>
        </div>
      </CCardHeader>
      <CCardBody>
        <div id="video-container" style={{
          position: 'relative',
          width: '100%',
          height: '0',
          paddingBottom: '56.25%',
          marginBottom: '20px',
          backgroundColor: '#000',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Container para o panorama */}
          <div
            ref={containerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 2
            }}
          />

          {/* Vídeo original (escondido) */}
          <video
            ref={videoRef}
            crossOrigin="anonymous"
            muted
            playsInline
            autoPlay
            loop
            style={{
              display: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />

          {/* Canvas para capturar frames (escondido) */}
          <canvas
            ref={canvasRef}
            style={{
              display: 'none',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
        </div>

        <div className="mb-3">
          <CButton color="primary" onClick={togglePlay} className="me-2">
            <i className={`cil-${isPlaying ? 'media-pause' : 'media-play'}`}></i> {isPlaying ? 'Pausar' : 'Reproduzir'}
          </CButton>
          <CButton color="warning" onClick={restartStream} className="me-2">
            <i className="cil-loop-circular"></i> Reiniciar Stream
          </CButton>
          <CButton color="danger" onClick={syncWithLive} className="me-2">
            <i className="cil-speedometer"></i> Sincronizar Ao Vivo
          </CButton>
        </div>

        <CRow className="mb-3">
          <CCol md={6}>
            <label htmlFor="fov-range" className="form-label">
              Zoom / Campo de Visão: <span>{fov}°</span>
            </label>
            <CFormRange
              id="fov-range"
              min="30"
              max="120"
              value={fov}
              onChange={(e) => setFov(parseInt(e.target.value))}
            />
          </CCol>
          <CCol md={6}>
            <label htmlFor="fps-range" className="form-label">
              Taxa de Frames (FPS): <span>{frameRate}</span>
            </label>
            <CFormRange
              id="fps-range"
              min="1"
              max="30"
              value={frameRate}
              onChange={(e) => setFrameRate(parseInt(e.target.value))}
            />
          </CCol>
        </CRow>

        <CRow>
          <CCol>
            <CFormSelect
              className="mb-3"
              aria-label="Tipo de Projeção"
              value={projectionType}
              onChange={(e) => setProjectionType(e.target.value)}
            >
              <option value="equirectangular">Equiretangular (padrão)</option>
              <option value="dual-fisheye">Dual Fisheye (Insta360)</option>
            </CFormSelect>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
    
    {/* Modal de Configuração da Insta360 */}
    <CModal visible={showConfigModal} onClose={() => setShowConfigModal(false)}>
      <CModalHeader>
        <CModalTitle>Configurar Câmera Insta360</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {formErrors.form && (
          <CAlert color="danger">{formErrors.form}</CAlert>
        )}
        <CForm>
          <div className="mb-3">
            <CFormLabel htmlFor="ssid">WiFi SSID</CFormLabel>
            <CFormInput
              type="text"
              id="ssid"
              name="ssid"
              value={configForm.ssid}
              onChange={handleInputChange}
              invalid={!!formErrors.ssid}
            />
            {formErrors.ssid && (
              <CFormFeedback invalid>{formErrors.ssid}</CFormFeedback>
            )}
          </div>
          
          <div className="mb-3">
            <CFormLabel htmlFor="password">WiFi Password</CFormLabel>
            <CFormInput
              type="password"
              id="password"
              name="password"
              value={configForm.password}
              onChange={handleInputChange}
              invalid={!!formErrors.password}
            />
            {formErrors.password && (
              <CFormFeedback invalid>{formErrors.password}</CFormFeedback>
            )}
          </div>
          
          <div className="mb-3">
            <CFormLabel htmlFor="rtmp">RTMP URL</CFormLabel>
            <CFormInput
              type="text"
              id="rtmp"
              name="rtmp"
              value={configForm.rtmp}
              onChange={handleInputChange}
            />
          </div>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => setShowConfigModal(false)}>
          Cancelar
        </CButton>
        <CButton color="primary" onClick={handleSubmit}>
          Salvar Configuração
        </CButton>
      </CModalFooter>
    </CModal>
    </>
  )
}

export default RTMPStream360
