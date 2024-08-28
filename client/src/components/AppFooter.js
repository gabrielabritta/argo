import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="ms-1">GRIn</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Made for</span>
        <a href="https://www.argoenergia.com.br/" target="_blank" rel="noopener noreferrer">
          Argo Energia Empreendimentos e Participações S.A.
        </a>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
