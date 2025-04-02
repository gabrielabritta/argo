import React, { useState, useEffect, useRef } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CButton, CFormInput, CAlert, CButtonGroup } from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import Hls from 'hls.js'

const Stream360 = () => {
  const [rtmpUrl, setRtmpUrl] = useState('')
  const [streamKey, setStreamKey] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')
  const [playerMode, setPlayerMode] = useState('dash') // Default: dash (lowest latency)
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const dashRef = useRef(null)
  const iframeRef = useRef(null)

  const generateStreamKey = () => {
    // Gera uma chave de stream aleatória
    const key = Math.random().toString(36).substring(2, 15)
    setStreamKey(key)
    setRtmpUrl(`${import.meta.env.VITE_RTMP_URL}/${key}`)
  }

  const startStream = () => {
    if (!streamKey) {
      const newKey = Math.random().toString(36).substring(2, 15);
      setStreamKey(newKey);
      setRtmpUrl(`${import.meta.env.VITE_RTMP_URL}/${newKey}`);
      // Pequeno delay para garantir que o estado seja atualizado antes de começar o streaming
      setTimeout(() => {
        setIsStreaming(true);
        setError('');
      }, 100);
      return;
    }
    setIsStreaming(true);
    setError('');
  }

  const stopStream = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (dashRef.current) {
      dashRef.current.reset()
      dashRef.current = null
    }
    setIsStreaming(false)
  }

  const changePlayerMode = (mode) => {
    stopStream();
    setPlayerMode(mode);
    setTimeout(() => {
      setIsStreaming(true);
    }, 100);
  }

  // Retorna a URL base para streaming
  const getBaseUrl = () => {
    const baseUrl = import.meta.env.VITE_HLS_URL || null;
    
    if (baseUrl) {
      return baseUrl;
    }
    
    // Fallback: Derivar a partir da URL RTMP
    const rtmpUrl = import.meta.env.VITE_RTMP_URL;
    
    // Extrai o host da URL RTMP
    try {
      const urlParts = rtmpUrl.split('://');
      if (urlParts.length > 1) {
        const host = urlParts[1].split('/')[0];
        return `http://${host.split(':')[0]}:8080`;
      }
    } catch (error) {
      console.error('Erro ao extrair host:', error);
    }
    
    return 'http://localhost:8080';
  }
  
  // Obtém a URL do player dependendo do tipo
  const getStreamUrl = () => {
    if (!streamKey) {
      console.error('Stream key está vazia. Não é possível gerar URL do player.');
      return null;
    }
    
    const baseUrl = getBaseUrl();
    
    switch (playerMode) {
      case 'hls':
        return `${baseUrl}/hls/${streamKey}.m3u8`;
      case 'dash':
        return `${baseUrl}/dash/${streamKey}.mpd`;
      case 'iframe':
        return `${baseUrl}/hls/${streamKey}.m3u8`;
      default:
        return `${baseUrl}/hls/${streamKey}.m3u8`;
    }
  }

  // Versão iframe do player para contornar CORS e ter máximo desempenho
  const getIframePage = () => {
    const url = getStreamUrl();
    
    // Verificar se a URL existe
    if (!url) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Stream Player</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif; 
              background-color: #f5f5f5;
              color: #333;
              text-align: center;
            }
            .error { 
              color: #d32f2f; 
              font-weight: bold; 
              margin-top: 20px; 
            }
            .info {
              margin-top: 20px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <h3>Stream não disponível</h3>
          <div class="error">Nenhuma chave de stream válida foi encontrada</div>
          <div class="info">Gere uma nova chave de stream para começar</div>
        </body>
        </html>
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Stream Player</title>
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          video { width: 100%; height: 100%; background: #000; }
          .error { color: red; padding: 20px; text-align: center; }
        </style>
        <script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      </head>
      <body>
        <video id="video" muted autoplay playsInline></video>
        <div id="error" class="error"></div>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            var video = document.getElementById('video');
            var errorDiv = document.getElementById('error');
            var url = "${url}";
            console.log("Carregando stream:", url);
            
            // Função para exibir erros
            function showError(message) {
              errorDiv.textContent = message;
            }
            
            // Determinar qual player usar baseado na URL
            var useDash = url.includes('.mpd');
            
            if (useDash) {
              // Usar DASH.js para MPD
              try {
                var player = dashjs.MediaPlayer().create();
                player.updateSettings({
                  streaming: {
                    lowLatencyEnabled: true,
                    liveDelay: 0.5,
                    liveCatchUpMinDrift: 0.05,
                    liveCatchUpPlaybackRate: 0.5,
                    buffer: {
                      bufferTimeAtTopQuality: 1,
                      bufferTimeAtTopQualityLongForm: 1,
                      fastSwitchEnabled: true
                    },
                    abr: {
                      useDefaultABRRules: true,
                      abandonLoadTimeout: 100
                    }
                  }
                });
                
                player.initialize(video, url, true);
                player.setAutoPlay(true);
                
                // Acelerar a reprodução para evitar buffer
                video.playbackRate = 1.03;
                
                // Quando o buffer ficar muito grande, avance para reduzir latência
                setInterval(function() {
                  if (player.getBufferLength() > 1) {
                    video.currentTime = video.currentTime + 0.3;
                  }
                }, 1000);
                
              } catch(e) {
                console.error("Erro ao iniciar DASH:", e);
                showError("Erro no player DASH: " + e.message);
              }
            } else {
              // Usar HLS.js para m3u8
              if(Hls.isSupported()) {
                try {
                  var hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true,
                    liveSyncDuration: 0.5,
                    liveMaxLatencyDuration: 1,
                    liveDurationInfinity: true,
                    highBufferWatchdogPeriod: 1,
                    maxBufferLength: 1,
                    maxMaxBufferLength: 2,
                    maxBufferSize: 1 * 1000 * 1000,
                    maxBufferHole: 0.01,
                    startLevel: -1,
                    manifestLoadPolicy: {
                      default: {
                        maxTimeToFirstByteMs: 1000,
                        maxLoadTimeMs: 2000,
                        timeoutRetry: {
                          maxNumRetry: 2,
                          retryDelayMs: 0
                        }
                      }
                    }
                  });
                  
                  hls.attachMedia(video);
                  hls.loadSource(url);
                  
                  // Configuração para baixa latência
                  video.muted = true;
                  video.play();
                  
                  // Acelerar levemente a reprodução para evitar buffer
                  video.playbackRate = 1.05;
                  
                  // Quando o buffer ficar muito grande, pulamos
                  setInterval(function() {
                    if (hls.media && hls.media.buffered && hls.media.buffered.length > 0) {
                      var end = hls.media.buffered.end(hls.media.buffered.length - 1);
                      var current = hls.media.currentTime;
                      var bufferSize = end - current;
                      
                      if (bufferSize > 0.7) {
                        hls.media.currentTime = end - 0.3;
                      }
                    }
                  }, 500);
                  
                } catch(e) {
                  console.error("Erro ao iniciar HLS:", e);
                  showError("Erro no player HLS: " + e.message);
                }
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari suporta HLS nativamente
                video.src = url;
                video.play();
              } else {
                showError("Este navegador não suporta streaming HLS ou DASH");
              }
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  // Renderizar o iframe
  useEffect(() => {
    if (isStreaming && playerMode === 'iframe' && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      iframeDoc.open();
      iframeDoc.write(getIframePage());
      iframeDoc.close();
    }
  }, [isStreaming, playerMode, streamKey]);

  // Player nativo (DASH ou HLS)
  useEffect(() => {
    if (!isStreaming || playerMode === 'iframe' || !videoRef.current) {
      return;
    }
    
    const video = videoRef.current;
    const url = getStreamUrl();
    
    if (!url) {
      setError('URL de streaming inválida. Por favor, gere uma nova chave.');
      return;
    }
    
    console.log(`Iniciando player ${playerMode.toUpperCase()} com URL:`, url);
    
    // Limpar players anteriores
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }
    
    if (playerMode === 'dash') {
      // Usar DASH para menor latência
      try {
        // Certificar-se de que dash.js está carregado
        if (typeof dashjs === 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://cdn.dashjs.org/latest/dash.all.min.js';
          script.async = true;
          document.body.appendChild(script);
          
          script.onload = () => initDashPlayer(video, url);
        } else {
          initDashPlayer(video, url);
        }
      } catch (error) {
        console.error('Erro ao inicializar DASH:', error);
        setError(`Erro ao inicializar DASH: ${error.message}`);
        // Fallback para HLS
        changePlayerMode('hls');
      }
    } else if (playerMode === 'hls') {
      // Player HLS padrão
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDuration: 0.5,
          liveMaxLatencyDuration: 1,
          liveDurationInfinity: true,
          highBufferWatchdogPeriod: 0,
          // Configurações para latência mínima
          maxBufferLength: 1,
          maxMaxBufferLength: 2,
          maxBufferSize: 1 * 1000 * 1000,
          maxBufferHole: 0.01,
          backBufferLength: 0,
          // Configurações XHR sem CORS
          xhrSetup: function(xhr) {
            xhr.withCredentials = false;
          },
          // Políticas de carregamento agressivas
          manifestLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 1000,
              maxLoadTimeMs: 2000,
              timeoutRetry: {
                maxNumRetry: 1,
                retryDelayMs: 0,
              },
              errorRetry: {
                maxNumRetry: 1,
                retryDelayMs: 250,
                maxRetryDelayMs: 500
              }
            }
          },
          playlistLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 1000,
              maxLoadTimeMs: 2000,
              timeoutRetry: {
                maxNumRetry: 1,
                retryDelayMs: 0,
              },
              errorRetry: {
                maxNumRetry: 1,
                retryDelayMs: 250,
                maxRetryDelayMs: 500
              }
            }
          },
          fragLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 1000,
              maxLoadTimeMs: 2000,
              timeoutRetry: {
                maxNumRetry: 1,
                retryDelayMs: 0,
              },
              errorRetry: {
                maxNumRetry: 1,
                retryDelayMs: 250,
                maxRetryDelayMs: 500
              }
            }
          }
        });
        
        hlsRef.current = hls;
        
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('Mídia anexada ao player HLS');
          hls.loadSource(url);
        });
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('Manifesto HLS carregado com sucesso');
          
          // Iniciar reprodução mudo para autoplay
          video.muted = true;
          video.play().catch(error => {
            console.error('Erro ao iniciar reprodução:', error);
          });
          
          // Latência mínima - usar a taxa de reprodução mais alta
          video.playbackRate = 1.05;
          
          // Gerenciador de buffer ultra-agressivo
          const checkBuffer = () => {
            if (hls.media && hls.media.buffered && hls.media.buffered.length > 0) {
              const end = hls.media.buffered.end(hls.media.buffered.length - 1);
              const current = hls.media.currentTime;
              const bufferSize = end - current;
              
              // Pular imediatamente se tivermos mais de 0.7s no buffer
              if (bufferSize > 0.7) {
                console.log(`Buffer (${bufferSize.toFixed(2)}s), avançando...`);
                hls.media.currentTime = end - 0.3;
              }
            }
          };
          
          // Verificar o buffer a cada 500ms
          const intervalId = setInterval(checkBuffer, 500);
          
          // Limpar o intervalo quando o componente for desmontado
          return () => clearInterval(intervalId);
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('Erro HLS:', data);
          
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Erro de rede:', data);
                setError(`Erro de rede: ${data.details}`);
                // Tentar novamente imediatamente
                setTimeout(() => hls.startLoad(), 250);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Erro de mídia:', data);
                setError(`Erro de mídia: ${data.details}`);
                hls.recoverMediaError();
                break;
              default:
                console.error('Erro fatal:', data);
                setError(`Erro fatal: ${data.details}`);
                // Recomeçar com novo player
                hls.destroy();
                hlsRef.current = null;
                
                setTimeout(() => {
                  if (!videoRef.current) return;
                  
                  const newHls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true,
                  });
                  
                  hlsRef.current = newHls;
                  newHls.attachMedia(videoRef.current);
                  newHls.loadSource(url);
                }, 500);
                break;
            }
          }
        });
        
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari - reprodução nativa HLS
        video.src = url;
        video.setAttribute('playsinline', '');
        video.muted = true;
        video.play();
      } else {
        setError('Este navegador não suporta reprodução HLS. Tente o modo iframe.');
      }
    }
    
    return () => {
      // Limpeza
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      if (dashRef.current) {
        dashRef.current.reset();
        dashRef.current = null;
      }
    };
  }, [isStreaming, playerMode, streamKey]);
  
  // Função para inicializar o player DASH
  const initDashPlayer = (video, url) => {
    if (typeof dashjs === 'undefined') {
      console.error('dash.js não está carregado');
      setError('Não foi possível carregar o player DASH. Tente outro modo.');
      return;
    }
    
    try {
      const player = dashjs.MediaPlayer().create();
      
      // Configurações de baixa latência
      player.updateSettings({
        streaming: {
          lowLatencyEnabled: true,
          liveDelay: 0.5,
          liveCatchUpMinDrift: 0.05,
          liveCatchUpPlaybackRate: 0.5,
          buffer: {
            bufferTimeAtTopQuality: 1,
            bufferTimeAtTopQualityLongForm: 1,
            fastSwitchEnabled: true
          },
          abr: {
            useDefaultABRRules: true,
            abandonLoadTimeout: 100
          }
        }
      });
      
      player.initialize(video, url, true);
      player.setAutoPlay(true);
      player.attachView(video);
      
      // Acelerar para reduzir latência
      video.playbackRate = 1.03;
      video.muted = true;
      
      // Referência para limpeza
      dashRef.current = player;
      
      // Verificar e ajustar buffer a cada segundo para manter latência mínima
      const intervalId = setInterval(() => {
        if (player && player.getBufferLength() > 1) {
          // Se o buffer estiver muito grande, avance
          video.currentTime = video.currentTime + 0.3;
        }
      }, 1000);
      
      // Limpeza quando o componente for desmontado
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error('Erro ao inicializar o player DASH:', error);
      setError(`Erro DASH: ${error.message}`);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Streaming 360° - Insta360 Live</strong>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}

            <div className="mb-4">
              <h5>Configuração do Stream</h5>
              <CButton color="primary" className="mb-3" onClick={generateStreamKey}>
                Gerar Nova Chave de Stream
              </CButton>

              {rtmpUrl && (
                <div className="mb-3">
                  <label className="form-label">URL RTMP:</label>
                  <CFormInput
                    type="text"
                    value={rtmpUrl}
                    readOnly
                    className="mb-2"
                  />
                  <CButton
                    color="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(rtmpUrl)}
                  >
                    Copiar URL
                  </CButton>
                </div>
              )}

              {streamKey && (
                <div className="mb-3">
                  <label className="form-label">Chave do Stream:</label>
                  <CFormInput
                    type="text"
                    value={streamKey}
                    readOnly
                    className="mb-2"
                  />
                  <CButton
                    color="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(streamKey)}
                  >
                    Copiar Chave
                  </CButton>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h5>Controles do Stream</h5>
              
              <div className="d-flex align-items-center gap-3 mb-3">
                {!isStreaming ? (
                  <CButton color="success" onClick={startStream}>
                    Iniciar Stream
                  </CButton>
                ) : (
                  <CButton color="danger" onClick={stopStream}>
                    Parar Stream
                  </CButton>
                )}
                
                <div>
                  <small className="text-muted d-block mb-1">Modo do Player:</small>
                  <CButtonGroup role="group">
                    <CButton 
                      color={playerMode === 'dash' ? 'primary' : 'light'}
                      onClick={() => changePlayerMode('dash')}
                      size="sm"
                    >
                      DASH
                    </CButton>
                    <CButton 
                      color={playerMode === 'hls' ? 'primary' : 'light'}
                      onClick={() => changePlayerMode('hls')}
                      size="sm"
                    >
                      HLS
                    </CButton>
                    <CButton 
                      color={playerMode === 'iframe' ? 'primary' : 'light'} 
                      onClick={() => changePlayerMode('iframe')}
                      size="sm"
                    >
                      IFRAME
                    </CButton>
                  </CButtonGroup>
                </div>
              </div>
              
              <small className="text-muted">
                <strong>Dica:</strong> Para latência mínima, use o modo DASH. Se tiver problemas, tente o modo IFRAME.
              </small>
            </div>

            {isStreaming && (
              <div className="mb-4">
                <h5>Visualização 360°</h5>
                <div className="ratio ratio-16x9 bg-dark">
                  {playerMode === 'iframe' ? (
                    <iframe
                      ref={iframeRef}
                      title="Stream Player"
                      sandbox="allow-same-origin allow-scripts"
                      style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      controls
                      playsInline
                      muted
                      autoPlay
                      style={{ width: '100%', height: '100%', background: '#000' }}
                    />
                  )}
                </div>
                <div className="text-center mt-2">
                  <small>Latência estimada: 1-2 segundos</small>
                </div>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Stream360 