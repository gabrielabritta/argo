import React from 'react'
import { useLocation } from 'react-router-dom'

import routes from '../routes'

import { CBreadcrumb, CBreadcrumbItem } from '@coreui/react'

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname
  const searchParams = new URLSearchParams(useLocation().search)
  
  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => route.path === pathname)
    return currentRoute ? currentRoute.name : false
  }

  const getBreadcrumbs = (location) => {
    const breadcrumbs = []
    
    // Encontrar a rota atual
    const currentRoute = routes.find(route => {
      const routePath = route.path.split('/:')[0]
      return location.startsWith(routePath)
    })

    if (currentRoute) {
      // Adicionar "Seleção" como primeiro item se estivermos em uma rota de inspeção
      if (location.includes('/inspect/')) {
        breadcrumbs.push({
          pathname: '/selection',
          name: 'Seleção',
          active: false
        })
      }

      // Se for uma rota de subestação
      if (location.includes('/inspect/substation/')) {
        const pathParts = location.split('/')
        const substationId = pathParts[3]
        
        breadcrumbs.push({
          pathname: `/inspect/substation/${substationId}`,
          name: 'Subestação',
          active: !location.includes('/rover/')
        })

        // Se também incluir rover
        if (location.includes('/rover/')) {
          const roverId = pathParts[5]
          breadcrumbs.push({
            pathname: `/inspect/substation/${substationId}/rover/${roverId}`,
            name: 'Rover',
            active: true
          })
        }
      }
    } else {
      // Para outras rotas, usar o nome direto da rota
      const routeName = getRouteName(location, routes)
      if (routeName) {
        breadcrumbs.push({
          pathname: location,
          name: routeName,
          active: true
        })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs(currentLocation)

  return (
    <CBreadcrumb className="my-0">
      <CBreadcrumbItem href="/#/dashboard">Home</CBreadcrumbItem>
      {breadcrumbs.map((breadcrumb, index) => {
        return (
          <CBreadcrumbItem
            {...(breadcrumb.active ? { active: true } : { href: `/#${breadcrumb.pathname}` })}
            key={index}
          >
            {breadcrumb.name}
          </CBreadcrumbItem>
        )
      })}
    </CBreadcrumb>
  )
}

export default React.memo(AppBreadcrumb)
