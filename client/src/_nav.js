import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilCamera,
  cilMap,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Camera',
    to: '/controle/camera',
    icon: <CIcon icon={cilCamera} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Localização',
    to: '/controle/localizacao',
    icon: <CIcon icon={cilMap} customClassName="nav-icon" />,
  },
]

export default _nav
