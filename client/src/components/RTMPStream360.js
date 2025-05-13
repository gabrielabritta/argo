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
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormFeedback,
  CToast,
  CToastBody
} from '@coreui/react'
import '@coreui/icons/css/all.min.css'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import 'videojs-vr'
import { API_BASE_URL, WS_BASE_URL } from '../config'

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
  const videoPlayerRef = useRef(null)
  const playerRef = useRef(null)
  const timeoutRef = useRef(null)
  const responseReceivedRef = useRef(false)

  // Estado
  const [status, setStatus] = useState({ type: 'loading', message: 'Carregando...' })
  const [streamAddress, setStreamAddress] = useState(streamUrl)

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
  const [isInstaConnected, setIsInstaConnected] = useState(false)
  const [isLiveActive, setIsLiveActive] = useState(false)
  const [isLive, setIsLive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Valores efetivos dos IDs (usando valores padrão como fallback)
  const effectiveRoverId = roverId || 'Rover-Argo-N-0';
  const effectiveSubstationId = substationId || 'SUB001';

  // Inicializar o player Video.js
  useEffect(() => {
    // Verificar se o elemento de vídeo existe
    if (!videoPlayerRef.current) return;

    // Configurações do player Video.js
    const videoOptions = {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [{
        src: streamAddress,
        type: 'application/x-mpegURL'
      }],
      html5: {
        vhs: {
          overrideNative: true,
          // Configurações para baixa latência
          maxBufferLength: 5,
          maxMaxBufferLength: 10,
          liveSyncDuration: 1,
          liveMaxLatencyDuration: 5,
          liveDurationInfinity: true,
          backBufferLength: 5
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false
      },
      liveui: true,
      playbackRates: [0.5, 1, 1.5, 2]
    };

    // Inicializar o player
    let player = videojs(videoPlayerRef.current, videoOptions, function onPlayerReady() {
      console.log('Player pronto', this);
      setStatus({ type: 'loading', message: 'Conectando ao stream...' });

      // Definir metadados para o player VR
      this.mediainfo = this.mediainfo || {};
      this.mediainfo.projection = 'equirectangular';

      // Inicializar o plugin VR
      this.vr({
        projection: 'equirectangular',
        debug: false,
        forceCardboard: false,
        defaultFov: 90
      });

      // Eventos do player
      this.on('playing', () => {
        console.log('Vídeo em reprodução');
        setStatus({ type: 'playing', message: 'Reproduzindo' });
      });

      this.on('error', (error) => {
        console.error('Erro no player:', error);
        setStatus({ type: 'error', message: 'Erro no player de vídeo' });
      });

      // Verificar se o stream está disponível
      this.on('error', function(e) {
        if (this.error().code === 4) {
          // Erro de mídia não disponível
          console.warn('Stream não disponível ainda');
          setStatus({
            type: 'warning',
            message: `Nenhum stream disponível. Inicie uma transmissão RTMP para ${import.meta.env.VITE_RTMP_URL}/stream`
          });

          // Tentar novamente após 5 segundos
          setTimeout(() => {
            if (playerRef.current) {
              playerRef.current.src({
                src: streamAddress,
                type: 'application/x-mpegURL'
              });
              playerRef.current.load();
            }
          }, 5000);
        }
      });
    });

    // Salvar referência do player
    playerRef.current = player;

    // Limpeza ao desmontar o componente
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      clearTimeout(timeoutRef.current);
    };
  }, [streamAddress]);

  // WebSocket para respostas de configuração Insta360
  useEffect(() => {
    console.log(`Conectando WebSocket para rover ${effectiveRoverId} em ${WS_BASE_URL}/rovers/${effectiveRoverId}/`)
    const socket = new WebSocket(`${WS_BASE_URL}/rovers/${effectiveRoverId}/`)

    socket.onopen = () => {
      console.log('WebSocket Insta360 conectado com sucesso')
    }

    socket.onmessage = (event) => {
      try {
        console.log('WebSocket raw message received:', event.data)
        const msg = JSON.parse(event.data)
        console.log('WebSocket parsed message:', msg)

        if (msg.type === 'insta_config') {
          console.log('Insta360 config message received:', msg.data)
          responseReceivedRef.current = true
          clearTimeout(timeoutRef.current)

          // Garantir que o status seja tratado como número
          let status = msg.data.status
          if (typeof status === 'string') {
            status = parseInt(status, 10)
            console.log('Status convertido de string para número:', status)
          }

          console.log('Status final para toast:', status, typeof status)

          // Definir o toast com o status correto
          setResponseToast({
            visible: true,
            status: status,
            message: status === 1
              ? 'Configuração aplicada com sucesso!'
              : 'Erro ao aplicar configuração.'
          })

          console.log('Toast configurado:', {
            visible: true,
            status: status,
            message: status === 1 ? 'Configuração aplicada com sucesso!' : 'Erro ao aplicar configuração.'
          })
        } else if (msg.type === 'insta_connect') {
          console.log('Insta360 connect message received:', msg.data)
          const status = msg.data.status

          // Atualizar estado de conexão
          setIsInstaConnected(status === 1)

          // Mostrar mensagem apropriada
          let message = ''
          switch(status) {
            case 1:
              message = 'Conectado com sucesso!'
              break
            case 0:
              message = 'Desconectado com sucesso!'
              break
            case -1:
              message = 'Rede não encontrada'
              break
            case -2:
              message = 'Credenciais não configuradas'
              break
            case -3:
              message = 'Erro de conexão com a Insta'
              break
            default:
              message = 'Erro desconhecido'
          }

          setResponseToast({
            visible: true,
            status: status === 1 ? 1 : 0,
            message: message
          })
        } else if (msg.type === 'insta_live') {
          console.log('Insta360 live message received:', msg.data)
          const status = msg.data.status

          // Atualizar estado de live
          setIsLiveActive(status === 1)

          // Mostrar mensagem apropriada
          let message = ''
          switch(status) {
            case 1:
              message = 'Live iniciada com sucesso!'
              break
            case 0:
              message = 'Live parada com sucesso!'
              break
            case -1:
              message = 'Erro ao iniciar/parar live'
              break
            default:
              message = 'Erro desconhecido'
          }

          setResponseToast({
            visible: true,
            status: status === 1 ? 1 : 0,
            message: message
          })
        } else if (msg.type === 'insta_capture') {
          console.log('Insta360 capture message received:', msg.data)
          setIsCapturing(false)
        }
      } catch (e) {
        console.error('Erro ao processar mensagem WebSocket:', e)
        console.error('Dados da mensagem com erro:', event.data)
      }
    }

    socket.onerror = (e) => {
      console.error('Erro na conexão WebSocket:', e)
    }

    socket.onclose = (e) => {
      console.log(`WebSocket fechado com código ${e.code}, razão: ${e.reason}`)
    }

    return () => {
      console.log('Limpando conexão WebSocket')
      socket.close()
      clearTimeout(timeoutRef.current)
    }
  }, [effectiveRoverId]);

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
    responseReceivedRef.current = false
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

      if (!response.ok) {
        setResponseToast({
          visible: true,
          status: 0,
          message: `Erro: ${result.error || 'Falha ao enviar configuração'}`
        })
        return
      }
      // Em caso de sucesso, aguardar resposta do dispositivo via WebSocket
    } catch (error) {
      console.error('Erro ao enviar configuração:', error)
      setResponseToast({
        visible: true,
        status: 0,
        message: `Erro de conexão: ${error.message}`
      })
    }

    // Iniciar timeout de resposta da câmera
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (!responseReceivedRef.current) {
        setResponseToast({
          visible: true,
          status: 0,
          message: 'Tempo de espera esgotado - Sem conexão com a câmera.'
        })
      }
    }, 10000)

    // Fechar modal e resetar formulário
    setShowConfigModal(false)
    setConfigForm({ ssid: '', password: '', rtmp: '' })
  }

  // Função para conectar/desconectar Insta360
  const handleInstaConnect = async () => {
    try {
      const response = await fetch(`${API_BASE_URL || 'http://localhost:8000/api'}/conectar-insta360/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rover_id: effectiveRoverId,
          substation_id: effectiveSubstationId,
          connect: isInstaConnected ? 0 : 1
        })
      })

      const result = await response.json()
      if (!response.ok) {
        setResponseToast({
          visible: true,
          status: 0,
          message: `Erro: ${result.error || 'Falha ao enviar comando'}`
        })
      }
    } catch (error) {
      console.error('Erro ao enviar comando de conexão:', error)
      setResponseToast({
        visible: true,
        status: 0,
        message: `Erro de conexão: ${error.message}`
      })
    }
  }

  // Função para iniciar/parar live
  const handleLiveToggle = async () => {
    try {
      const response = await fetch(`${API_BASE_URL || 'http://localhost:8000/api'}/iniciar-live-insta360/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rover_id: effectiveRoverId,
          substation_id: effectiveSubstationId,
          live: isLiveActive ? 0 : 1
        })
      })

      const result = await response.json()
      if (!response.ok) {
        setResponseToast({
          visible: true,
          status: 0,
          message: `Erro: ${result.error || 'Falha ao enviar comando'}`
        })
      }
    } catch (error) {
      console.error('Erro ao enviar comando de live:', error)
      setResponseToast({
        visible: true,
        status: 0,
        message: `Erro de conexão: ${error.message}`
      })
    }
  }

  const handleLive = async () => {
    try {
      const response = await fetch(`${API_BASE_URL || 'http://localhost:8000/api'}/rover/${roverId}/insta/live/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: isLive ? 0 : 1
        }),
      });

      if (response.ok) {
        setIsLive(!isLive);
      }
    } catch (error) {
      console.error('Error toggling live:', error);
    }
  };

  const handleCapture = async () => {
    try {
      setIsCapturing(true);
      const response = await fetch(`${API_BASE_URL || 'http://localhost:8000/api'}/rover/${roverId}/insta/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 1
        }),
      });

      if (!response.ok) {
        console.error('Error capturing photo');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999 }}>
        {responseToast.visible && (
          <CToast
            visible
            autohide
            delay={5000}
            onClose={() => {
              console.log('Fechando toast')
              setResponseToast({ ...responseToast, visible: false })
            }}
            className={
              responseToast.status === 1
                ? 'bg-success text-white'
                : responseToast.status === 0
                ? 'bg-danger text-white'
                : 'bg-info text-white'
            }
          >
            <CToastBody>
              {responseToast.message}
            </CToastBody>
          </CToast>
        )}
      </div>

      <CCard className="mb-4">
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4>Insta360 X3 - Player Stream RTMP 360°</h4>
            <div>
              <CButton
                color={isInstaConnected ? "danger" : "success"}
                size="sm"
                onClick={handleInstaConnect}
                className="me-2"
              >
                {isInstaConnected ? "Desconectar Insta" : "Conectar Insta"}
              </CButton>
              <CButton
                color={isLiveActive ? "danger" : "success"}
                size="sm"
                onClick={handleLiveToggle}
                className="me-2"
                disabled={!isInstaConnected}
              >
                {isLiveActive ? "Parar Live" : "Iniciar Live"}
              </CButton>
              <CButton
                color="info"
                size="sm"
                onClick={handleCapture}
                className="me-2"
                disabled={!isInstaConnected || isCapturing}
              >
                {isCapturing ? "Capturando..." : "Capturar Imagem"}
              </CButton>
              <CButton
                color="secondary"
                size="sm"
                onClick={() => setShowConfigModal(true)}
              >
                <i className="cil-cog"></i>
              </CButton>
            </div>
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
          </div>
        </CCardHeader>
        <CCardBody>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '0',
            paddingBottom: '56.25%',
            marginBottom: '20px',
            backgroundColor: '#000',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Video.js Player */}
            <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
              <video
                ref={videoPlayerRef}
                className="video-js vjs-default-skin vjs-big-play-centered"
                crossOrigin="anonymous"
                controls
                playsInline
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* Modal de Configuração da Insta360 */}
      <CModal visible={showConfigModal} onClose={() => setShowConfigModal(false)}>
        <CModalTitle>Configurar Câmera Insta360</CModalTitle>
        <CModalBody>
          {formErrors.form && (
            <CAlert color="danger">{formErrors.form}</CAlert>
          )}
          <CForm>
            <div className="mb-3">
              <CFormLabel htmlFor="ssid">SSID (Nome da Rede Wi-Fi)</CFormLabel>
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
              <CFormLabel htmlFor="password">Senha Wi-Fi</CFormLabel>
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
              <CFormLabel htmlFor="rtmp">Endereço RTMP (opcional)</CFormLabel>
              <CFormInput
                type="text"
                id="rtmp"
                name="rtmp"
                value={configForm.rtmp}
                onChange={handleInputChange}
                placeholder="rtmp://servidor:porta/aplicacao/chave"
              />
              <small className="form-text text-muted">
                Se não informado, será usado o endereço RTMP padrão do sistema.
              </small>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowConfigModal(false)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={handleSubmit}>
            Enviar Configuração
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default RTMPStream360
