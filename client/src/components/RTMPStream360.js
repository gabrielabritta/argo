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
import * as THREE from 'three'
import { API_BASE_URL, WS_BASE_URL } from '../config'

// Adicionar script Pannellum para visualização alternativa
const loadPannellum = () => {
  return new Promise((resolve, reject) => {
    // Verificar se já foi carregado
    if (window.pannellum) {
      resolve(window.pannellum);
      return;
    }

    // Carregar o CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
    document.head.appendChild(linkElement);

    // Carregar o JS
    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    scriptElement.async = true;
    
    scriptElement.onload = () => resolve(window.pannellum);
    scriptElement.onerror = (error) => reject(error);
    
    document.head.appendChild(scriptElement);
  });
};

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
  const imagePlayerRef = useRef(null);
  const imagePlayerInstanceRef = useRef(null);
  const regularImageRef = useRef(null);
  const modalRenderedRef = useRef(false);
  const pannellumContainerRef = useRef(null);
  const pannellumViewerRef = useRef(null);

  // Estado
  const [status, setStatus] = useState({ type: 'loading', message: 'Carregando...' })
  const [streamAddress, setStreamAddress] = useState(streamUrl)
  const [usePannellum, setUsePannellum] = useState(true);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);

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
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCapturedImage, setShowCapturedImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

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
        
        // Verificar se a mensagem é válida e tem os campos esperados
        if (!msg || !msg.type) {
          console.error('Mensagem WebSocket sem tipo ou mal-formada:', msg);
          return;
        }

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
          console.log('Insta360 capture message received:', msg.data);
          console.log('Tipo de dados recebidos:', typeof msg.data);
          console.log('Chaves do objeto msg.data:', Object.keys(msg.data));
          console.log('Campo "image" existe?', 'image' in msg.data, msg.data.image !== undefined);
          console.log('Campo "img" existe?', 'img' in msg.data, msg.data.img !== undefined);
          console.log('Valores dos campos - image:', msg.data.image, '| img:', msg.data.img);
          
          // Verificar se é a primeira mensagem (confirmação do comando)
          if (!msg.data.image && (!msg.data.img || msg.data.img === null)) {
            console.log('Confirmação de comando de captura recebida');
            // Mostrar mensagem de espera
            setResponseToast({
              visible: true,
              status: null,
              message: 'Captura em andamento... Aguarde até 30 segundos.'
            });
            return;
          }
          
          // Se chegou aqui, é a mensagem com a imagem
          // Verificar se a imagem está no campo 'image' ou 'img'
          const imageData = msg.data.image || msg.data.img;
          
          // Verificar se a imagem não é nula antes de prosseguir
          if (!imageData) {
            console.error('Dados da imagem não encontrados ou nulos nas chaves:', Object.keys(msg.data));
            console.error('Campos esperados "image" ou "img" estão vazios ou são null/undefined');
            setIsCapturing(false);
            setResponseToast({
              visible: true,
              status: 0,
              message: 'Erro: dados da imagem não encontrados ou são nulos'
            });
            return;
          }
          
          // Log detalhado da imagem recebida
          console.log('Imagem base64 recebida de campo:', msg.data.image ? 'image' : 'img');
          console.log('Imagem base64 recebida, tamanho:', imageData.length);
          console.log('Tipo de dados da imagem:', typeof imageData);
          
          // Verificar se a string está truncada ou corrompida
          const isValidEnd = imageData.endsWith('==') || imageData.endsWith('=');
          console.log('A imagem termina com padding de base64 válido:', isValidEnd);
          
          console.log('Primeiros 100 caracteres da imagem:', imageData.substring(0, 100) + '...');
          console.log('Últimos 100 caracteres da imagem:', imageData.substring(imageData.length - 100) + '...');
          
          // Limpar o timeout se existir
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          // Extrair a parte base64 se a imagem já vier com o prefixo data:image
          let processedImageData = imageData;
          if (typeof processedImageData === 'string' && processedImageData.startsWith('data:image')) {
            console.log('Imagem já contém prefixo data:image, extraindo apenas a parte base64');
            processedImageData = processedImageData.split(',')[1]; // Extrair apenas a parte base64
          }
          
          // Verificar se a imagem não está corrompida
          try {
            const testDecode = atob(processedImageData.substring(0, 10));
            console.log('Imagem base64 é válida');
          } catch (e) {
            console.error('Imagem recebida não é um base64 válido:', e);
            setIsCapturing(false);
            setResponseToast({
              visible: true,
              status: 0,
              message: 'Imagem recebida em formato inválido'
            });
            return;
          }
          
          setIsCapturing(false);
          setCapturedImage(processedImageData);
          console.log('Estado capturedImage atualizado com a imagem');
          setShowImageModal(true);
          console.log('Modal de imagem configurado para exibição');
          
          // Mostrar toast de sucesso
          setResponseToast({
            visible: true,
            status: 1,
            message: 'Imagem capturada com sucesso!'
          });
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

  // Carregar Pannellum ao iniciar o componente
  useEffect(() => {
    loadPannellum()
      .then(() => {
        console.log('Pannellum carregado com sucesso');
        setPannellumLoaded(true);
      })
      .catch(error => {
        console.error('Erro ao carregar Pannellum:', error);
      });
  }, []);

  // Atualizar o useEffect que monitora a modal e a imagem
  useEffect(() => {
    if (showImageModal && capturedImage) {
      console.log('Inicializando visualizador Pannellum para imagem 360°');
      
      let attempts = 0;
      const maxAttempts = 30; // 30 * 100ms = 3 segundos de timeout
      
      const checkPannellumContainer = () => {
        attempts++;
        if (pannellumContainerRef.current) {
          console.log(`Container Pannellum encontrado após ${attempts} tentativas`);
          
          // Tentar carregar a biblioteca se ainda não estiver carregada
          if (!pannellumLoaded) {
            loadPannellum()
              .then(() => {
                console.log('Pannellum carregado com sucesso');
                setPannellumLoaded(true);
                
                // Obter o src da imagem
                let imageSrc;
                if (typeof capturedImage === 'string') {
                  if (capturedImage.startsWith('data:')) {
                    imageSrc = capturedImage;
                  } else {
                    // Detectar tipo de mídia
                    let mimeType = 'image/jpeg'; // Padrão
                    if (capturedImage.startsWith('/9j/')) {
                      console.log('Detectado formato JPEG pelo cabeçalho base64');
                      mimeType = 'image/jpeg';
                    } else if (capturedImage.startsWith('iVBORw0K')) {
                      console.log('Detectado formato PNG pelo cabeçalho base64');
                      mimeType = 'image/png';
                    }
                    imageSrc = `data:${mimeType};base64,${capturedImage}`;
                  }
                  initializePannellumViewer(imageSrc);
                } else {
                  console.error('capturedImage não é uma string:', typeof capturedImage);
                  setResponseToast({
                    visible: true,
                    status: 0,
                    message: 'Formato de imagem inválido'
                  });
                }
              })
              .catch(error => {
                console.error('Erro ao carregar Pannellum:', error);
                setResponseToast({
                  visible: true,
                  status: 0,
                  message: 'Erro ao carregar visualizador panorâmico'
                });
              });
          } else {
            // Se já estiver carregado, inicializar diretamente
            let imageSrc;
            if (typeof capturedImage === 'string') {
              // Detectar tipo de mídia
              let mimeType = 'image/jpeg'; // Padrão
              if (capturedImage.startsWith('/9j/')) {
                console.log('Detectado formato JPEG pelo cabeçalho base64');
                mimeType = 'image/jpeg';
              } else if (capturedImage.startsWith('iVBORw0K')) {
                console.log('Detectado formato PNG pelo cabeçalho base64');
                mimeType = 'image/png';
              }
              
              if (capturedImage.startsWith('data:')) {
                imageSrc = capturedImage;
              } else {
                imageSrc = `data:${mimeType};base64,${capturedImage}`;
              }
              initializePannellumViewer(imageSrc);
            } else {
              console.error('capturedImage não é uma string:', typeof capturedImage);
              setResponseToast({
                visible: true,
                status: 0,
                message: 'Formato de imagem inválido'
              });
            }
          }
        } else if (attempts < maxAttempts) {
          console.log(`Container Pannellum ainda não disponível, tentativa ${attempts}/${maxAttempts}`);
          setTimeout(checkPannellumContainer, 100);
        } else {
          console.error('Timeout: Container Pannellum não encontrado após várias tentativas');
          setResponseToast({
            visible: true,
            status: 0,
            message: 'Erro ao inicializar visualizador panorâmico'
          });
        }
      };
      
      checkPannellumContainer();
    } else if (!showImageModal) {
      // Limpar sinalizador quando modal é fechado
      modalRenderedRef.current = false;
      
      // Destruir o visualizador Pannellum se existir
      if (pannellumViewerRef.current) {
        try {
          // Verificar se tem método destroy
          if (typeof pannellumViewerRef.current.destroy === 'function') {
            pannellumViewerRef.current.destroy();
          }
          pannellumViewerRef.current = null;
        } catch (e) {
          console.error('Erro ao destruir visualizador Pannellum:', e);
        }
      }
    }
    
    return () => {
      // Limpar recursos do Pannellum
      if (pannellumViewerRef.current) {
        try {
          if (typeof pannellumViewerRef.current.destroy === 'function') {
            pannellumViewerRef.current.destroy();
          }
          pannellumViewerRef.current = null;
        } catch (e) {
          console.error('Erro ao destruir visualizador Pannellum no cleanup:', e);
        }
      }
    };
  }, [showImageModal, capturedImage, pannellumLoaded]);

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
      const response = await fetch(`${API_BASE_URL || 'http://localhost:8000/api'}/rovers/${roverId}/insta/live/`, {
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
      console.log('Iniciando captura de imagem...');
      setIsCapturing(true);
      
      // Limpar qualquer imagem anterior
      setCapturedImage(null);
      
      // Mostrar toast de "aguardando"
      setResponseToast({
        visible: true,
        status: null,
        message: 'Aguardando captura da imagem...'
      });
      
      const response = await fetch(`${API_BASE_URL || 'http://localhost:8000/api'}/rovers/${roverId}/insta/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          capture: 1
        }),
      });

      if (!response.ok) {
        console.error('Erro na captura:', response.statusText);
        setIsCapturing(false);
        setResponseToast({
          visible: true,
          status: 0,
          message: 'Erro ao capturar imagem'
        });
      } else {
        // Mostrar dados da resposta da API para debug
        try {
          const responseData = await response.json();
          console.log('Resposta da API de captura:', responseData);
          
          // Verificar se a resposta já contém uma imagem (comportamento síncrono)
          if (responseData && responseData.image) {
            console.log('Imagem recebida diretamente da resposta API');
            setIsCapturing(false);
            openImageModal(responseData.image);
            
            setResponseToast({
              visible: true,
              status: 1,
              message: 'Imagem capturada com sucesso!'
            });
            return;
          }
        } catch (e) {
          console.log('Resposta sem corpo JSON');
        }
        
        console.log('Comando de captura enviado com sucesso, aguardando imagem (pode demorar até 30 segundos)...');
        console.log('IMPORTANTE: Verificar se o backend está enviando mensagem com campo "image" (não apenas "img")');
        
        // Configurar timeout mais longo (30 segundos)
        timeoutRef.current = setTimeout(() => {
          if (isCapturing) {
            console.log('Timeout atingido - imagem não recebida após 30 segundos');
            setIsCapturing(false);
            setResponseToast({
              visible: true,
              status: 0,
              message: 'Tempo limite excedido (30s) - Imagem não recebida'
            });
          }
        }, 30000); // Aumentado para 30 segundos
      }
    } catch (error) {
      console.error('Erro ao capturar imagem:', error);
      setIsCapturing(false);
      setResponseToast({
        visible: true,
        status: 0,
        message: `Erro de conexão: ${error.message}`
      });
    }
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    if (imagePlayerInstanceRef.current) {
      imagePlayerInstanceRef.current.dispose();
      imagePlayerInstanceRef.current = null;
    }
    modalRenderedRef.current = false;
  };

  // Função para exibir o modal e garantir a inicialização do player
  const openImageModal = (image) => {
    setCapturedImage(image);
    setShowImageModal(true);
    setUsePannellum(true);
    
    // Resetar o sinalizador para forçar nova inicialização do player
    modalRenderedRef.current = false;
    
    console.log('Modal de imagem aberto em modo 360° com Pannellum, aguardando renderização DOM');
  };

  // Função para salvar a imagem
  const handleSaveImage = () => {
    try {
      if (!capturedImage) {
        console.error('Não há imagem para salvar');
        setResponseToast({
          visible: true,
          status: 0,
          message: 'Não há imagem para salvar'
        });
        return;
      }

      let imageDataUrl;
      if (capturedImage.startsWith('data:')) {
        imageDataUrl = capturedImage;
      } else {
        imageDataUrl = `data:image/jpeg;base64,${capturedImage}`;
      }

      // Criar link para download
      const link = document.createElement('a');
      link.href = imageDataUrl;
      link.download = `insta360_capture_${new Date().toISOString()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setResponseToast({
        visible: true,
        status: 1,
        message: 'Imagem salva com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      setResponseToast({
        visible: true,
        status: 0,
        message: `Erro ao salvar imagem: ${error.message}`
      });
    }
  };

  // Adicionar função para inicializar o Pannellum
  const initializePannellumViewer = (imageSrc) => {
    if (!pannellumContainerRef.current || !window.pannellum) {
      console.error('Container Pannellum ou biblioteca não disponível');
      setResponseToast({
        visible: true,
        status: 0,
        message: 'Erro ao inicializar visualizador panorâmico'
      });
      return;
    }
    
    try {
      // Limpar qualquer visualizador existente
      if (pannellumViewerRef.current) {
        pannellumViewerRef.current = null;
      }
      
      // Limpar o conteúdo do container
      pannellumContainerRef.current.innerHTML = '';
      
      console.log('Inicializando Pannellum com imagem:', imageSrc.substring(0, 50) + '...');
      
      pannellumViewerRef.current = window.pannellum.viewer(
        pannellumContainerRef.current,
        {
          type: 'equirectangular',
          panorama: imageSrc,
          autoLoad: true,
          compass: true,
          showFullscreenCtrl: true,
          showZoomCtrl: true,
          mouseZoom: true,
          keyboardZoom: true
        }
      );
      
      console.log('Pannellum inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar Pannellum:', error);
      setResponseToast({
        visible: true,
        status: 0,
        message: 'Erro ao inicializar visualizador panorâmico'
      });
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
                disabled={!isInstaConnected || showCapturedImage}
              >
                {isLiveActive ? "Parar Live" : "Iniciar Live"}
              </CButton>
              <CButton
                color="info"
                size="sm"
                onClick={handleCapture}
                className="me-2"
                disabled={!isInstaConnected || isCapturing || isLiveActive}
              >
                {isCapturing ? "Capturando..." : "Capturar Imagem"}
              </CButton>
              {showCapturedImage && (
                <CButton
                  color="warning"
                  size="sm"
                  onClick={() => {
                    setShowCapturedImage(false)
                    setCapturedImage(null)
                    // Restaurar o stream ao player
                    if (playerRef.current) {
                      playerRef.current.src({
                        src: streamAddress,
                        type: 'application/x-mpegURL'
                      })
                      playerRef.current.load()
                    }
                  }}
                  className="me-2"
                >
                  Voltar para Live
                </CButton>
              )}
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

      {/* Modal para exibir imagem 360° */}
      <CModal 
        visible={showImageModal} 
        onClose={handleCloseImageModal}
        size="xl"
        onShow={() => console.log('Modal de imagem aberto, capturedImage existe:', !!capturedImage)}
      >
        <CModalTitle>Imagem 360° Capturada</CModalTitle>
        <CModalBody>
          {/* Container para Pannellum - sempre visível sem condição */}
          <div
            ref={pannellumContainerRef}
            style={{
              width: '100%',
              height: '500px',
              backgroundColor: '#000',
              borderRadius: '8px'
            }}
          ></div>
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={handleSaveImage} className="me-2">
            Salvar Imagem
          </CButton>
          <CButton color="secondary" onClick={handleCloseImageModal}>
            Fechar
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default RTMPStream360
