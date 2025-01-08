import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CFormSelect,
  CAlert,
  CSpinner
} from '@coreui/react';
import { useNavigate } from 'react-router-dom';

const SelectionView = () => {
  const [selectedSubstation, setSelectedSubstation] = useState('');
  const [selectedRover, setSelectedRover] = useState('');
  const [substations, setSubstations] = useState([]);
  const [rovers, setRovers] = useState([]);

  // Estados de carregamento separados
  const [loadingSubstations, setLoadingSubstations] = useState(false);
  const [loadingRovers, setLoadingRovers] = useState(false);

  // Estados de erro separados
  const [errorSubstations, setErrorSubstations] = useState(null);
  const [errorRovers, setErrorRovers] = useState(null);

  const navigate = useNavigate();

  // Carregar subestações do backend
  useEffect(() => {
    const fetchSubstations = async () => {
      setLoadingSubstations(true);
      try {
        const response = await fetch('http://localhost:8000/api/substations/');
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: Não foi possível carregar subestações.`);
        }
        const data = await response.json();
        setSubstations(data);
        setErrorSubstations(null);
      } catch (err) {
        setErrorSubstations('Falha ao carregar subestações.');
        console.error('Error fetching substations:', err);
      }
      setLoadingSubstations(false);
    };

    fetchSubstations();
  }, []);

  // Carregar rovers quando uma subestação é selecionada
  useEffect(() => {
    if (!selectedSubstation) {
      setRovers([]);
      setSelectedRover('');
      return;
    }

    const fetchRovers = async () => {
      setLoadingRovers(true);
      try {
        const response = await fetch(`http://localhost:8000/api/rovers/?substation=${selectedSubstation}`);
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: Não foi possível carregar rovers.`);
        }
        const data = await response.json();
        setRovers(data);
        setErrorRovers(null);
      } catch (err) {
        setErrorRovers('Falha ao carregar rovers.');
        console.error('Error fetching rovers:', err);
      }
      setLoadingRovers(false);
    };

    fetchRovers();
  }, [selectedSubstation]);

  const handleInspectSubstation = () => {
    if (!selectedSubstation) return;
    navigate(`/inspect/substation/${selectedSubstation}`);
  };

  const handleInspectRover = () => {
    if (!selectedRover) return;
    navigate(`/inspect/rover/${selectedRover}`);
  };

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <h4>Seleção de Subestação e Rover</h4>
      </CCardHeader>
      <CCardBody>
        {/* Alertas de erro para subestações */}
        {errorSubstations && (
          <CAlert color="danger" dismissible onClose={() => setErrorSubstations(null)}>
            {errorSubstations}
          </CAlert>
        )}

        {/* Alertas de erro para rovers */}
        {errorRovers && (
          <CAlert color="danger" dismissible onClose={() => setErrorRovers(null)}>
            {errorRovers}
          </CAlert>
        )}

        <CRow className="mb-4">
          <CCol md={6}>
            <h5>Selecione a Subestação</h5>
            {loadingSubstations ? (
              <div className="text-center my-3">
                <CSpinner color="primary" />
              </div>
            ) : (
              <CFormSelect
                value={selectedSubstation}
                onChange={(e) => {
                  setSelectedSubstation(e.target.value);
                  setSelectedRover(''); // Resetar rover ao mudar subestação
                }}
                className="mb-3"
              >
                <option value="">Escolha uma subestação...</option>
                {substations.map((sub) => (
                  <option key={sub.id} value={sub.identifier}>
                    {sub.name}
                  </option>
                ))}
              </CFormSelect>
            )}

            <CButton
              color="primary"
              onClick={handleInspectSubstation}
              disabled={!selectedSubstation}
              className="me-2"
            >
              Inspecionar Subestação
            </CButton>
          </CCol>

          <CCol md={6}>
            <h5>Selecione o Rover</h5>
            {loadingRovers ? (
              <div className="text-center my-3">
                <CSpinner color="primary" />
              </div>
            ) : (
              <CFormSelect
                value={selectedRover}
                onChange={(e) => setSelectedRover(e.target.value)}
                disabled={!selectedSubstation || rovers.length === 0}
                className="mb-3"
              >
                <option value="">Escolha um rover...</option>
                {rovers.map((rover) => (
                  <option key={rover.id} value={rover.identifier}>
                    {rover.name}
                  </option>
                ))}
              </CFormSelect>
            )}

            <CButton
              color="primary"
              onClick={handleInspectRover}
              disabled={!selectedRover}
            >
              Inspecionar Rover
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  );
};

export default SelectionView;
