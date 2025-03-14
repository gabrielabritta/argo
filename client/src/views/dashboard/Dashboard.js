import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
} from '@coreui/react'

import SystemStatus from './SystemStatus'
import SubstationMap from './SubstationMap'

const Dashboard = () => {
  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Dashboard de Monitoramento</strong>
          <small className="ms-2">Visão geral do sistema</small>
        </CCardHeader>
        <CCardBody>
          <p className="text-medium-emphasis">
            Bem-vindo ao sistema de monitoramento e controle de rovers. Este painel fornece uma visão
            geral do status do sistema e das subestações monitoradas. Clique em uma subestação no mapa
            para visualizar detalhes e controlar os rovers.
          </p>
        </CCardBody>
      </CCard>

      {/* Mapa de Subestações */}
      <SubstationMap />

      {/* Componente de Status do Sistema */}
      <SystemStatus />
    </>
  )
}

export default Dashboard
