import React, { useState, useEffect } from 'react'
import Select, { components } from 'react-select'
import { CCard, CCardBody, CCol, CRow, CProgress, CFormSelect } from '@coreui/react'

// Import the images
import roverN0Image from '../../assets/images/rover-icons/rover-argo-n0.png'
import roverN1Image from '../../assets/images/rover-icons/rover-argo-n1.png'

// Custom option component to render the image and label
const CustomOption = (props) => {
  return (
    <components.Option {...props}>
      <img
        src={props.data.image}
        alt={props.data.label}
        style={{ width: '40px', height: '40px', marginRight: '15px' }} // Aumenta o tamanho da imagem
      />
      <span style={{ fontSize: '18px' }}>{props.data.label}</span> {/* Aumenta o tamanho da fonte */}
    </components.Option>
  )
}

const Dashboard = () => {
  const [batteryLevel, setBatteryLevel] = useState(0)
  const [temperature, setTemperature] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [selectedRover, setSelectedRover] = useState('Rover-Argo-N-0')

  const roverOptions = [
    {
      value: 'Rover-Argo-N-0',
      label: 'Rover-Argo-N-0',
      image: roverN0Image,
    },
    {
      value: 'Rover-Argo-N-1',
      label: 'Rover-Argo-N-1',
      image: roverN1Image,
    },
  ]

  useEffect(() => {
    fetch(`http://localhost:8000/api/sensor-data/?rover=${selectedRover}`)
      .then((response) => response.json())
      .then((data) => {
        setBatteryLevel(data.battery)
        setTemperature(data.temperature)
        setSpeed(data.speed)
      })
  }, [selectedRover])

  const handleMissionChange = (event) => {
    const mission = event.target.value
    fetch('http://localhost:8000/api/select-mission/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission }),
    })
      .then((response) => response.json())
      .then((data) => console.log('Missão selecionada:', data))
      .catch((error) => console.error('Erro ao selecionar missão:', error))
  }

  const handleRoverChange = (selectedOption) => {
    setSelectedRover(selectedOption.value)
  }

  return (
    <>
      <CCard className="mb-4" style={{ padding: '20px', fontSize: '18px' }}> {/* Aumenta o padding e o tamanho da fonte no card */}
        <CCardBody>
          <CRow>
            <CCol xs={12}>
              <h5 style={{ fontSize: '24px' }}>Selecione o Rover</h5> {/* Aumenta o tamanho da fonte do título */}
              <Select
                value={roverOptions.find((option) => option.value === selectedRover)}
                onChange={handleRoverChange}
                options={roverOptions}
                components={{ Option: CustomOption }}
                styles={{
                  control: (provided) => ({
                    ...provided,
                    minHeight: '60px', // Aumenta a altura do Select
                  }),
                  valueContainer: (provided) => ({
                    ...provided,
                    padding: '10px 15px', // Adiciona padding dentro do Select
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    fontSize: '18px', // Aumenta o tamanho da fonte do valor selecionado
                  }),
                }}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol xs={12} md={4}>
              <h5>Nível de Bateria</h5>
              <CProgress thin color="success" value={batteryLevel} />
              <span>{batteryLevel}%</span>
            </CCol>
            <CCol xs={12} md={4}>
              <h5>Temperatura</h5>
              <CProgress thin color="warning" value={temperature} />
              <span>{temperature}°C</span>
            </CCol>
            <CCol xs={12} md={4}>
              <h5>Velocidade</h5>
              <CProgress thin color="info" value={speed} />
              <span>{speed} km/h</span>
            </CCol>
          </CRow>
          <CRow className="mt-4">
            <CCol xs={12}>
              <h5>Missões Pré-programadas</h5>
              <CFormSelect
                onChange={handleMissionChange}
                style={{ fontSize: '18px', padding: '10px' }} // Aumenta o tamanho da fonte e o padding do select
              >
                <option value="">Selecione uma missão</option>
                <option value="MISSAO A">MISSAO A</option>
                <option value="MISSAO B">MISSAO B</option>
                <option value="MISSAO C">MISSAO C</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </>
  )
}

export default Dashboard
