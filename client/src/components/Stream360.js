import React, { useState } from 'react'
import Insta360Player from '../views/dashboard/Insta360Player'
import PanolensPanoramaPlayer from '../views/dashboard/PanolensPanoramaPlayer'
import { CContainer, CRow, CCol, CButton, CButtonGroup } from '@coreui/react'

const Stream360 = () => {
  const [playerType, setPlayerType] = useState('panolens') // 'three' ou 'panolens'

  return (
    <CContainer lg>
      <CRow className="mb-3">
        <CCol>
          <CButtonGroup>
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
        </CCol>
      </CRow>

      {playerType === 'three' ? (
        <Insta360Player />
      ) : (
        <PanolensPanoramaPlayer />
      )}
    </CContainer>
  )
}

export default Stream360
