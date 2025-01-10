import React, { useState, useEffect } from 'react'
import { CCard, CCardBody, CCardHeader, CSpinner, CAlert, CButton } from '@coreui/react'

const MappingView = ({ roverId, substationId }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mappingUrl, setMappingUrl] = useState(null)
  const [processingMap, setProcessingMap] = useState(false)

  const processMapping = async () => {
    setProcessingMap(true)
    setError(null)
    try {
      const response = await fetch(`http://localhost:8000/api/process-mapping/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rover_id: roverId,
          substation_id: substationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Falha ao processar mapeamento')
      }

      const data = await response.json()
      setMappingUrl(data.image_url)
    } catch (err) {
      setError('Erro ao processar mapeamento')
      console.error('Error:', err)
    } finally {
      setProcessingMap(false)
    }
  }

  return (
    <CCard className="h-100">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Mapeamento do Ambiente</h5>
        <CButton color="primary" onClick={processMapping} disabled={processingMap}>
          {processingMap ? 'Processando...' : 'Gerar Mapeamento'}
        </CButton>
      </CCardHeader>
      <CCardBody>
        {error && (
          <CAlert color="danger" dismissible>
            {error}
          </CAlert>
        )}

        {processingMap ? (
          <div className="text-center p-5">
            <CSpinner color="primary" />
            <p className="mt-3">Gerando imagem do mapeamento...</p>
          </div>
        ) : mappingUrl ? (
          <div className="text-center">
            <img
              src={mappingUrl}
              alt="Mapeamento"
              className="img-fluid"
              style={{ maxHeight: '600px' }}
            />
          </div>
        ) : (
          <div className="text-center p-5 text-muted">
            Clique em "Gerar Mapeamento" para visualizar o último mapeamento disponível
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default MappingView
