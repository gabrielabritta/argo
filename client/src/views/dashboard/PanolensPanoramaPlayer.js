// src/views/dashboard/PanolensPanoramaPlayer.js
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
  CInputGroup,
  CFormInput,
  CFormSelect,
} from '@coreui/react'
import Hls from 'hls.js'

const PanolensPanoramaPlayer = ({ streamUrl = `${import.meta.env.VITE_HLS_URL}/hls/stream.m3u8` }) => {
  // Refs
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const hlsRef = useRef(null)
  const viewerRef = useRef(null)
  const panoramaRef = useRef(null)

  // Estado
  const [isPlaying, setIsPlaying] = useState(false)
  const [fov, setFov] = useState(90)
  const [status, setStatus] = useState({ type: 'loading', message: 'Carregando...' })
  const [projectionType, setProjectionType] = useState('dual-fisheye')
  const [streamAddress, setStreamAddress] = useState(streamUrl)
  const [directView, setDirectView] = useState(false) // Estado para visualização direta
  const [latency, setLatency] = useState(0) // Estado para armazenar a latência estimada

  // Log do URL do stream e verificar se é válido
  useEffect(() => {
    console.log('Stream URL:', streamAddress)

    // Verificar se o URL é válido
    if (!streamAddress || !streamAddress.includes('/hls/')) {
      console.warn('URL do stream pode ser inválido:', streamAddress)
      console.log('Variáveis de ambiente:', import.meta.env)
    }
  }, [streamAddress])

  // Inicializar o player
  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return

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
        })

        video.addEventListener('pause', () => {
          setIsPlaying(false)
        })

        video.addEventListener('canplay', () => {
          setStatus({ type: 'playing', message: 'Reproduzindo' })

          // Inicializar o panorama quando o vídeo estiver pronto
          if (!directView) {
            initPanolens()
          }
        })
      } catch (error) {
        console.error('Erro ao configurar HLS:', error)
        setStatus({ type: 'error', message: 'Erro ao configurar player de vídeo' })
      }
    }

    // Inicializar Panolens
    const initPanolens = () => {
      try {
        // Verificar se as bibliotecas estão disponíveis
        if (typeof PANOLENS === 'undefined' || typeof THREE === 'undefined') {
          console.error('PANOLENS ou THREE não estão disponíveis')
          setStatus({ type: 'error', message: 'Bibliotecas necessárias não encontradas' })
          return
        }

        console.log('Inicializando Panolens...')

        // Limpar visualizador anterior se existir
        if (viewerRef.current) {
          try {
            // Remover panorama do visualizador antes de descartá-lo
            if (panoramaRef.current) {
              viewerRef.current.remove(panoramaRef.current);
            }
            viewerRef.current.dispose();
          } catch (error) {
            console.warn('Erro ao descartar visualizador:', error);
          }
          viewerRef.current = null;
        }

        // Limpar panorama anterior se existir
        if (panoramaRef.current) {
          try {
            panoramaRef.current.dispose();
          } catch (error) {
            console.warn('Erro ao descartar panorama:', error);
          }
          panoramaRef.current = null;
        }

        // Criar um novo panorama de vídeo
        let videoPanorama;

        // Verificar se o vídeo está pronto
        if (videoRef.current.readyState < 2) {
          console.warn('Vídeo ainda não está pronto para criar panorama, readyState:', videoRef.current.readyState);
        }

        try {
          // Criar o panorama com base no tipo de projeção
          if (projectionType === 'dual-fisheye') {
            // Para dual-fisheye, podemos tentar usar o tipo DUAL_FISHEYE se disponível
            if (PANOLENS.VideoPanorama.TYPE && PANOLENS.VideoPanorama.TYPE.DUAL_FISHEYE) {
              console.log('Usando projeção DUAL_FISHEYE');
              videoPanorama = new PANOLENS.VideoPanorama(
                videoRef.current,
                {
                  videoType: PANOLENS.VideoPanorama.TYPE.DUAL_FISHEYE
                }
              );
            } else {
              // Fallback para panorama padrão
              console.log('DUAL_FISHEYE não disponível, usando panorama padrão');
              videoPanorama = new PANOLENS.VideoPanorama(videoRef.current);
            }
          } else {
            // Panorama padrão para outros tipos
            videoPanorama = new PANOLENS.VideoPanorama(videoRef.current);
          }

          panoramaRef.current = videoPanorama;
        } catch (error) {
          console.error('Erro ao criar panorama de vídeo:', error);
          // Tentar criar um panorama simples como fallback
          videoPanorama = new PANOLENS.VideoPanorama(videoRef.current);
          panoramaRef.current = videoPanorama;
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
        viewer.add(videoPanorama)

        console.log('Panolens inicializado com sucesso')
      } catch (error) {
        console.error('Erro ao inicializar Panolens:', error)
        setStatus({ type: 'error', message: 'Erro ao inicializar visualizador 360°' })
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
    }
  }, [streamAddress])

  // Atualizar FOV quando mudar
  useEffect(() => {
    if (viewerRef.current && !directView) {
      viewerRef.current.setCameraFov(fov)
    }
  }, [fov, directView])

  // Reinicializar panorama quando o tipo de projeção mudar
  useEffect(() => {
    console.log('Tipo de projeção alterado para:', projectionType)

    // Se não estiver no modo de visualização direta e o vídeo estiver pronto
    if (!directView && videoRef.current && videoRef.current.readyState >= 2) {
      // Reinicializar o panorama com o novo tipo de projeção
      initPanolens()
    }
  }, [projectionType])

  // Efeito para lidar com a mudança de modo de visualização
  useEffect(() => {
    console.log('Modo de visualização alterado:', directView ? 'Direta' : '360°')

    if (directView) {
      // Modo de visualização direta
      if (containerRef.current) {
        containerRef.current.style.display = 'none'
      }
      if (videoRef.current) {
        videoRef.current.style.display = 'block'
      }
    } else {
      // Modo de visualização 360°
      if (containerRef.current) {
        containerRef.current.style.display = 'block'
      }
      if (videoRef.current) {
        videoRef.current.style.display = 'none'
      }

      // Inicializar Panolens se o vídeo estiver pronto
      if (videoRef.current && videoRef.current.readyState >= 2) {
        initPanolens()
      }
    }
  }, [directView])

  // Monitorar latência
  useEffect(() => {
    if (!videoRef.current || !hlsRef.current) return;

    const latencyInterval = setInterval(() => {
      try {
        if (videoRef.current && hlsRef.current) {
          // Verificar se a duração e o tempo atual são válidos
          const currentTime = videoRef.current.currentTime;
          const duration = videoRef.current.duration;

          if (isFinite(currentTime) && isFinite(duration) && duration > 0) {
            // Estimar latência com base na duração e tempo atual
            const estimatedLatency = Math.max(0, duration - currentTime);

            // Limitar a latência máxima reportada para evitar valores absurdos
            const cappedLatency = Math.min(estimatedLatency, 30);

            // Atualizar estado de latência
            setLatency(cappedLatency);

            // Log de latência a cada 5 segundos
            if (Math.random() < 0.2) { // ~20% de chance = ~1 vez a cada 5 segundos
              console.log(`Latência estimada: ${cappedLatency.toFixed(2)}s (CT: ${currentTime.toFixed(2)}, D: ${duration.toFixed(2)})`);
            }
          } else {
            // Se os valores não forem válidos, definir latência como 0
            setLatency(0);
            if (Math.random() < 0.05) { // Log menos frequente para valores inválidos
              console.warn('Valores inválidos para cálculo de latência:', {
                currentTime,
                duration,
                isFiniteCurrentTime: isFinite(currentTime),
                isFiniteDuration: isFinite(duration)
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao calcular latência:', error);
        // Em caso de erro, definir latência como 0
        setLatency(0);
      }
    }, 1000);

    return () => clearInterval(latencyInterval);
  }, [])

  // Inicializar Panolens
  const initPanolens = () => {
    try {
      // Verificar se as bibliotecas estão disponíveis
      if (typeof PANOLENS === 'undefined' || typeof THREE === 'undefined') {
        console.error('PANOLENS ou THREE não estão disponíveis')
        setStatus({ type: 'error', message: 'Bibliotecas necessárias não encontradas' })
        return
      }

      console.log('Inicializando Panolens...')

      // Limpar visualizador anterior se existir
      if (viewerRef.current) {
        try {
          // Remover panorama do visualizador antes de descartá-lo
          if (panoramaRef.current) {
            viewerRef.current.remove(panoramaRef.current);
          }
          viewerRef.current.dispose();
        } catch (error) {
          console.warn('Erro ao descartar visualizador:', error);
        }
        viewerRef.current = null;
      }

      // Limpar panorama anterior se existir
      if (panoramaRef.current) {
        try {
          panoramaRef.current.dispose();
        } catch (error) {
          console.warn('Erro ao descartar panorama:', error);
        }
        panoramaRef.current = null;
      }

      // Criar um novo panorama de vídeo
      let videoPanorama;

      // Verificar se o vídeo está pronto
      if (videoRef.current.readyState < 2) {
        console.warn('Vídeo ainda não está pronto para criar panorama, readyState:', videoRef.current.readyState);
      }

      try {
        // Criar o panorama com base no tipo de projeção
        if (projectionType === 'dual-fisheye') {
          // Para dual-fisheye, podemos tentar usar o tipo DUAL_FISHEYE se disponível
          if (PANOLENS.VideoPanorama.TYPE && PANOLENS.VideoPanorama.TYPE.DUAL_FISHEYE) {
            console.log('Usando projeção DUAL_FISHEYE');
            videoPanorama = new PANOLENS.VideoPanorama(
              videoRef.current,
              {
                videoType: PANOLENS.VideoPanorama.TYPE.DUAL_FISHEYE
              }
            );
          } else {
            // Fallback para panorama padrão
            console.log('DUAL_FISHEYE não disponível, usando panorama padrão');
            videoPanorama = new PANOLENS.VideoPanorama(videoRef.current);
          }
        } else {
          // Panorama padrão para outros tipos
          videoPanorama = new PANOLENS.VideoPanorama(videoRef.current);
        }

        panoramaRef.current = videoPanorama;
      } catch (error) {
        console.error('Erro ao criar panorama de vídeo:', error);
        // Tentar criar um panorama simples como fallback
        videoPanorama = new PANOLENS.VideoPanorama(videoRef.current);
        panoramaRef.current = videoPanorama;
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
      viewer.add(videoPanorama)

      console.log('Panolens inicializado com sucesso')
    } catch (error) {
      console.error('Erro ao inicializar Panolens:', error)
      setStatus({ type: 'error', message: 'Erro ao inicializar visualizador 360°' })
    }
  }

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

  // Ativar modo tela cheia
  const toggleFullscreen = () => {
    const container = document.getElementById('video-container')
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('Erro ao entrar em tela cheia:', err)
      })
    } else {
      document.exitFullscreen()
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

  // Aplicar URL personalizada
  const applyCustomUrl = () => {
    setStreamAddress(document.getElementById('stream-url').value)
  }

  // Forçar atualização do panorama
  const forceUpdate = () => {
    console.log('Forçando atualização do panorama...')

    // Garantir que o vídeo esteja reproduzindo
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(err => {
        console.error('Erro ao reproduzir vídeo:', err)
      })
    }

    // Reinicializar o panorama
    initPanolens()
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <h4>Insta360 X3 - Player Interativo 360° (PANOLENS)</h4>
        <div className="d-flex align-items-center">
          <CAlert color={
            status.type === 'loading' ? 'warning' :
            status.type === 'playing' ? 'success' :
            'danger'
          }
          className="py-1 px-3 mb-0 me-2">
            {status.message}
          </CAlert>

          {/* Indicador de latência */}
          {latency > 0 && isFinite(latency) && (
            <CAlert
              color={latency < 2 ? 'success' : latency < 5 ? 'warning' : 'danger'}
              className="py-1 px-3 mb-0 me-2 d-flex align-items-center"
            >
              <i className="cil-speedometer me-1"></i>
              Latência: {latency.toFixed(1)}s
            </CAlert>
          )}
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
              display: directView ? 'none' : 'block'
            }}
          />

          {/* Vídeo para visualização direta */}
          <video
            ref={videoRef}
            crossOrigin="anonymous"
            muted
            playsInline
            autoPlay
            loop
            style={{
              display: directView ? 'block' : 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>

        <div className="mb-3">
          <CButton color="primary" onClick={togglePlay} className="me-2">
            <i className={`cil-${isPlaying ? 'media-pause' : 'media-play'}`}></i> {isPlaying ? 'Pausar' : 'Reproduzir'}
          </CButton>
          <CButton color="secondary" onClick={toggleFullscreen} className="me-2">
            <i className="cil-fullscreen"></i> Tela Cheia
          </CButton>
          <CButton color="warning" onClick={restartStream} className="me-2">
            <i className="cil-loop-circular"></i> Reiniciar Stream
          </CButton>
          <CButton color="danger" onClick={syncWithLive} className="me-2">
            <i className="cil-speedometer"></i> Sincronizar Ao Vivo
          </CButton>
          <CButton color="info" onClick={() => console.log('Env:', import.meta.env)} className="me-2">
            <i className="cil-bug"></i> Debug
          </CButton>
          <CButton
            color="purple"
            className="me-2"
            onClick={forceUpdate}
          >
            <i className="cil-reload"></i> Forçar Atualização
          </CButton>
          <CButton
            color={directView ? "success" : "secondary"}
            onClick={() => setDirectView(!directView)}
            className="me-2"
          >
            <i className="cil-video"></i> {directView ? "Modo 360°" : "Visualização Direta"}
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
          <CCol md={6}>
            <CInputGroup className="mb-3">
              <CFormInput
                id="stream-url"
                defaultValue={streamAddress}
                aria-label="URL do Stream HLS"
              />
              <CButton type="button" color="outline-secondary" onClick={applyCustomUrl}>
                Aplicar
              </CButton>
            </CInputGroup>
          </CCol>
          <CCol md={6}>
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
  )
}

export default PanolensPanoramaPlayer
