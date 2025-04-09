// src/views/dashboard/Insta360Player.js
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
  CInputGroupText,
  CFormSelect,
} from '@coreui/react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ShaderMaterial } from 'three'
import Hls from 'hls.js'

const Insta360Player = ({ streamUrl = `${import.meta.env.VITE_HLS_URL}/hls/stream.m3u8` }) => {
  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const textureRef = useRef(null)
  const hlsRef = useRef(null)
  const animationFrameRef = useRef(null)
  const sphereMeshRef = useRef(null)

  // Estado
  const [isPlaying, setIsPlaying] = useState(false)
  const [fov, setFov] = useState(90)
  const [status, setStatus] = useState({ type: 'loading', message: 'Carregando...' })
  const [projectionType, setProjectionType] = useState('dual-fisheye')
  const [streamAddress, setStreamAddress] = useState(streamUrl)
  const [directView, setDirectView] = useState(false) // Novo estado para visualização direta
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
    if (!canvasRef.current) return

    // Configurar Three.js
    const setupThreeJS = () => {
      // Criar cena
      const scene = new THREE.Scene()
      sceneRef.current = scene

      // Criar câmera
      const camera = new THREE.PerspectiveCamera(fov, canvasRef.current.clientWidth / canvasRef.current.clientHeight, 0.1, 1000)
      camera.position.set(0, 0, 0.01) // Pequeno offset para evitar problemas
      cameraRef.current = camera

      // Criar renderer
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
      renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
      renderer.setPixelRatio(window.devicePixelRatio)
      rendererRef.current = renderer

      // Adicionar controles
      try {
        console.log('Inicializando OrbitControls...')
        // Verificar se OrbitControls está disponível
        if (typeof OrbitControls === 'function') {
          const controls = new OrbitControls(camera, renderer.domElement)
          controls.enableZoom = false
          controls.enablePan = false
          controls.rotateSpeed = 0.5
          controlsRef.current = controls
          console.log('OrbitControls inicializado com sucesso')
        } else {
          console.warn('OrbitControls não está disponível como construtor')
          // Criar um objeto de controle simples para evitar erros
          controlsRef.current = {
            update: () => {}, // Função vazia
            enabled: false
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar OrbitControls:', error)
        // Criar um objeto de controle simples para evitar erros
        controlsRef.current = {
          update: () => {}, // Função vazia
          enabled: false
        }
      }

      // Criar uma textura temporária até que o vídeo esteja pronto
      try {
        // Criar uma textura temporária com uma imagem em branco de 2x2 pixels
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'gray';
        ctx.fillRect(0, 0, 2, 2);

        const tempTexture = new THREE.Texture(canvas);
        tempTexture.needsUpdate = true;
        textureRef.current = tempTexture;
        console.log('Textura temporária criada com sucesso');

        // Configurar um evento para criar a textura de vídeo quando estiver pronto
        const video = videoRef.current;
        if (video) {
          // Função para criar a textura de vídeo quando estiver pronta
          const createVideoTexture = () => {
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA ou superior
              try {
                const videoTexture = new THREE.VideoTexture(video);
                videoTexture.minFilter = THREE.LinearFilter;
                videoTexture.magFilter = THREE.LinearFilter;
                videoTexture.format = THREE.RGBAFormat;
                textureRef.current = videoTexture;
                console.log('Textura de vídeo criada com sucesso, readyState:', video.readyState);

                // Atualizar o material com a nova textura
                if (sphereMeshRef.current && sphereMeshRef.current.material) {
                  if (projectionType === 'dual-fisheye' &&
                      sphereMeshRef.current.material.uniforms &&
                      sphereMeshRef.current.material.uniforms.map) {
                    sphereMeshRef.current.material.uniforms.map.value = videoTexture;
                  } else {
                    sphereMeshRef.current.material.map = videoTexture;
                  }
                  sphereMeshRef.current.material.needsUpdate = true;
                  console.log('Material atualizado com a nova textura de vídeo');
                }

                // Remover o listener após criar a textura
                video.removeEventListener('canplay', createVideoTexture);
              } catch (error) {
                console.error('Erro ao criar textura de vídeo:', error);
              }
            } else {
              console.warn('Vídeo ainda não está pronto, readyState:', video.readyState);
            }
          };

          // Verificar se o vídeo já está pronto
          if (video.readyState >= 2) {
            createVideoTexture();
          } else {
            // Adicionar listener para quando o vídeo estiver pronto
            video.addEventListener('canplay', createVideoTexture);
            console.log('Aguardando vídeo ficar pronto para criar textura...');
          }
        } else {
          console.error('Elemento de vídeo não encontrado');
        }
      } catch (error) {
        console.error('Erro ao configurar textura:', error);
        // Criar uma textura de fallback em caso de erro
        const fallbackTexture = new THREE.Texture();
        textureRef.current = fallbackTexture;
      }

      // Criar esfera para projeção equiretangular
      const sphereGeometry = new THREE.SphereGeometry(100, 60, 40)
      sphereGeometry.scale(-1, 1, 1) // Inverter para ver de dentro

      // Criar material
      const sphereMaterial = new THREE.MeshBasicMaterial({
        map: textureRef.current
      })

      // Criar mesh
      const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
      sphereMeshRef.current = sphereMesh
      scene.add(sphereMesh)

      try {
        changeProjection(projectionType)
      } catch (error) {
        console.error('Erro ao aplicar projeção inicial:', error)
        // Continuar mesmo se a projeção falhar
      }

      // Iniciar loop de renderização
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate)

        // Verificar se os controles foram inicializados
        if (controlsRef.current) {
          controlsRef.current.update()
        }

        // Atualizar a textura do vídeo se estiver pronta
        if (textureRef.current && videoRef.current) {
          if (videoRef.current.readyState >= 2) {
            if (textureRef.current instanceof THREE.VideoTexture) {
              textureRef.current.needsUpdate = true;

              // Log a cada 100 frames aproximadamente (para não sobrecarregar o console)
              if (Math.random() < 0.01) {
                console.log('Atualizando textura de vídeo no loop de animação:', {
                  readyState: videoRef.current.readyState,
                  paused: videoRef.current.paused,
                  currentTime: videoRef.current.currentTime.toFixed(2),
                  videoWidth: videoRef.current.videoWidth,
                  videoHeight: videoRef.current.videoHeight
                });
              }
            } else {
              // Se temos vídeo pronto mas não temos VideoTexture, criar uma nova
              if (Math.random() < 0.01) { // Verificar ocasionalmente
                console.log('Textura não é VideoTexture mas vídeo está pronto. Tipo atual:', typeof textureRef.current);
              }
            }
          } else if (Math.random() < 0.01) { // Log ocasional
            console.log('Vídeo não está pronto no loop de animação, readyState:', videoRef.current.readyState);
          }
        }

        renderer.render(scene, camera)
      }
      animate()
    }

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
        })
      } catch (error) {
        console.error('Erro ao configurar HLS:', error)
        setStatus({ type: 'error', message: 'Erro ao configurar player de vídeo' })
      }
    }

    // Redimensionar canvas quando a janela for redimensionada
    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return

      const canvas = canvasRef.current
      const renderer = rendererRef.current
      const camera = cameraRef.current

      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
    }

    // Configurar Three.js e HLS
    try {
      if (videoRef.current && canvasRef.current) {
        console.log('Inicializando player 360...')
        setupThreeJS()

        // Inicializar HLS após Three.js para garantir que o vídeo está pronto
        try {
          setupHls()
        } catch (error) {
          console.error('Erro ao configurar HLS:', error)
          setStatus({ type: 'error', message: 'Erro ao configurar streaming de vídeo' })
          // Continuar mesmo se o HLS falhar
        }
        window.addEventListener('resize', handleResize)
        console.log('Player 360 inicializado com sucesso')
      } else {
        console.error('Elementos DOM não carregados corretamente:', {
          video: !!videoRef.current,
          canvas: !!canvasRef.current
        })
        setStatus({ type: 'error', message: 'Erro ao carregar recursos necessários' })
      }
    } catch (error) {
      console.error('Erro fatal ao inicializar player 360:', error)
      setStatus({ type: 'error', message: 'Erro fatal ao inicializar player' })
    }

    // Limpeza
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Mudar o campo de visão (FOV)
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = fov
      cameraRef.current.updateProjectionMatrix()
    }
  }, [fov])

  // Efeito para lidar com a mudança de modo de visualização
  useEffect(() => {
    console.log('Modo de visualização alterado:', directView ? 'Direta' : '360°')

    // Se estiver no modo de visualização direta, pausar a renderização 3D
    if (directView) {
      // Garantir que o vídeo esteja visível
      if (videoRef.current) {
        videoRef.current.style.display = 'block'
      }

      // Pausar a renderização 3D cancelando o frame de animação
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    } else {
      // Retomar a renderização 3D se não estiver no modo direto
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Forçar a criação de uma nova textura de vídeo se o vídeo estiver pronto
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            console.log('Criando nova textura de vídeo para modo 3D')
            const videoTexture = new THREE.VideoTexture(videoRef.current);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.format = THREE.RGBAFormat;
            textureRef.current = videoTexture;
          } catch (error) {
            console.error('Erro ao criar textura de vídeo ao mudar para modo 3D:', error);
          }
        } else {
          console.warn('Vídeo não está pronto para criar textura no modo 3D, readyState:', videoRef.current?.readyState);
        }

        // Recriar o loop de animação se necessário
        if (!animationFrameRef.current) {
          console.log('Reiniciando loop de renderização 3D')
          const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate)

            // Verificar se os controles foram inicializados
            if (controlsRef.current) {
              controlsRef.current.update()
            }

            // Atualizar a textura do vídeo a cada frame
            if (textureRef.current && videoRef.current && videoRef.current.readyState >= 2) {
              if (textureRef.current instanceof THREE.VideoTexture) {
                textureRef.current.needsUpdate = true
              }
            }

            rendererRef.current.render(sceneRef.current, cameraRef.current)
          }
          animate()
        }

        // Esconder o vídeo direto
        if (videoRef.current) {
          videoRef.current.style.display = 'none'
        }

        // Garantir que o vídeo esteja reproduzindo
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(err => {
            console.error('Erro ao reproduzir vídeo ao mudar para modo 3D:', err);
          });
        }

        // Reaplicar a projeção atual para garantir que o shader está correto
        // Pequeno timeout para garantir que a textura esteja pronta
        setTimeout(() => {
          changeProjection(projectionType);
        }, 100);
      } else {
        console.error('Componentes de renderização não disponíveis:', {
          renderer: !!rendererRef.current,
          scene: !!sceneRef.current,
          camera: !!cameraRef.current
        })
      }
    }
  }, [directView, projectionType])

  // Mudar o URL do stream
  useEffect(() => {
    if (hlsRef.current && videoRef.current) {
      setStatus({ type: 'loading', message: 'Conectando ao stream...' })
      hlsRef.current.loadSource(streamAddress)
    }
  }, [streamAddress])

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

  // Mudar posição da câmera para presets
  const applyPreset = (preset) => {
    if (!controlsRef.current) return

    const controls = controlsRef.current

    // Resetar rotação
    controls.reset()

    // Aplicar rotação baseado no preset
    switch (preset) {
      case 'front':
        controls.setAzimuthalAngle(0)
        controls.setPolarAngle(Math.PI / 2)
        break
      case 'left':
        controls.setAzimuthalAngle(-Math.PI / 2)
        controls.setPolarAngle(Math.PI / 2)
        break
      case 'right':
        controls.setAzimuthalAngle(Math.PI / 2)
        controls.setPolarAngle(Math.PI / 2)
        break
      case 'back':
        controls.setAzimuthalAngle(Math.PI)
        controls.setPolarAngle(Math.PI / 2)
        break
      case 'top':
        controls.setPolarAngle(0)
        break
      case 'bottom':
        controls.setPolarAngle(Math.PI)
        break
      default:
        break
    }
  }

  // Mudar tipo de projeção
  const changeProjection = (type) => {
    setProjectionType(type)

    console.log('Alterando projeção para:', type, 'Timestamp:', new Date().toISOString())

    if (!sphereMeshRef.current) {
      console.error('Mesh de esfera não disponível para aplicar projeção')
      return
    }

    if (!textureRef.current) {
      console.error('Textura não disponível para aplicar projeção')
      return
    }

    // Verificar se o vídeo está pronto
    if (videoRef.current) {
      console.log('Estado do vídeo ao aplicar projeção:', {
        readyState: videoRef.current.readyState,
        paused: videoRef.current.paused,
        currentTime: videoRef.current.currentTime,
        duration: videoRef.current.duration,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        textureType: textureRef.current instanceof THREE.VideoTexture ? 'VideoTexture' : 'Outro'
      })

      if (videoRef.current.readyState < 2) {
        console.warn('Vídeo não está pronto para renderização, readyState:', videoRef.current.readyState)
      }
    }

    // Criar shader para dual fisheye
    const dualFisheyeVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const dualFisheyeFragmentShader = `
      uniform sampler2D map;
      varying vec2 vUv;

      const float PI = 3.1415926535897932384626433832795;

      void main() {
        // Determinar qual olho de peixe estamos processando
        bool isRightFisheye = vUv.x > 0.5;

        // Normalizar coordenadas para cada olho de peixe
        vec2 fisheyeUv;
        if (isRightFisheye) {
          fisheyeUv = vec2((vUv.x - 0.5) * 2.0, vUv.y);
        } else {
          fisheyeUv = vec2(vUv.x * 2.0, vUv.y);
        }

        // Converter para coordenadas polares (centro no meio do olho de peixe)
        fisheyeUv = fisheyeUv * 2.0 - 1.0;
        float radius = length(fisheyeUv);
        float theta = atan(fisheyeUv.y, fisheyeUv.x);

        // Limitar ao círculo do olho de peixe
        if (radius > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        // Calcular coordenadas equiretangulares
        float phi = radius * PI / 2.0;
        float longitude;

        if (isRightFisheye) {
          longitude = theta + PI / 2.0;
        } else {
          longitude = theta - PI / 2.0;
        }

        // Normalizar longitude para [0, 2PI]
        longitude = mod(longitude + 2.0 * PI, 2.0 * PI);

        // Mapear para coordenadas de textura
        vec2 texCoord = vec2(longitude / (2.0 * PI), phi / PI);

        // Buscar cor da textura
        gl_FragColor = texture2D(map, texCoord);
      }
    `;

    try {
      if (type === 'dual-fisheye') {
        // Verificar se temos uma textura válida
        if (!textureRef.current) {
          console.error('Textura não disponível para shader');
          throw new Error('Textura não disponível');
        }

        console.log('Criando material de shader dual-fisheye com textura:', {
          textureType: textureRef.current instanceof THREE.VideoTexture ? 'VideoTexture' : 'Outro',
          textureImage: textureRef.current.image ? 'Presente' : 'Ausente',
          textureImageType: textureRef.current.image ? (textureRef.current.image.tagName || typeof textureRef.current.image) : 'N/A'
        });

        // Criar novo material com shader
        const dualFisheyeMaterial = new ShaderMaterial({
          uniforms: {
            map: { value: textureRef.current }
          },
          vertexShader: dualFisheyeVertexShader,
          fragmentShader: dualFisheyeFragmentShader,
          side: THREE.BackSide
        });

        // Verificar se o material foi criado corretamente
        if (!dualFisheyeMaterial) {
          console.error('Falha ao criar material de shader');
          throw new Error('Falha ao criar material');
        }

        // Aplicar o novo material
        sphereMeshRef.current.material = dualFisheyeMaterial;
        console.log('Material de shader dual-fisheye aplicado com sucesso');
      } else if (type === 'simple') {
        // Modo simples para debugging - apenas mostra a textura diretamente
        console.log('Usando modo simples (fallback) para debugging');

        // Criar um plano simples em vez de uma esfera
        if (sphereMeshRef.current) {
          // Remover a esfera atual da cena
          sceneRef.current.remove(sphereMeshRef.current);

          // Criar um plano simples
          const planeGeometry = new THREE.PlaneGeometry(3, 2);
          const planeMaterial = new THREE.MeshBasicMaterial({
            map: textureRef.current,
            side: THREE.DoubleSide
          });

          const plane = new THREE.Mesh(planeGeometry, planeMaterial);
          plane.position.set(0, 0, -2); // Posicionar na frente da câmera

          // Substituir a referência da esfera pelo plano
          sphereMeshRef.current = plane;
          sceneRef.current.add(plane);

          console.log('Plano simples criado para visualização direta da textura');
        } else {
          console.error('Mesh de esfera não disponível para substituir por plano');
        }
      } else {
        // Para projeção equiretangular padrão
        // Verificar se temos uma textura válida
        if (!textureRef.current) {
          console.error('Textura não disponível para material equiretangular');
          throw new Error('Textura não disponível');
        }

        console.log('Criando material equiretangular com textura:', {
          textureType: textureRef.current instanceof THREE.VideoTexture ? 'VideoTexture' : 'Outro',
          textureImage: textureRef.current.image ? 'Presente' : 'Ausente',
          textureImageType: textureRef.current.image ? (textureRef.current.image.tagName || typeof textureRef.current.image) : 'N/A'
        });

        // Verificar se ainda temos uma esfera
        if (sphereMeshRef.current && sphereMeshRef.current.geometry instanceof THREE.SphereGeometry) {
          const equirectMaterial = new THREE.MeshBasicMaterial({
            map: textureRef.current,
            side: THREE.BackSide
          });

          // Verificar se o material foi criado corretamente
          if (!equirectMaterial) {
            console.error('Falha ao criar material equiretangular');
            throw new Error('Falha ao criar material');
          }

          sphereMeshRef.current.material = equirectMaterial;
          console.log('Material equiretangular aplicado com sucesso');
        } else {
          // Se não temos uma esfera (talvez estivesse no modo simple), recriar a esfera
          if (sphereMeshRef.current) {
            sceneRef.current.remove(sphereMeshRef.current);
          }

          const sphereGeometry = new THREE.SphereGeometry(100, 60, 40);
          sphereGeometry.scale(-1, 1, 1); // Inverter para ver de dentro

          const equirectMaterial = new THREE.MeshBasicMaterial({
            map: textureRef.current,
            side: THREE.BackSide
          });

          const sphereMesh = new THREE.Mesh(sphereGeometry, equirectMaterial);
          sphereMeshRef.current = sphereMesh;
          sceneRef.current.add(sphereMesh);

          console.log('Nova esfera criada para projeção equiretangular');
        }
      }
    } catch (error) {
      console.error('Erro ao criar material de shader:', error);
      // Fallback para material básico em caso de erro
      try {
        // Criar um material básico mesmo sem textura se necessário
        const basicMaterial = new THREE.MeshBasicMaterial({
          map: textureRef.current || null,
          color: textureRef.current ? 0xFFFFFF : 0x888888, // Cor cinza se não tiver textura
          side: THREE.BackSide
        });

        if (sphereMeshRef.current) {
          sphereMeshRef.current.material = basicMaterial;
        } else {
          console.error('Mesh de esfera não disponível para aplicar material de fallback');
        }
      } catch (finalError) {
        console.error('Erro fatal ao criar material de fallback:', finalError);
        // Não há mais o que fazer aqui, apenas registrar o erro
      }
    }

    // Força a atualização do material e textura
    try {
      if (sphereMeshRef.current && sphereMeshRef.current.material) {
        // Garantir que o material seja atualizado
        sphereMeshRef.current.material.needsUpdate = true;

        // Garantir que a textura seja atualizada
        if (textureRef.current) {
          textureRef.current.needsUpdate = true;

          // Verificar se a textura está sendo aplicada corretamente
          if (type === 'dual-fisheye') {
            // Para shader material, atualizar o uniform
            if (sphereMeshRef.current.material.uniforms &&
                sphereMeshRef.current.material.uniforms.map) {
              sphereMeshRef.current.material.uniforms.map.value = textureRef.current;
              console.log('Textura atualizada no shader material');
            }
          } else {
            // Para material básico, atualizar o map
            if (sphereMeshRef.current.material.map !== textureRef.current) {
              sphereMeshRef.current.material.map = textureRef.current;
              console.log('Textura atualizada no material básico');
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar material:', error);
    }

    // Verificar se o vídeo está reproduzindo
    if (videoRef.current && videoRef.current.paused && isPlaying) {
      console.log('Vídeo está pausado, tentando reproduzir...');
      videoRef.current.play().catch(err => {
        console.error('Erro ao reproduzir vídeo após mudança de projeção:', err);
      });
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <h4>Insta360 X3 - Player Interativo 360°</h4>
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
          {!directView ? (
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                cursor: 'grab',
                display: directView ? 'none' : 'block'
              }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000'
            }}>
              <div style={{ textAlign: 'center', padding: '10px', color: '#fff', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                Visualização Direta (Sem processamento 360°)
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            crossOrigin="anonymous"
            muted
            playsInline
            autoPlay
            style={{
              display: directView ? 'block' : 'none',
              position: directView ? 'absolute' : 'static',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            onCanPlay={() => {
              console.log('Vídeo pronto para reprodução, readyState:', videoRef.current?.readyState);

              // Garantir que o vídeo esteja reproduzindo
              if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play().catch(err => {
                  console.error('Erro ao reproduzir vídeo no evento canplay:', err);
                });
              }

              // Forçar a criação de uma nova textura de vídeo
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const videoTexture = new THREE.VideoTexture(videoRef.current);
                  videoTexture.minFilter = THREE.LinearFilter;
                  videoTexture.magFilter = THREE.LinearFilter;
                  videoTexture.format = THREE.RGBAFormat;

                  // Substituir a textura atual
                  textureRef.current = videoTexture;
                  console.log('Nova textura de vídeo criada no evento canplay');

                  // Recriar material se estiver no modo 3D
                  if (!directView) {
                    changeProjection(projectionType);
                  }
                } catch (error) {
                  console.error('Erro ao criar textura no evento canplay:', error);
                }
              } else {
                console.warn('Vídeo ainda não tem dados suficientes no evento canplay');
              }
            }}
            onPlay={() => {
              console.log('Vídeo iniciou reprodução');
              setIsPlaying(true);
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
            onClick={() => {
              console.log('Botão Forçar Atualização clicado');

              // Exibir estado atual
              if (videoRef.current) {
                console.log('Estado atual do vídeo:', {
                  readyState: videoRef.current.readyState,
                  paused: videoRef.current.paused,
                  currentTime: videoRef.current.currentTime,
                  duration: videoRef.current.duration,
                  videoWidth: videoRef.current.videoWidth,
                  videoHeight: videoRef.current.videoHeight
                });
              }

              // Forçar a criação de uma nova textura de vídeo
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  // Garantir que o vídeo esteja reproduzindo
                  if (videoRef.current.paused) {
                    console.log('Tentando reproduzir vídeo pausado...');
                    videoRef.current.play().catch(err => {
                      console.error('Erro ao reproduzir vídeo no botão de forçar:', err);
                    });
                  }

                  // Criar nova textura
                  console.log('Criando nova VideoTexture...');
                  const videoTexture = new THREE.VideoTexture(videoRef.current);
                  videoTexture.minFilter = THREE.LinearFilter;
                  videoTexture.magFilter = THREE.LinearFilter;
                  videoTexture.format = THREE.RGBAFormat;

                  // Substituir a textura atual
                  textureRef.current = videoTexture;
                  console.log('Nova textura de vídeo criada pelo botão de forçar');

                  // Recriar o material com o shader atual
                  console.log('Aplicando projeção com a nova textura...');
                  changeProjection(projectionType);
                  console.log('Forçando atualização do shader e textura');

                  // Forçar atualização do material
                  if (sphereMeshRef.current && sphereMeshRef.current.material) {
                    sphereMeshRef.current.material.needsUpdate = true;
                    console.log('Material atualizado manualmente');

                    // Verificar se o material tem uniforms (shader material)
                    if (sphereMeshRef.current.material.uniforms &&
                        sphereMeshRef.current.material.uniforms.map) {
                      sphereMeshRef.current.material.uniforms.map.value = videoTexture;
                      console.log('Uniform map atualizado manualmente');
                    }
                  }
                } catch (error) {
                  console.error('Erro ao criar textura pelo botão de forçar:', error);
                }
              } else {
                console.warn('Vídeo não está pronto para criar textura, readyState:', videoRef.current?.readyState);
                // Tentar reproduzir o vídeo
                if (videoRef.current) {
                  console.log('Tentando reproduzir vídeo...');
                  videoRef.current.play().catch(err => {
                    console.error('Erro ao reproduzir vídeo:', err);
                  });
                }
              }
            }}
          >
            <i className="cil-mobile"></i> Forçar Atualização
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
          <CCol md={6}>
            <h6>Visualizações Predefinidas:</h6>
            <CButton size="sm" color="outline-primary" onClick={() => applyPreset('front')} className="me-1 mb-1">
              Frontal
            </CButton>
            <CButton size="sm" color="outline-primary" onClick={() => applyPreset('left')} className="me-1 mb-1">
              Esquerda
            </CButton>
            <CButton size="sm" color="outline-primary" onClick={() => applyPreset('right')} className="me-1 mb-1">
              Direita
            </CButton>
            <CButton size="sm" color="outline-primary" onClick={() => applyPreset('back')} className="me-1 mb-1">
              Traseira
            </CButton>
            <CButton size="sm" color="outline-primary" onClick={() => applyPreset('top')} className="me-1 mb-1">
              Topo
            </CButton>
            <CButton size="sm" color="outline-primary" onClick={() => applyPreset('bottom')} className="me-1 mb-1">
              Base
            </CButton>
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
              onChange={(e) => changeProjection(e.target.value)}
            >
              <option value="equirectangular">Equiretangular (padrão)</option>
              <option value="dual-fisheye">Dual Fisheye (Insta360)</option>
              <option value="simple">Simples (Fallback)</option>
            </CFormSelect>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default Insta360Player
