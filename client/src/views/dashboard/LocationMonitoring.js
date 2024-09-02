import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CAlert, CCol, CRow } from '@coreui/react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { IconButton } from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

// Importando o SVG diretamente
import mapArrowLeft from './map-arrow-left.svg'
import argoSvg from './argo1.svg' // Importando o SVG

const LocationMonitoring = () => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [gpsError, setGpsError] = useState(false);
  const [position, setPosition] = useState({ latitude: null, longitude: null, compass: null });
  const [controlsFocused, setControlsFocused] = useState(false); // Para controlar o foco nos controles

  useEffect(() => {
    const mapElement = document.getElementById('map');
    if (mapElement && !map) {
      const initialMap = L.map(mapElement).setView([-3.1232575653870027, -41.765995717278315], 16);
      const baseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 25,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ',
      }).addTo(initialMap);
      setMap(initialMap);

      // Monitora mudanças de zoom
      initialMap.on('zoomend', () => {
        const zoomLevel = initialMap.getZoom();
        if (zoomLevel > 17) {
          // Adiciona a camada SVG
          if (!initialMap.hasLayer(svgOverlay)) {
            baseLayer.remove();
            svgOverlay.addTo(initialMap);
          }
        } else {
          // Remove a camada SVG e volta ao tile normal
          if (initialMap.hasLayer(svgOverlay)) {
            svgOverlay.remove();
            baseLayer.addTo(initialMap);
          }
        }
      });
    }
  }, [map]);

  useEffect(() => {
    if (map) {
      const fetchGPSData = async () => {
        try {
          const response = await fetch('http://localhost:8000/api/gps-data/');
          const data = await response.json();

          if (data.status === 1) {
            const { latitude, longitude, compass } = data;
            setPosition({ latitude, longitude, compass });
            setGpsError(false);
          } else {
            console.error('GPS data is not available');
            setGpsError(true);
          }
        } catch (error) {
          console.error('Error fetching GPS data:', error);
          setGpsError(true);
        }
      };

      fetchGPSData();
      const intervalId = setInterval(fetchGPSData, 5000);
      return () => clearInterval(intervalId);
    }
  }, [map]);

  useEffect(() => {
    if (map && position.latitude !== null && position.longitude !== null) {
      const gpsIcon = L.divIcon({
        className: 'custom-marker',
        html: `<img src="${mapArrowLeft}" style="transform: rotate(${position.compass + 90}deg);" alt="GPS Icon" />`,
        iconSize: [30, 30], // Ajuste o tamanho conforme necessário
      });

      if (!marker) {
        const initialMarker = L.marker([position.latitude, position.longitude], {
          icon: gpsIcon,
        }).addTo(map);
        setMarker(initialMarker);
      } else {
        marker.setLatLng([position.latitude, position.longitude]);
        const iconElement = marker.getElement().querySelector('img');
        if (iconElement) {
          iconElement.style.transform = `rotate(${position.compass + 90}deg)`;
        }
      }
    }
  }, [map, marker, position]);

  const handleButtonClick = (direction) => {
    const button = document.getElementById(`btn-${direction}`);
    button.classList.add('pressed');

    fetch('http://localhost:8000/api/direction/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify({ direction }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => console.log('Resposta do backend:', data))
    .catch(error => console.error('Erro ao enviar a direção:', error))
    .finally(() => {
      setTimeout(() => button.classList.remove('pressed'), 200);
    });
  };

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; cookies.length > i; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Evento de teclado para capturar as setas quando o bloco estiver focado
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (controlsFocused) {
        switch (event.key) {
          case 'ArrowUp':
            handleButtonClick('up');
            break;
          case 'ArrowDown':
            handleButtonClick('down');
            break;
          case 'ArrowLeft':
            handleButtonClick('left');
            break;
          case 'ArrowRight':
            handleButtonClick('right');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [controlsFocused]);

  // Define o SVG Overlay
  const svgBounds = [[-3.126, -41.770], [-3.121, -41.760]]; // Ajuste conforme necessário
  const svgOverlay = L.imageOverlay(argoSvg, svgBounds);

  return (
    <CRow>
      <CCol md={8}>
        <CCard>
          <CCardHeader>
            Monitoramento de Localização
          </CCardHeader>
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
          <CCardHeader>
            Controles
          </CCardHeader>
          <CCardBody>
            <div
              className="control-container"
              tabIndex="0"
              onFocus={() => setControlsFocused(true)}
              onBlur={() => setControlsFocused(false)}
            >
              <div className="control-row control-up">
                <IconButton id="btn-up" color="primary" onClick={() => handleButtonClick('up')}>
                  <ArrowUpwardIcon fontSize="large" />
                </IconButton>
              </div>
              <div className="control-row control-middle">
                <IconButton id="btn-left" color="primary" onClick={() => handleButtonClick('left')}>
                  <ArrowBackIcon fontSize="large" />
                </IconButton>
                <IconButton id="btn-right" color="primary" onClick={() => handleButtonClick('right')}>
                  <ArrowForwardIcon fontSize="large" />
                </IconButton>
              </div>
              <div className="control-row control-down">
                <IconButton id="btn-down" color="primary" onClick={() => handleButtonClick('down')}>
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

export default LocationMonitoring;
