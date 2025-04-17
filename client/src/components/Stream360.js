import React, { useState, useEffect } from 'react'
import Insta360Player from '../views/dashboard/Insta360Player'
import PanolensPanoramaPlayer from '../views/dashboard/PanolensPanoramaPlayer'
import { CContainer, CRow, CCol, CButton, CButtonGroup, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CForm, CFormInput, CFormLabel, CFormFeedback, CAlert, CToast, CToastBody, CToastHeader } from '@coreui/react'
import { mqttClient } from '../mqtt.js'

const Stream360 = () => {
  const [playerType, setPlayerType] = useState('panolens') // 'three' ou 'panolens'
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

  // Definição dos tópicos MQTT com identificadores hardcoded
  const substationId = 'SUB001';
  const roverId = 'Rover-Argo-N-0';
  const configTopic = `substations/${substationId}/rovers/${roverId}/insta/config`;
  const responseTopic = `substations/${substationId}/rovers/${roverId}/insta/config/response`;
  
  // Handler para mensagens MQTT
  const onMessageHandler = (topic, message) => {
    if (topic === responseTopic) {
      try {
        const response = JSON.parse(message.toString())
        setResponseToast({
          visible: true,
          status: response.status,
          message: response.status === 1 ? 'Configuração concluída com sucesso!' : 'Falha na configuração!'
        })
      } catch (e) {
        setResponseToast({
          visible: true,
          status: 0,
          message: 'Formato de resposta inválido'
        })
      }
    }
  }

  // Configurar o listener de mensagens MQTT quando o componente é montado
  useEffect(() => {
    mqttClient.on('message', onMessageHandler)
    
    // Se inscrever no tópico de resposta
    mqttClient.subscribe(responseTopic)
    
    // Limpeza ao desmontar o componente
    return () => {
      mqttClient.off('message', onMessageHandler)
      mqttClient.unsubscribe(responseTopic)
    }
  }, []) // Array vazio significa que só roda uma vez na montagem

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    // Criar payload apenas com os campos preenchidos
    const payload = {}
    if (configForm.ssid) payload.ssid = configForm.ssid
    if (configForm.password) payload.password = configForm.password
    if (configForm.rtmp) payload.rtmp = configForm.rtmp
    
    // Verificar se pelo menos um campo está preenchido
    if (Object.keys(payload).length === 0) {
      setFormErrors({ form: 'Pelo menos um campo deve ser preenchido' })
      return;
    }
    
    // Enviar mensagem MQTT
    mqttClient.publish(configTopic, JSON.stringify(payload))
    
    // Configurar um timeout para a resposta
    const timeoutId = setTimeout(() => {
      setResponseToast({
        visible: true,
        status: 0,
        message: 'Tempo de espera esgotado'
      })
    }, 10000) // 10 segundos de timeout
    
    // Armazenar o timeout ID no sessionStorage para poder cancelá-lo se necessário
    sessionStorage.setItem('configTimeoutId', timeoutId)
    
    // Fechar modal e resetar formulário
    setShowConfigModal(false)
    setConfigForm({ ssid: '', password: '', rtmp: '' })
  }

  return (
    <CContainer lg>
      {responseToast.visible && (
        <CToast visible={true} autohide={true} delay={5000} onClose={() => setResponseToast({...responseToast, visible: false})}
          className={`mb-3 ${responseToast.status === 1 ? 'bg-success text-white' : 'bg-danger text-white'}`}>
          <CToastHeader closeButton>
            {responseToast.status === 1 ? 'Success' : 'Error'}
          </CToastHeader>
          <CToastBody>
            {responseToast.message}
          </CToastBody>
        </CToast>
      )}
      
      <CRow className="mb-3">
        <CCol>
          <CButtonGroup className="me-3">
            <CButton
              color={playerType === 'three' ? 'primary' : 'outline-primary'}
              onClick={() => setPlayerType('three')}
            >
              Player Three.js
            </CButton>
            <CButton
              color={playerType === 'panolens' ? 'primary' : 'outline-primary'}
              onClick={() => setPlayerType('panolens')}
            >
              Player PANOLENS
            </CButton>
          </CButtonGroup>
          
          <CButton
            color="success"
            onClick={() => setShowConfigModal(true)}
          >
            Configure Insta
          </CButton>
        </CCol>
      </CRow>

      {playerType === 'three' ? (
        <Insta360Player />
      ) : (
        <PanolensPanoramaPlayer />
      )}
      
      {/* Configuration Modal */}
      <CModal visible={showConfigModal} onClose={() => setShowConfigModal(false)}>
        <CModalHeader>
          <CModalTitle>Configure Insta360 Camera</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {formErrors.form && (
            <CAlert color="danger">{formErrors.form}</CAlert>
          )}
          <CForm>
            <div className="mb-3">
              <CFormLabel htmlFor="ssid">WiFi SSID</CFormLabel>
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
              <CFormLabel htmlFor="password">WiFi Password</CFormLabel>
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
              <CFormLabel htmlFor="rtmp">RTMP URL</CFormLabel>
              <CFormInput
                type="text"
                id="rtmp"
                name="rtmp"
                value={configForm.rtmp}
                onChange={handleInputChange}
              />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowConfigModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSubmit}>
            Save Configuration
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default Stream360
