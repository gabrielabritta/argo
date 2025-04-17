import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CCard, CCardBody, CCardHeader, CSpinner, CButton, CTooltip } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilWarning, cilLocationPin } from '@coreui/icons';
import { MapContainer, TileLayer, Marker, Popup, ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corrigir o problema de ícones do Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Estilo para o mapa
const mapStyle = {
  height: '600px',
  width: '100%',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  overflow: 'hidden',
};

// Configuração para ícone default do Leaflet
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Componente para criar ícones customizados por status
const createStatusIcon = (status) => {
  const color = status === 'operational' ? '#2eb85c' : 
                status === 'maintenance' ? '#f9b115' : '#e55353';
                
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

// Componente principal
const SubstationMap = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [substations, setSubstations] = useState([]);
  const [hoveredState, setHoveredState] = useState(null);

  // Define os limites do mapa do Brasil
  const brazilBounds = [
    [-33.743888, -74.008595], // Sudoeste (lat, lon)
    [5.275696, -34.789914],   // Nordeste (lat, lon)
  ];

  // Carregar dados das subestações
  useEffect(() => {
    const fetchSubstations = async () => {
      try {
        // Mesmos dados do seu código original
        const mockData = [
          {
            id: 1,
            name: 'Argo Parnaíba',
            // Coordenadas precisas sem necessidade de ajustes
            coordinates: [-3.123201322652942, -41.765692627657174],
            status: 'operational',
            voltage: '500kV',
            rovers: 3,
            lastInspection: '2024-10-15',
            state: 'PI',
          },
        ];

        setSubstations(mockData);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar subestações:', error);
        setLoading(false);
      }
    };

    fetchSubstations();
  }, []);

  const handleSubstationClick = (substationId) => {
    navigate(`/inspect/substation/${substationId}`);
  };

  // Determina o ícone com base no status (mantendo a consistência com o original)
  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return <CIcon icon={cilCheckCircle} className="text-white" />;
      case 'maintenance':
        return <CIcon icon={cilWarning} className="text-white" />;
      case 'alert':
        return <CIcon icon={cilWarning} className="text-white" />;
      default:
        return <CIcon icon={cilLocationPin} className="text-white" />;
    }
  };

  // Determina a cor do marcador com base no status (mantendo a consistência)
  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'alert':
        return 'danger';
      default:
        return 'primary';
    }
  };

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
          <div style={mapStyle}>
            <MapContainer 
              bounds={brazilBounds}
              style={{ height: '100%', width: '100%' }}
              zoom={5}
              minZoom={4}
              maxZoom={10}
              scrollWheelZoom={true}
            >
              {/* Mapa base */}
              <TileLayer
                attribution='&copy; <a href="[https://www.openstreetmap.org/copyright">OpenStreetMap</a>](https://www.openstreetmap.org/copyright">OpenStreetMap</a>) contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Overlay SVG - Brasil */}
              <ImageOverlay
                url="/src/assets/images/brazil.svg"
                bounds={brazilBounds}
                opacity={0.5}
              />
              
              {/* Marcadores das subestações */}
              {substations.map((substation) => (
                <Marker 
                  key={substation.id}
                  position={substation.coordinates}
                  icon={createStatusIcon(substation.status)}
                  eventHandlers={{
                    click: () => handleSubstationClick(substation.id)
                  }}
                >
                  <Popup>
                    <div style={{ width: '250px' }}>
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
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            
            {/* Legenda de cores - mantida igual ao original */}
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
          </div>
        )}
      </CCardBody>
    </CCard>
  );
};

export default SubstationMap;
