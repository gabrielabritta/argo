import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CAlert, CCol, CRow } from '@coreui/react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { IconButton } from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import mapArrowLeft from './map-arrow-left.svg'
import argoSvg from './argo1.svg'

const LocationMonitoring = ({ roverId, substationId }) => {
  const [map, setMap] = useState(null)
  const [marker, setMarker] = useState(null)
  const [gpsError, setGpsError] = useState(false)
  const [position, setPosition] = useState({
    latitude: null,
    longitude: null,
    compass: 0, // valor padrão se não vier do backend
  })
  const [controlsFocused, setControlsFocused] = useState(false)

  // Criamos um overlay de imagem para zoom alto
  const svgBounds = [
    [-3.126, -41.77],
    [-3.121, -41.76],
  ]
  const svgOverlay = L.imageOverlay(argoSvg, svgBounds)

  useEffect(() => {
    // Inicializa o mapa somente uma vez
    if (!map) {
      const mapElement = document.getElementById('map')
      if (mapElement) {
        const initialMap = L.map(mapElement).setView([-3.12325756, -41.76599571], 16)

        const baseLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 25,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ',
          },
        ).addTo(initialMap)

        // Controlar a troca do tileLayer pelo svgOverlay dependendo do zoom
        initialMap.on('zoomend', () => {
          const zoomLevel = initialMap.getZoom()
          if (zoomLevel > 17) {
            // Remove a camada de satélite e coloca o overlay
            if (!initialMap.hasLayer(svgOverlay)) {
              baseLayer.remove()
              svgOverlay.addTo(initialMap)
            }
          } else {
            if (initialMap.hasLayer(svgOverlay)) {
              svgOverlay.remove()
              baseLayer.addTo(initialMap)
            }
          }
        })

        setMap(initialMap)
      }
    }
  }, [map])

  // Buscar GPS data do backend
  useEffect(() => {
    if (map && roverId && substationId) {
      const fetchGPSData = async () => {
        try {
          // AQUI: Passamos rover e substation como query params
          const url = `http://localhost:8000/api/gps-data/?rover=${roverId}&substation=${substationId}`
          const response = await fetch(url)
          if (!response.ok) {
            // Se deu 400 ou outro, disparamos erro
            throw new Error(`GPS data fetch failed: HTTP ${response.status}`)
          }
          const data = await response.json()

          // Ajuste aqui dependendo do que seu backend retorna:
          // Se retorna: {"latitude": X, "longitude": Y, "status": "em missão"}...
          // E se não retorna "compass", definimos 0 ou algo.
          if (data.latitude && data.longitude) {
            // Se tiver latitude e longitude, atualizamos
            setPosition((prev) => ({
              ...prev,
              latitude: data.latitude,
              longitude: data.longitude,
              compass: data.compass || 0, // se o backend não mandar compass, setamos 0
            }))
            setGpsError(false)
          } else {
            // Se não vier lat/long, consideramos erro
            console.error('GPS data is incomplete:', data)
            setGpsError(true)
          }
        } catch (error) {
          console.error('Error fetching GPS data:', error)
          setGpsError(true)
        }
      }

      fetchGPSData()
      const intervalId = setInterval(fetchGPSData, 5000)
      return () => clearInterval(intervalId)
    }
  }, [map, roverId, substationId])

  // Atualiza o marker no mapa quando position muda
  useEffect(() => {
    if (map && position.latitude !== null && position.longitude !== null) {
      const gpsIcon = L.divIcon({
        className: 'custom-marker',
        html: `<img src="${mapArrowLeft}" style="transform: rotate(${position.compass + 90}deg);" alt="GPS Icon" />`,
        iconSize: [30, 30],
      })

      if (!marker) {
        const newMarker = L.marker([position.latitude, position.longitude], {
          icon: gpsIcon,
        }).addTo(map)
        setMarker(newMarker)
      } else {
        // Atualiza posição do marker e a rotação do ícone
        marker.setLatLng([position.latitude, position.longitude])
        const iconElement = marker.getElement()?.querySelector('img')
        if (iconElement) {
          iconElement.style.transform = `rotate(${position.compass + 90}deg)`
        }
      }
    }
  }, [map, marker, position])

  // Envia comandos de direção com roverId e substationId via query string
  const handleButtonClick = (direction) => {
    const button = document.getElementById(`btn-${direction}`)
    button?.classList.add('pressed')

    const directionUrl = `http://localhost:8000/api/direction/?rover=${roverId}&substation=${substationId}`
    fetch(directionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify({ direction }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Direction request failed: HTTP ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        console.log('Resposta do backend (direction):', data)
      })
      .catch((error) => {
        console.error('Erro ao enviar a direção:', error)
      })
      .finally(() => {
        setTimeout(() => button?.classList.remove('pressed'), 200)
      })
  }

  // Captura o CSRF token
  const getCookie = (name) => {
    let cookieValue = null
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim()
        if (cookie.substring(0, name.length + 1) === name + '=') {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
          break
        }
      }
    }
    return cookieValue
  }

  // Teclas de setas para enviar comandos
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (controlsFocused) {
        switch (event.key) {
          case 'ArrowUp':
            handleButtonClick('up')
            break
          case 'ArrowDown':
            handleButtonClick('down')
            break
          case 'ArrowLeft':
            handleButtonClick('left')
            break
          case 'ArrowRight':
            handleButtonClick('right')
            break
          default:
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [controlsFocused])

  return (
    <CRow>
      <CCol md={8}>
        <CCard>
          <CCardHeader>Monitoramento de Localização</CCardHeader>
          <CCardBody>
            {gpsError && (
              <CAlert color="danger">
                Falha ao obter dados de GPS. Tentando reconectar...
              </CAlert>
            )}
            <div id="map" style={{ height: '500px' }}></div>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={4}>
        <CCard>
          <CCardHeader>Controles</CCardHeader>
          <CCardBody>
            <div
              className="control-container"
              tabIndex="0"
              onFocus={() => setControlsFocused(true)}
              onBlur={() => setControlsFocused(false)}
            >
              <div className="control-row control-up">
                <IconButton
                  id="btn-up"
                  color="primary"
                  onClick={() => handleButtonClick('up')}
                >
                  <ArrowUpwardIcon fontSize="large" />
                </IconButton>
              </div>
              <div className="control-row control-middle">
                <IconButton
                  id="btn-left"
                  color="primary"
                  onClick={() => handleButtonClick('left')}
                >
                  <ArrowBackIcon fontSize="large" />
                </IconButton>
                <IconButton
                  id="btn-right"
                  color="primary"
                  onClick={() => handleButtonClick('right')}
                >
                  <ArrowForwardIcon fontSize="large" />
                </IconButton>
              </div>
              <div className="control-row control-down">
                <IconButton
                  id="btn-down"
                  color="primary"
                  onClick={() => handleButtonClick('down')}
                >
                  <ArrowDownwardIcon fontSize="large" />
                </IconButton>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <style>
        {`
          .control-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            border-radius: 5px;
            width: 100%;
            outline: none; /* importante para focar */
          }
          .control-row {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 10px;
          }
          .control-up, .control-down {
            width: 100%;
            justify-content: center;
          }
          .control-middle {
            width: 100%;
            justify-content: space-between;
            padding: 0 20%;
          }
          .pressed {
            transform: scale(0.9);
            transition: transform 0.1s;
          }
          .custom-marker img {
            width: 100%;
            height: 100%;
          }
          .MuiIconButton-root {
            transition: transform 0.1s ease-in-out;
          }
          .MuiIconButton-root:active {
            transform: scale(0.9);
          }
        `}
      </style>
    </CRow>
  )
}

export default LocationMonitoring
