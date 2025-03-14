import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CCard, CCardBody, CCardHeader, CSpinner, CButton, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilWarning, cilLocationPin } from '@coreui/icons'

// Estilo para o mapa simulado
const mapStyle = {
  height: '600px',
  width: '100%',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#f0f8ff',
}

const SubstationMap = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [substations, setSubstations] = useState([])
  const [hoveredState, setHoveredState] = useState(null)
  const [svgContent, setSvgContent] = useState('')
  const mapContainerRef = useRef(null)
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 })
  const svgRef = useRef(null)

  // Função para converter coordenadas geográficas para coordenadas SVG
  const geoToSvgCoordinates = (latitude, longitude, svgElement) => {
    if (!svgElement) return { x: 0, y: 0 };

    const SVG_BRAZIL = {
      MIN_LON: -74.0,
      MAX_LON: -34.0,
      MIN_LAT: -33.0,
      MAX_LAT: 5.0,
      ADJUST_X: -15,
      ADJUST_Y: -10
    };

    const viewBox = svgElement.viewBox.baseVal;
    const svgWidth = viewBox.width;
    const svgHeight = viewBox.height;

    // Calcular proporção X (longitude)
    const proportionX = (longitude - SVG_BRAZIL.MIN_LON) / (SVG_BRAZIL.MAX_LON - SVG_BRAZIL.MIN_LON);
    const x = viewBox.x + proportionX * svgWidth + SVG_BRAZIL.ADJUST_X;

    // Calcular proporção Y (latitude, invertida)
    const proportionY = 1 - ((latitude - SVG_BRAZIL.MIN_LAT) / (SVG_BRAZIL.MAX_LAT - SVG_BRAZIL.MIN_LAT));
    const y = viewBox.y + proportionY * svgHeight + SVG_BRAZIL.ADJUST_Y;

    return { x, y };
  };

  // Função para posicionar os marcadores de subestação
  const positionSubstationMarkers = () => {
    const svgElement = document.getElementById('brazil-map');
    if (!svgElement) return;

    svgRef.current = svgElement;
    const viewBox = svgElement.viewBox.baseVal;

    // Usar requestAnimationFrame para garantir que o posicionamento aconteça após o layout
    requestAnimationFrame(() => {
      setSubstations(prev =>
        prev.map(sub => {
          let percentX, percentY;

          // Posicionamento fixo para Parnaíba
          if (sub.name === 'Argo Parnaíba') {
            // Posicionar relativo ao estado do Piauí
            const piauiElement = document.querySelector('#brazil-map path[title="Piauí"], #brazil-map path#BR-PI');

            if (piauiElement) {
              // Usar o centro do estado de Piauí como referência
              const bbox = piauiElement.getBBox();
              const centerX = bbox.x + bbox.width * 0.35; // 35% da largura para a direita
              const centerY = bbox.y + bbox.height * 0.3; // 30% da altura para baixo

              percentX = ((centerX - viewBox.x) / viewBox.width) * 100;
              percentY = ((centerY - viewBox.y) / viewBox.height) * 100;
            } else {
              // Fallback se não encontrar o elemento do Piauí
              percentX = 32;
              percentY = 28;
            }
          } else {
            // Cálculo normal para outras subestações
            const { latitude, longitude } = sub.geoCoordinates;
            const { x, y } = geoToSvgCoordinates(latitude, longitude, svgElement);
            percentX = ((x - viewBox.x) / viewBox.width) * 100;
            percentY = ((y - viewBox.y) / viewBox.height) * 100;
          }

          console.log(`Substation ${sub.name}: left=${percentX}%, top=${percentY}%`);

          return {
            ...sub,
            location: {
              left: percentX + '%',
              top: percentY + '%'
            }
          };
        })
      );
    });
  };

  // Carregar SVG e subestações ao montar
  useEffect(() => {
    // Carregar o SVG como texto
    const fetchSvg = async () => {
      try {
        const response = await fetch('/src/assets/images/brazil.svg')
        const svgText = await response.text()

        // Processar o SVG para adicionar ID e estilos
        const processedSvg = svgText
          .replace(/<svg/, '<svg id="brazil-map"')
          .replace(/<path/g, '<path style="fill:#2986cc;stroke:#ffffff;stroke-width:0.5"')

        setSvgContent(processedSvg)
      } catch (error) {
        console.error('Erro ao carregar SVG:', error)
      }
    }

    fetchSvg()

    // Simular carregamento de dados de subestações
    const fetchSubstations = async () => {
      try {
        // Dados da subestação com coordenadas geográficas
        const mockData = [
          {
            id: 1,
            name: 'Argo Parnaíba',
            location: { top: '50%', left: '50%' }, // Posição temporária
            geoCoordinates: {
              latitude: -3.1232281049031023 - 0.5, // Ajuste da latitude (mais para cima)
              longitude: -41.76591793320992 - 1.5  // Ajuste da longitude (mais para a esquerda)
            },
            status: 'operational',
            voltage: '500kV',
            rovers: 3,
            lastInspection: '2024-10-15',
            state: 'PI',
          },
        ]

        setSubstations(mockData)
        setLoading(false)
      } catch (error) {
        console.error('Erro ao carregar subestações:', error)
        setLoading(false)
      }
    }

    fetchSubstations()

    // Atualiza dimensões do container do mapa
    const updateMapDimensions = () => {
      if (mapContainerRef.current) {
        setMapDimensions({
          width: mapContainerRef.current.offsetWidth,
          height: mapContainerRef.current.offsetHeight,
        })
      }
    }

    updateMapDimensions()
    window.addEventListener('resize', updateMapDimensions)

    return () => {
      window.removeEventListener('resize', updateMapDimensions)
    }
  }, [])

  // Após carregar o SVG no estado, adiciona interatividade e posiciona as subestações
  useEffect(() => {
    if (svgContent) {
      const svgContainer = document.getElementById('svg-container')
      if (svgContainer) {
        setTimeout(() => {
          const paths = document.querySelectorAll('#brazil-map path')
          paths.forEach((path) => {
            // Eventos de mouse (hover)
            path.addEventListener('mouseenter', () => {
              path.style.fill = '#1c5a9c'
              if (path.getAttribute('title')) {
                setHoveredState(path.getAttribute('title'))
              }
            })
            path.addEventListener('mouseleave', () => {
              path.style.fill = '#2986cc'
              setHoveredState(null)
            })

            // Destacar o estado do Piauí ao carregar
            if (
              path.getAttribute('title') === 'Piauí' ||
              path.getAttribute('id') === 'BR-PI'
            ) {
              path.style.fill = '#1c5a9c'
              setTimeout(() => {
                path.style.fill = '#2986cc'
              }, 1500)
            }
          })

          // Posicionar as subestações após carregar o SVG
          setTimeout(positionSubstationMarkers, 200)
        }, 100)
      }
    }
  }, [svgContent])

  // Recalcular posição quando as dimensões do container mudarem
  useEffect(() => {
    if (svgContent && substations.length > 0) {
      // Adicionar um pequeno atraso para garantir que o SVG foi renderizado
      const timer = setTimeout(() => {
        positionSubstationMarkers();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [mapDimensions, substations.length, svgContent]);

  const handleSubstationClick = (substationId) => {
    navigate(`/inspect/substation/${substationId}`)
  }

  // Determina o ícone com base no status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return <CIcon icon={cilCheckCircle} className="text-white" />
      case 'maintenance':
        return <CIcon icon={cilWarning} className="text-white" />
      case 'alert':
        return <CIcon icon={cilWarning} className="text-white" />
      default:
        return <CIcon icon={cilLocationPin} className="text-white" />
    }
  }

  // Determina a cor do marcador com base no status
  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'success'
      case 'maintenance':
        return 'warning'
      case 'alert':
        return 'danger'
      default:
        return 'primary'
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Mapa de Subestações</strong>
        <small className="ms-2">Clique em uma subestação para inspecionar</small>
        {hoveredState && <span className="float-end text-primary">{hoveredState}</span>}
      </CCardHeader>
      <CCardBody>
        {loading ? (
          <div className="d-flex justify-content-center p-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <div style={mapStyle} ref={mapContainerRef}>
            {/* Renderização do SVG com configuração importante de preserveAspectRatio */}
            <div
              id="svg-container"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                overflow: 'hidden' // Impedir que o SVG vaze para fora do container
              }}
              dangerouslySetInnerHTML={{
                __html: svgContent.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet" width="100%" height="100%"')
              }}
            />

            {substations.map((substation) => {
              const { top, left } = substation.location;

              return (
                <div
                  key={substation.id}
                  style={{
                    position: 'absolute',
                    top: top,
                    left: left,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                  }}
                >
                  <CTooltip content={substation.name}>
                    <div
                      className={`bg-${getStatusColor(substation.status)} rounded-circle d-flex justify-content-center align-items-center`}
                      style={{
                        width: '36px',
                        height: '36px',
                        cursor: 'pointer',
                        border: '3px solid white',
                        boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                        animation: 'pulse 2s infinite',
                      }}
                      onClick={() => handleSubstationClick(substation.id)}
                    >
                      {getStatusIcon(substation.status)}
                    </div>
                  </CTooltip>
                  <div
                    className="substation-popup bg-white p-3 rounded shadow"
                    style={{
                      position: 'absolute',
                      top: '45px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '250px',
                      display: 'none',
                      zIndex: 1001,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.display = 'block')}
                    onMouseLeave={(e) => (e.currentTarget.style.display = 'none')}
                  >
                    <h5 className="text-primary">{substation.name}</h5>
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className={`text-${getStatusColor(substation.status)}`}>
                        {substation.status === 'operational'
                          ? 'Operacional'
                          : substation.status === 'maintenance'
                          ? 'Em Manutenção'
                          : 'Alerta'}
                      </span>
                    </p>
                    <p>
                      <strong>Estado:</strong> {substation.state}
                    </p>
                    <p>
                      <strong>Tensão:</strong> {substation.voltage}
                    </p>
                    <p>
                      <strong>Rovers:</strong> {substation.rovers}
                    </p>
                    <p>
                      <strong>Última Inspeção:</strong> {substation.lastInspection}
                    </p>
                    <CButton
                      color="primary"
                      size="sm"
                      className="w-100"
                      onClick={() => handleSubstationClick(substation.id)}
                    >
                      Inspecionar
                    </CButton>
                  </div>
                </div>
              );
            })}

            {/* Legenda de cores */}
            <div
              className="position-absolute bottom-0 start-0 p-2 bg-white bg-opacity-75 rounded m-2"
              style={{ zIndex: 1000 }}
            >
              <div className="d-flex align-items-center mb-1">
                <div
                  className="bg-success rounded-circle me-2"
                  style={{ width: '12px', height: '12px' }}
                ></div>
                <small>Operacional</small>
              </div>
              <div className="d-flex align-items-center mb-1">
                <div
                  className="bg-warning rounded-circle me-2"
                  style={{ width: '12px', height: '12px' }}
                ></div>
                <small>Em Manutenção</small>
              </div>
              <div className="d-flex align-items-center">
                <div
                  className="bg-danger rounded-circle me-2"
                  style={{ width: '12px', height: '12px' }}
                ></div>
                <small>Alerta</small>
              </div>
            </div>

            {/* Animação de "pulse" para o marcador */}
            <style>
              {`
                @keyframes pulse {
                  0% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
                  }
                  70% {
                    transform: scale(1.1);
                    box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
                  }
                  100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
                  }
                }
              `}
            </style>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default SubstationMap
