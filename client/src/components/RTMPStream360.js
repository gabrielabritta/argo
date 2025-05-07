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
  const [isPlaying, setIsPlaying] = useState(false)
  const [fov, setFov] = useState(90)
  const [status, setStatus] = useState({ type: 'loading', message: 'Carregando...' })
  const [projectionType, setProjectionType] = useState('equirectangular')
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
      this.mediainfo.projection = projectionType;
      
      // Inicializar o plugin VR
      this.vr({
        projection: projectionType,
        debug: false,
        forceCardboard: false,
        defaultFov: fov
      });
      
      // Eventos do player
      this.on('playing', () => {
        console.log('Vídeo em reprodução');
        setIsPlaying(true);
        setStatus({ type: 'playing', message: 'Reproduzindo' });
      });
      
      this.on('pause', () => {
        console.log('Vídeo pausado');
        setIsPlaying(false);
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
  }, [streamAddress, projectionType]);
  
  // Atualizar FOV quando mudar
  useEffect(() => {
    if (playerRef.current && playerRef.current.vr) {
      try {
        const vrPlugin = playerRef.current.vr();
        if (vrPlugin && typeof vrPlugin.setFov === 'function') {
          vrPlugin.setFov(fov);
        }
      } catch (error) {
        console.error('Erro ao atualizar FOV:', error);
      }
    }
  }, [fov]);

  // Reinicializar panorama quando o tipo de projeção mudar
  useEffect(() => {
    console.log('Tipo de projeção alterado para:', projectionType);
    
    // Atualizar a projeção no player VR se ele já estiver inicializado
    if (playerRef.current && playerRef.current.vr) {
      try {
        const vrPlugin = playerRef.current.vr();
        if (vrPlugin && typeof vrPlugin.setProjection === 'function') {
          vrPlugin.setProjection(projectionType);
        }
      } catch (error) {
        console.error('Erro ao atualizar projeção:', error);
      }
    }
  }, [projectionType]);

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

  // Funções de controle do player
  const togglePlay = () => {
    if (!playerRef.current) return;
    
    if (playerRef.current.paused()) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }
  
  // Reiniciar stream
  const restartStream = () => {
    if (!playerRef.current) return;
    
    setStatus({ type: 'loading', message: 'Reconectando ao stream...' });
    
    // Recarregar a fonte do vídeo
    playerRef.current.src({
      src: streamAddress,
      type: 'application/x-mpegURL'
    });
    
    playerRef.current.load();
    playerRef.current.play().catch(error => {
      console.error('Erro ao reproduzir vídeo após reiniciar:', error);
    });
  }
  
  // Forçar sincronização com o ao vivo (reduzir latência)
  const syncWithLive = () => {
    if (!playerRef.current) return;
    
    setStatus({ type: 'loading', message: 'Sincronizando com o ao vivo...' });
    
    try {
      // Ir para o final do stream (ao vivo)
      const duration = playerRef.current.duration();
      if (duration && isFinite(duration) && duration > 0) {
        playerRef.current.currentTime(duration);
      }
      
      // Reproduzir
      playerRef.current.play().then(() => {
        setStatus({ type: 'playing', message: 'Sincronizado com o ao vivo' });
      }).catch(error => {
        console.error('Erro ao sincronizar:', error);
        setStatus({ type: 'error', message: 'Erro ao sincronizar' });
      });
    } catch (error) {
      console.error('Erro ao sincronizar com o ao vivo:', error);
      setStatus({ type: 'error', message: 'Erro ao sincronizar' });
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
                <option value="360">360° Esférico</option>
                <option value="360_LR">360° Estéreo (Lado a Lado)</option>
                <option value="360_TB">360° Estéreo (Topo/Base)</option>
                <option value="EAC">Cubo Equi-Angular (EAC)</option>
                <option value="fisheye">Fisheye</option>
              </CFormSelect>
            </CCol>
          </CRow>
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