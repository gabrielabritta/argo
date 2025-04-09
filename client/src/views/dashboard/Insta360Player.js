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
import Hls from 'hls.js'

const Insta360Player = ({ streamUrl = 'http://localhost:8080/hls/stream.m3u8' }) => {
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
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableZoom = false
      controls.enablePan = false
      controls.rotateSpeed = 0.5
      controlsRef.current = controls

      // Criar vídeo como textura
      const video = videoRef.current
      const texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBAFormat
      textureRef.current = texture

      // Criar esfera para projeção equiretangular
      const sphereGeometry = new THREE.SphereGeometry(100, 60, 40)
      sphereGeometry.scale(-1, 1, 1) // Inverter para ver de dentro

      // Criar material
      const sphereMaterial = new THREE.MeshBasicMaterial({
        map: texture
      })

      // Criar mesh
      const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
      sphereMeshRef.current = sphereMesh
      scene.add(sphereMesh)

      changeProjection(projectionType)

      // Iniciar loop de renderização
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()
    }

    // Configurar HLS
    const setupHls = () => {
      const video = videoRef.current
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      })

      hlsRef.current = hls

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
                console.warn('Stream não disponível ainda')
                setStatus({ 
                  type: 'warning', 
                  message: 'Nenhum stream disponível. Inicie uma transmissão RTMP para rtmp://localhost:1935/live/stream' 
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
    if (videoRef.current) {
      setupThreeJS()
      setupHls()
      window.addEventListener('resize', handleResize)
    } else {
      console.error('Elemento de vídeo não carregado corretamente')
      setStatus({ type: 'error', message: 'Erro ao carregar recursos necessários' })
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

  // Mudar o URL do stream
  useEffect(() => {
    if (hlsRef.current && videoRef.current) {
      setStatus({ type: 'loading', message: 'Conectando ao stream...' })
      hlsRef.current.loadSource(streamAddress)
    }
  }, [streamAddress])

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
    
    if (!sphereMeshRef.current || !textureRef.current) return
    
    const material = sphereMeshRef.current.material
    
    if (type === 'dual-fisheye') {
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          'void main() {',
          `
          // Funções para converter coordenadas esféricas para dual-fisheye
          vec2 getFisheyeCoord(vec2 uv, float fishFOV) {
            // Converter de coordenadas UV normalizadas (0-1) para coordenadas centradas (-1 a 1)
            vec2 fishCenter = vec2(0.5, 0.5);
            vec2 centered = (uv - fishCenter) * 2.0;
            
            // Calcular distância do centro
            float r = length(centered);
            
            // Se estiver fora do olho de peixe, retorne coordenadas inválidas
            if (r > 1.0) return vec2(-1.0);
            
            // Calcular ângulo no círculo
            float phi = atan(centered.y, centered.x);
            
            // Mapear do círculo para a esfera usando fórmula do fisheye
            float theta = r * fishFOV * 0.5;
            
            // Retornar coordenadas esféricas
            return vec2(phi, theta);
          }
          
          vec2 dualFisheyeToEquirectangular(vec2 uv) {
            // Determinar qual olho de peixe usar
            bool isRightFish = uv.x > 0.5;
            
            // Ajustar coordenadas para o olho de peixe específico
            vec2 fishUV = isRightFish ? vec2((uv.x - 0.5) * 2.0, uv.y) : vec2(uv.x * 2.0, uv.y);
            
            // Obter coordenadas do fisheye
            vec2 sphereCoords = getFisheyeCoord(fishUV, radians(190.0));
            
            // Se as coordenadas são inválidas, retorne preto
            if (sphereCoords.x < -0.5) return vec2(-1.0);
            
            // Converter para coordenadas equiretangulares
            float phi = sphereCoords.x;
            float theta = sphereCoords.y;
            
            // Ajustar o ângulo horizontal com base em qual olho de peixe
            phi = isRightFish ? phi : phi + 3.14159265359;
            
            // Converter para coordenadas UV (0-1)
            float u = phi / (2.0 * 3.14159265359) + 0.5;
            float v = theta / 3.14159265359 + 0.5;
            
            return vec2(u, v);
          }
          
          void main() {
          `
        );
        
        shader.fragmentShader = shader.fragmentShader.replace(
          'vec4 texelColor = texture2D( map, vUv );',
          `
          vec2 equirectUV = dualFisheyeToEquirectangular(vUv);
          vec4 texelColor = equirectUV.x < 0.0 ? vec4(0.0, 0.0, 0.0, 1.0) : texture2D(map, equirectUV);
          `
        );
      };
    } else {
      // Para projeção equiretangular padrão
      material.onBeforeCompile = null;
    }
    
    // Força a atualização do material
    material.needsUpdate = true;
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
          <canvas 
            ref={canvasRef} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              cursor: 'grab'
            }}
          />
          <video 
            ref={videoRef} 
            crossOrigin="anonymous" 
            muted 
            playsInline 
            style={{ display: 'none' }}
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
          <CButton color="purple" className="me-2">
            <i className="cil-mobile"></i> Modo VR
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
            </CFormSelect>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default Insta360Player
