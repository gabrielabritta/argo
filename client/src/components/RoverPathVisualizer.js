import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

const RoverPathVisualizer = ({ width = 800, height = 600, onLocationSelect }) => {
  const canvasRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [graphData, setGraphData] = useState(null)
  const [obstacles, setObstacles] = useState([])
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [paths, setPaths] = useState({
    R1: { path: [], color: '#FFD700' }, // Gold color for R1
    R2: { path: [], color: '#00BFFF' }  // Deep sky blue for R2
  })

  // Constants for visualization
  const PIXELS_PER_METER = 2
  const NODE_RADIUS = 2
  const SELECTED_NODE_RADIUS = 5
  const OBSTACLE_COLORS = {
    building: '#8B4513', // Brown
    vegetation: '#228B22', // Forest Green
    water: '#1E90FF',   // Dodger Blue
    default: '#A9A9A9'  // Dark Gray
  }

  // Convert world coordinates to screen coordinates
  const worldToScreen = (x, y, canvasWidth, canvasHeight) => {
    return {
      x: canvasWidth / 2 + x * PIXELS_PER_METER,
      y: canvasHeight / 2 - y * PIXELS_PER_METER
    }
  }

  // Convert screen coordinates to world coordinates
  const screenToWorld = (x, y, canvasWidth, canvasHeight) => {
    return {
      x: (x - canvasWidth / 2) / PIXELS_PER_METER,
      y: (canvasHeight / 2 - y) / PIXELS_PER_METER
    }
  }

  // Load graph data and initialize with static data
  useEffect(() => {
    // Sample graph data based on RoverModel/jsons/graph6.json structure
    const sampleGraphData = {
      nodes: {
        '(-165.9766, -96.1286)': { label: 'ls_pr1_1' },
        '(-161.9766, -89.5652)': { label: 'ls_pr1_2' },
        '(-157.9766, -81.9897)': { label: 'ls_pr2_1' },
        '(-153.9766, -74.3828)': { label: 'ls_pr3_1' },
        '(-149.9766, -67.6838)': { label: 'ls_pr4_1' },
        '(-145.9766, -60.1699)': { label: 'ls_pr5_1' },
        '(-141.9766, -52.5202)': { label: 'ls_pr6_1' },
        '(-137.9766, -45.9569)': { label: 'ef_pr1_1' },
        '(-133.9766, -39.9405)': { label: 'ef_pr2_1' },
        '(-129.9766, -33.9241)': { label: 'ef_pr3_1' },
        '(-125.9766, -27.9077)': { label: 'ef_pr4_1' },
        '(-121.9766, -21.8913)': { label: 'ef_pr5_1' },
        '(-117.9766, -15.8749)': { label: 'ef_pr6_1' },
        '(-113.9766, -9.8585)': { label: 'b_busip1_1' },
        '(-109.9766, -3.8421)': { label: 'b_busip2_1' },
        '(-105.9766, 2.1743)': { label: 'b_busip3_1' },
        '(-101.9766, 8.1907)': { label: 'b_busip4_1' }
      },
      edges: [
        ['(-165.9766, -96.1286)', '(-161.9766, -89.5652)'],
        ['(-161.9766, -89.5652)', '(-157.9766, -81.9897)'],
        ['(-157.9766, -81.9897)', '(-153.9766, -74.3828)'],
        ['(-153.9766, -74.3828)', '(-149.9766, -67.6838)'],
        ['(-149.9766, -67.6838)', '(-145.9766, -60.1699)'],
        ['(-145.9766, -60.1699)', '(-141.9766, -52.5202)'],
        ['(-141.9766, -52.5202)', '(-137.9766, -45.9569)'],
        ['(-137.9766, -45.9569)', '(-133.9766, -39.9405)'],
        ['(-133.9766, -39.9405)', '(-129.9766, -33.9241)'],
        ['(-129.9766, -33.9241)', '(-125.9766, -27.9077)'],
        ['(-125.9766, -27.9077)', '(-121.9766, -21.8913)'],
        ['(-121.9766, -21.8913)', '(-117.9766, -15.8749)'],
        ['(-117.9766, -15.8749)', '(-113.9766, -9.8585)'],
        ['(-113.9766, -9.8585)', '(-109.9766, -3.8421)'],
        ['(-109.9766, -3.8421)', '(-105.9766, 2.1743)'],
        ['(-105.9766, 2.1743)', '(-101.9766, 8.1907)']
      ]
    }
    
    // Set the graph data
    setGraphData(sampleGraphData)
    
    // Sample obstacles data
    const sampleObstacles = [
      { pos: [-130, -40], size: [15, 10], color: OBSTACLE_COLORS.building, type: 'building' },
      { pos: [-110, -20], size: [12, 8], color: OBSTACLE_COLORS.vegetation, type: 'vegetation' },
      { pos: [-150, -60], size: [20, 15], color: OBSTACLE_COLORS.building, type: 'building' },
      { pos: [-120, -70], size: [10, 10], color: OBSTACLE_COLORS.water, type: 'water' }
    ]
    
    // Set the obstacles
    setObstacles(sampleObstacles)
    
    // Sample rover path based on missao_6.json
    // This is a simplified version of the path for R1 in the first mission
    const roverPath = [
      [-165.9766, -96.1286], // ls_pr3.2553
      [-161.9766, -89.5652], // ls_pr2.2541
      [-157.9766, -81.9897], // ls_pr2.2537
      [-153.9766, -74.3828], // ls_pr1.2525
      [-149.9766, -67.6838], // ls_tpc1.2526
      [-145.9766, -60.1699], // ef_reator1.27
      [-141.9766, -52.5202], // ef_reator2.39
      [-137.9766, -45.9569], // ef_reator3.31
      [-133.9766, -39.9405], // ef_reator4.22
      [-129.9766, -33.9241], // ef_reator5.25
      [-125.9766, -27.9077], // ef_reator6.35
      [-121.9766, -21.8913], // ef_reator6.42
      [-117.9766, -15.8749], // b_busip1.2499
      [-113.9766, -9.8585],  // b_busip2.2492
      [-109.9766, -3.8421],  // b_busip3.2489
      [-105.9766, 2.1743],   // b_busip4.2504
      [-101.9766, 8.1907]    // b_busip4.2493
    ]
    
    // Set the rover path
    setPaths({
      R1: {
        path: roverPath,
        color: '#FFD700' // Gold color
      }
    })
    
    // Finish loading
    setLoading(false)
  }, [])

  // Draw the visualization
  useEffect(() => {
    if (loading || !graphData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw background grid
    drawGrid(ctx, canvasWidth, canvasHeight)

    // Draw obstacles
    drawObstacles(ctx, canvasWidth, canvasHeight)

    // Draw graph nodes and edges
    drawGraph(ctx, canvasWidth, canvasHeight)

    // Draw paths
    drawPaths(ctx, canvasWidth, canvasHeight)

    // Draw selected point if any
    if (selectedPoint) {
      const { x, y } = worldToScreen(selectedPoint.x, selectedPoint.y, canvasWidth, canvasHeight)
      ctx.beginPath()
      ctx.arc(x, y, SELECTED_NODE_RADIUS, 0, 2 * Math.PI)
      ctx.fillStyle = '#FF0000' // Red
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }, [graphData, obstacles, paths, loading, selectedPoint])

  // Draw a grid on the canvas
  const drawGrid = (ctx, canvasWidth, canvasHeight) => {
    ctx.strokeStyle = '#EEEEEE'
    ctx.lineWidth = 0.5

    // Draw horizontal lines
    for (let y = 0; y < canvasHeight; y += PIXELS_PER_METER * 10) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }

    // Draw vertical lines
    for (let x = 0; x < canvasWidth; x += PIXELS_PER_METER * 10) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = '#AAAAAA'
    ctx.lineWidth = 1
    
    // X-axis
    ctx.beginPath()
    ctx.moveTo(0, canvasHeight / 2)
    ctx.lineTo(canvasWidth, canvasHeight / 2)
    ctx.stroke()
    
    // Y-axis
    ctx.beginPath()
    ctx.moveTo(canvasWidth / 2, 0)
    ctx.lineTo(canvasWidth / 2, canvasHeight)
    ctx.stroke()
  }

  // Draw obstacles
  const drawObstacles = (ctx, canvasWidth, canvasHeight) => {
    obstacles.forEach(obstacle => {
      const [ox, oy] = obstacle.pos
      const [width, height] = obstacle.size
      const { x, y } = worldToScreen(ox, oy, canvasWidth, canvasHeight)
      
      const rectWidth = width * PIXELS_PER_METER
      const rectHeight = height * PIXELS_PER_METER
      
      // Fill rectangle
      ctx.fillStyle = obstacle.color || OBSTACLE_COLORS[obstacle.type] || OBSTACLE_COLORS.default
      ctx.fillRect(x - rectWidth / 2, y - rectHeight / 2, rectWidth, rectHeight)
      
      // Draw border
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x - rectWidth / 2, y - rectHeight / 2, rectWidth, rectHeight)
    })
  }

  // Draw graph nodes and edges
  const drawGraph = (ctx, canvasWidth, canvasHeight) => {
    // Draw edges first (so they appear behind nodes)
    if (graphData.edges) {
      ctx.strokeStyle = '#CCCCCC'
      ctx.lineWidth = 0.5
      
      graphData.edges.forEach(edge => {
        const [node1Key, node2Key] = edge
        
        // Parse coordinates from node keys (format: "(x, y)")
        const parseNodeKey = key => {
          const match = key.match(/\(([^,]+),\s*([^)]+)\)/)
          if (match) {
            return { x: parseFloat(match[1]), y: parseFloat(match[2]) }
          }
          return null
        }
        
        const node1 = parseNodeKey(node1Key)
        const node2 = parseNodeKey(node2Key)
        
        if (node1 && node2) {
          const screenPos1 = worldToScreen(node1.x, node1.y, canvasWidth, canvasHeight)
          const screenPos2 = worldToScreen(node2.x, node2.y, canvasWidth, canvasHeight)
          
          ctx.beginPath()
          ctx.moveTo(screenPos1.x, screenPos1.y)
          ctx.lineTo(screenPos2.x, screenPos2.y)
          ctx.stroke()
        }
      })
    }
    
    // Draw nodes
    if (graphData.nodes) {
      Object.keys(graphData.nodes).forEach(nodeKey => {
        // Parse coordinates from node key (format: "(x, y)")
        const match = nodeKey.match(/\(([^,]+),\s*([^)]+)\)/)
        if (match) {
          const x = parseFloat(match[1])
          const y = parseFloat(match[2])
          const screenPos = worldToScreen(x, y, canvasWidth, canvasHeight)
          
          // Draw node
          ctx.beginPath()
          ctx.arc(screenPos.x, screenPos.y, NODE_RADIUS, 0, 2 * Math.PI)
          ctx.fillStyle = '#666666'
          ctx.fill()
          
          // Optional: Draw label for important nodes
          const node = graphData.nodes[nodeKey]
          if (node.label && (node.label.startsWith('b_') || node.label.startsWith('ef_'))) {
            ctx.fillStyle = '#333333'
            ctx.font = '8px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(node.label.substring(0, 8), screenPos.x, screenPos.y - 5)
          }
        }
      })
    }
  }

  // Draw paths for rovers
  const drawPaths = (ctx, canvasWidth, canvasHeight) => {
    Object.keys(paths).forEach(roverId => {
      const { path, color } = paths[roverId]
      
      if (path.length < 2) return
      
      // Draw path line
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      
      const firstPoint = path[0]
      const startPos = worldToScreen(firstPoint[0], firstPoint[1], canvasWidth, canvasHeight)
      ctx.moveTo(startPos.x, startPos.y)
      
      // Draw lines connecting waypoints
      for (let i = 1; i < path.length; i++) {
        const point = path[i]
        const pos = worldToScreen(point[0], point[1], canvasWidth, canvasHeight)
        ctx.lineTo(pos.x, pos.y)
      }
      
      ctx.stroke()
      
      // Draw start and end points
      const startPoint = path[0]
      const endPoint = path[path.length - 1]
      
      // Start point (circle)
      const startScreenPos = worldToScreen(startPoint[0], startPoint[1], canvasWidth, canvasHeight)
      ctx.beginPath()
      ctx.arc(startScreenPos.x, startScreenPos.y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1
      ctx.stroke()
      
      // End point (star)
      const endScreenPos = worldToScreen(endPoint[0], endPoint[1], canvasWidth, canvasHeight)
      drawStar(ctx, endScreenPos.x, endScreenPos.y, 5, 8, 4, color)
      
      // Label the rover
      ctx.fillStyle = color
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(roverId, endScreenPos.x, endScreenPos.y - 10)
    })
  }

  // Draw a star shape
  const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius, color) => {
    let rot = Math.PI / 2 * 3
    let x = cx
    let y = cy
    let step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Handle canvas click
  const handleCanvasClick = (e) => {
    if (loading) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Convert screen coordinates to world coordinates
    const worldCoords = screenToWorld(x, y, canvas.width, canvas.height)
    
    // Set selected point
    setSelectedPoint(worldCoords)
    
    // Call the callback with the selected location
    if (onLocationSelect) {
      onLocationSelect(worldCoords.x, worldCoords.y)
    }
  }

  return (
    <div className="rover-path-visualizer">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Carregando visualização...</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#F8F9FA',
          cursor: loading ? 'wait' : 'crosshair',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      />
      <div className="legend" style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#FFD700', marginRight: '5px' }}></div>
          <span>Rover 1</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#FF0000', marginRight: '5px' }}></div>
          <span>Ponto Selecionado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#666666', marginRight: '5px' }}></div>
          <span>Nós do Grafo</span>
        </div>
      </div>
    </div>
  )
}

RoverPathVisualizer.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  onLocationSelect: PropTypes.func
}


export default RoverPathVisualizer
