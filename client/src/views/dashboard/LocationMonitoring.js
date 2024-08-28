import React, { useEffect } from 'react'
import { CCard, CCardBody, CCardHeader, CButton, CRow, CCol, CContainer } from '@coreui/react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const LocationMonitoring = () => {
  useEffect(() => {
    console.log('useEffect iniciado');
    const mapElement = document.getElementById('map');
    if (mapElement) {
      console.log('Elemento DOM "map" encontrado');
      const map = L.map(mapElement).setView([-2.9187989436853723, -41.750797417424174], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);
      console.log('Mapa carregado com sucesso');
    } else {
      console.error('Elemento DOM "map" não encontrado');
    }
  }, []);

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

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

  return (
    <CCard>
      <CCardHeader>
        Monitoramento de Localização
      </CCardHeader>
      <CCardBody>
        <div id="map" style={{ height: '500px' }}></div>
        <CContainer className="mt-4 d-flex justify-content-center">
          <div className="d-flex flex-column align-items-center">
            <CButton id="btn-up" color="primary" onClick={() => handleButtonClick('up')}>&uarr;</CButton>
            <div className="d-flex justify-content-center mt-2" style={{ width: '100px', margin: '10px 0' }}>
              <CButton id="btn-left" color="primary" className="mr-3" onClick={() => handleButtonClick('left')}>&larr;</CButton>
              <CButton id="btn-right" color="primary" className="ml-3" onClick={() => handleButtonClick('right')}>&rarr;</CButton>
            </div>
            <CButton id="btn-down" color="primary" className="mt-2" onClick={() => handleButtonClick('down')}>&darr;</CButton>
          </div>
        </CContainer>
        <style>
          {`
            .pressed {
              transform: scale(0.9);
              transition: transform 0.1s;
            }
            .d-flex .justify-content-center {
              justify-content: space-between;
            }
            .mr-3 {
              margin-right: 10px;
            }
            .ml-3 {
              margin-left: 10px;
            }
          `}
        </style>
      </CCardBody>
    </CCard>
  )
}

export default LocationMonitoring;
