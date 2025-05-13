import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilSearch,
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
    name: 'Seleção e Inspeção',
    to: '/selection',
    icon: <CIcon icon={cilSearch} customClassName="nav-icon" />,
  },
]

export default _nav
