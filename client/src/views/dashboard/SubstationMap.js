import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CCard, CCardBody, CCardHeader, CSpinner, CButton, CTooltip } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilWarning, cilLocationPin } from '@coreui/icons';
import { MapContainer, TileLayer, Marker, Popup, ImageOverlay, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../../config';

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
        console.log('Tentando buscar subestações em:', `${API_BASE_URL}/substations/`);
        const response = await fetch(`${API_BASE_URL}/substations/`);
        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar subestações: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Dados recebidos da API:', data);

        // Logar cada subestação recebida
        data.forEach((sub, idx) => {
          console.log(`API substation[${idx}]:`, sub);
        });

        // Transformar os dados para o formato esperado pelo mapa
        const formattedData = data.map(substation => ({
          id: substation.identifier,
          name: substation.name,
          description: substation.description || '',
          coordinates: [parseFloat(substation.latitude), parseFloat(substation.longitude)],
          status: substation.is_active ? 'operational' : 'maintenance',
          voltage: substation.voltage,
          rovers: substation.rovers?.length || 0,
          lastInspection: new Date().toISOString().split('T')[0],
          state: 'SP'
        }));

        // Logar cada subestação formatada
        formattedData.forEach((sub, idx) => {
          console.log(`Formatted substation[${idx}]:`, sub);
        });

        setSubstations(formattedData);
        setLoading(false);
      } catch (error) {
        console.error('Erro detalhado ao carregar subestações:', error);
        setLoading(false);
      }
    };

    fetchSubstations();
  }, []);

  const handleSubstationClick = (substationId) => {
    navigate(`/inspect/substation/${substationId}`);
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
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Overlay SVG - Brasil */}
              <ImageOverlay
                url="/src/assets/images/brazil.svg"
                bounds={brazilBounds}
                opacity={0.5}
              />

              {substations.map((substation) => (
                <Marker
                  key={substation.id}
                  position={substation.coordinates}
                  icon={createStatusIcon(substation.status)}
                  eventHandlers={{
                    click: () => handleSubstationClick(substation.id)
                  }}
                >
                  <Tooltip 
                    direction="top" 
                    offset={[0, -10]} 
                    opacity={0.9}
                    permanent={false}
                    sticky={true}
                  >
                    <div className="text-center">
                      <strong>{substation.name}</strong>
                      <br />
                      <small className="text-muted">
                        {substation.status === 'operational' ? 'Operacional' : 'Em Manutenção'}
                      </small>
                      {substation.voltage && (
                        <>
                          <br />
                          <small className="text-muted">
                            Tensão: {substation.voltage && substation.voltage.toString().toLowerCase().includes('kv') 
                              ? substation.voltage 
                              : `${substation.voltage} kV`}
                          </small>
                        </>
                      )}
                      {(substation.description && !substation.description.toLowerCase().includes('tensão')) && (
                        <>
                          <br />
                          <small className="text-muted">
                            {substation.description}
                          </small>
                        </>
                      )}
                    </div>
                  </Tooltip>
                  <Popup>
                    <div style={{ width: '250px' }}>
                      <h5 className="text-primary">{substation.name}</h5>
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className={`text-${substation.status === 'operational' ? 'success' : 'warning'}`}>
                          {substation.status === 'operational' ? 'Operacional' : 'Em Manutenção'}
                        </span>
                        {substation.description ? <span className="ms-2">| {substation.description}</span> : null}
                      </p>
                      <p>
                        <strong>Descrição:</strong> {substation.description}
                      </p>
                      <p>
                        <strong>Estado:</strong> {substation.state}
                      </p>
                      {substation.voltage && (
                        <p>
                          <strong>Tensão:</strong> {substation.voltage && substation.voltage.toString().toLowerCase().includes('kv') 
                            ? substation.voltage 
                            : `${substation.voltage} kV`}
                        </p>
                      )}
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
