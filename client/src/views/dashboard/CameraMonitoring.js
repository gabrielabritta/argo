import React, { useState, useEffect, useRef } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster
} from '@coreui/react'

const CameraMonitoring = () => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [objectData, setObjectData] = useState([])
  const [toastVisible, setToastVisible] = useState(false)
  const [viewMode, setViewMode] = useState('camera') // 'camera' or 'capture'
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const canvasRef = useRef(null)

  // Function to show the camera feed
  const checkCameraConnection = () => {
    const img = new Image()
    img.src = 'http://localhost:8000/api/camera-feed/'

    img.onload = () => {
      setImageSrc(img.src)
      setImageLoaded(true)
    }

    img.onerror = () => {
      setImageLoaded(false)
      setReconnectAttempts((prev) => prev + 1)
    }
  }

  // Function to capture image and show with boxes
  const fetchImageAndData = () => {
    fetch('http://localhost:8000/api/imagem/')
      .then((response) => response.json())
      .then((data) => {
        if (data.image && data.objects) {
          setObjectData(data.objects) // Update box data
          setImageSrc(`data:image/jpeg;base64,${data.image}`) // Update decoded image
          setImageLoaded(true)
          setViewMode('capture') // Switch to capture mode
        } else {
          console.error('Error loading data: incomplete data.')
          setImageLoaded(false)
        }
      })
      .catch((error) => {
        console.error('Error loading image and data:', error)
        setImageLoaded(false)
      })
  }

  // Function for canvas click handling
  const handleCanvasClick = (event) => {
    if (!canvasRef.current || !objectData.length) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Get click coordinates relative to the actual canvas size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clickX = (event.clientX - rect.left) * scaleX
    const clickY = (event.clientY - rect.top) * scaleY

    // Find the clicked box
    objectData.forEach((obj, index) => {
      const [x1, y1, x2, y2] = obj.box

      // Scaled coordinates for the canvas size
      const scaledX1 = x1 * canvas.width
      const scaledY1 = y1 * canvas.height
      const scaledX2 = x2 * canvas.width
      const scaledY2 = y2 * canvas.height

      if (clickX >= scaledX1 && clickX <= scaledX2 && clickY >= scaledY1 && clickY <= scaledY2) {
        // Show the Toast
        setToastVisible(true)

        // Send the clicked box position to the backend
        fetch('http://localhost:8000/api/box-click/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ boxIndex: index, coordinates: obj.box, tag: obj.tag }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error('Network response was not ok')
            }
            return response.json()
          })
          .then((data) => console.log('Box clicked:', data))
          .catch((error) => console.error('Error sending box position:', error))
      }
    })
  }

  // Function to handle mouse movement and change cursor style
  const handleMouseMove = (event) => {
    if (!canvasRef.current || !objectData.length) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Get mouse coordinates relative to the actual canvas size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const mouseX = (event.clientX - rect.left) * scaleX
    const mouseY = (event.clientY - rect.top) * scaleY
    let overBox = false

    // Check if the mouse is over any box
    objectData.forEach((obj) => {
      const [x1, y1, x2, y2] = obj.box

      // Scaled coordinates for the canvas size
      const scaledX1 = x1 * canvas.width
      const scaledY1 = y1 * canvas.height
      const scaledX2 = x2 * canvas.width
      const scaledY2 = y2 * canvas.height

      if (mouseX >= scaledX1 && mouseX <= scaledX2 && mouseY >= scaledY1 && mouseY <= scaledY2) {
        overBox = true
      }
    })

    // Update the cursor style
    canvas.style.cursor = overBox ? 'pointer' : 'default'
  }

  // Function to switch between capture image and camera feed
  const handleActionSelect = (action) => {
    if (action === 'capture') {
      fetchImageAndData()
    } else if (action === 'camera') {
      setViewMode('camera')
      setReconnectAttempts(0) // Reset reconnection attempts
      checkCameraConnection()
    }
  }

  useEffect(() => {
    if (viewMode === 'camera') {
      checkCameraConnection()
      const interval = setInterval(() => {
        checkCameraConnection()
      }, 5000) // Attempt reconnection every 5 seconds

      return () => clearInterval(interval)
    }
  }, [viewMode])

  useEffect(() => {
    if (imageLoaded && viewMode === 'capture' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.src = imageSrc

      img.onload = () => {
        // Set canvas dimensions
        canvas.width = img.width
        canvas.height = img.height

        // Draw the image on the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear the canvas before drawing
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Draw the boxes if data is present
        if (objectData && objectData.length > 0) {
          console.log('Number of boxes:', objectData.length)

          objectData.forEach((obj) => {
            const [x1, y1, x2, y2] = obj.box

            // Adjust normalized coordinates for the canvas size
            const scaledX1 = x1 * canvas.width
            const scaledY1 = y1 * canvas.height
            const scaledX2 = x2 * canvas.width
            const scaledY2 = y2 * canvas.height

            // Draw the box
            ctx.strokeStyle = 'yellow'
            ctx.lineWidth = 4 // Increase line thickness
            ctx.strokeRect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY1)

            // Add the object label
            ctx.font = 'bold 18px Arial' // Increase font size and weight
            ctx.fillStyle = 'yellow'
            ctx.fillText(obj.tag, scaledX1, scaledY1 - 5)
          })
        } else {
          console.log('No box data found.')
        }
      }
    }
  }, [imageLoaded, imageSrc, objectData, viewMode])

  return (
    <>
      <CCard style={{ maxWidth: '960px', margin: '0 auto' }}>
        <CCardHeader>
          Monitoramento de Câmera
          <div style={{ float: 'right' }}>
            <CDropdown>
              <CDropdownToggle color="primary">Ações</CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem onClick={() => handleActionSelect('capture')}>Capturar Imagem</CDropdownItem>
                <CDropdownItem onClick={() => handleActionSelect('camera')}>Exibir Câmera</CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </div>
        </CCardHeader>
        <CCardBody style={{ position: 'relative', padding: 0 }}>
          {viewMode === 'camera' ? (
            imageLoaded ? (
              <img
                src="http://localhost:8000/api/camera-feed/"
                alt="Camera"
                style={{ width: '100%', height: 'auto' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '0',
                  paddingTop: '56.25%', // Aspect ratio for 16:9
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f0f0f0',
                  color: '#000',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  Esperando por conexão da câmera...
                </div>
              </div>
            )
          ) : (
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 'auto' }}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove} // Add this line to handle mouse movement
            />
          )}
        </CCardBody>
      </CCard>
      <CToaster
        position="top-right"
        style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 9999 }}
      >
        {toastVisible && (
          <CToast autohide={true} delay={3000} visible={toastVisible} onClose={() => setToastVisible(false)}>
            <CToastHeader closeButton>Notificação</CToastHeader>
            <CToastBody>Solicitação enviada</CToastBody>
          </CToast>
        )}
      </CToaster>
    </>
  )
}

export default CameraMonitoring
