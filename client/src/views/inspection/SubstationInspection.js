import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CBadge,
  CProgress
} from '@coreui/react';

const SubstationInspection = () => {
  const { substationId } = useParams();
  const navigate = useNavigate();
  const [rovers, setRovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [substationInfo, setSubstationInfo] = useState(null);

  useEffect(() => {
    const fetchSubstationData = async () => {
      setLoading(true);
      try {
        // Buscar informações da subestação
        const subResponse = await fetch(`http://localhost:8000/api/substations/${substationId}/`);
        const subData = await subResponse.json();
        setSubstationInfo(subData);

        // Buscar rovers ativos na subestação
        const roversResponse = await fetch(`http://localhost:8000/api/active-rovers/?substation=${substationId}`);
        const roversData = await roversResponse.json();
        setRovers(roversData);
        setError(null);
      } catch (err) {
        setError('Falha ao carregar dados da subestação');
        console.error('Error:', err);
      }
      setLoading(false);
    };

    fetchSubstationData();
    // Configurar polling para atualização dos dados
    const interval = setInterval(fetchSubstationData, 5000);
    return () => clearInterval(interval);
  }, [substationId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'carregando':
        return 'warning';
      case 'em missão':
        return 'primary';
      case 'parado':
        return 'secondary';
      case 'offline':
        return 'danger';
      default:
        return 'info';
    }
  };

  const handleRoverClick = (roverId) => {
    navigate(`/inspect/rover/${roverId}`);
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <CSpinner color="primary" />
      </div>
    );
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <h4>Inspeção da Subestação: {substationInfo?.name}</h4>
        </CCardHeader>
        <CCardBody>
          {error && (
            <CAlert color="danger" dismissible>
              {error}
            </CAlert>
          )}

          <CRow>
            {rovers.map((rover) => (
              <CCol md={6} key={rover.id} className="mb-4">
                <CCard
                  className="h-100 cursor-pointer"
                  onClick={() => handleRoverClick(rover.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <CCardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5>{rover.name}</h5>
                      <CBadge color={getStatusColor(rover.status)}>
                        {rover.status || 'Status Desconhecido'}
                      </CBadge>
                    </div>

                    <div className="mb-3">
                      <small className="text-medium-emphasis">Bateria</small>
                      <CProgress thin color="success" value={rover.battery}>
                        {rover.battery}%
                      </CProgress>
                    </div>

                    <div className="mb-3">
                      <small className="text-medium-emphasis">Temperatura</small>
                      <div className="fs-5">
                        {rover.temperature}°C
                      </div>
                    </div>

                    <div className="text-medium-emphasis small">
                      Última atualização: {
                        rover.last_seen === 'now'
                          ? 'Agora'
                          : new Date(rover.last_seen).toLocaleString()
                      }
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            ))}

            {rovers.length === 0 && !loading && (
              <CCol>
                <div className="text-center p-4">
                  <h5 className="text-medium-emphasis">
                    Nenhum rover encontrado nesta subestação
                  </h5>
                </div>
              </CCol>
            )}
          </CRow>
        </CCardBody>
      </CCard>
    </>
  );
};

export default SubstationInspection;
