"use client"

import { useRef, useEffect, useState } from "react"

const LOGO_PATHS: { d: string; fill: string }[] = [
  {
    // Navy circle background — lightened for visibility
    d: "M-3.68439e-06 78.9988C-3.68439e-06 122.629 35.3685 157.998 78.9988 157.998C122.629 157.998 158 122.629 158 78.9988C158 35.3685 122.629 0 78.9988 0C35.3685 0 -3.68439e-06 35.3685 -3.68439e-06 78.9988Z",
    fill: "#3838A8",
  },
  {
    // White star/sparkle (top-left)
    d: "M44.1542 60.3876L46.1043 54.3628C46.5007 53.1374 47.4678 52.1839 48.6977 51.8079L54.752 49.9461C55.59 49.6901 55.5968 48.5078 54.7656 48.2383L48.7385 46.2881C47.5154 45.8918 46.5618 44.9246 46.1836 43.6947L44.324 37.6405C44.0681 36.8047 42.8858 36.7956 42.6162 37.6291L40.6661 43.654C40.2697 44.877 39.3026 45.8306 38.0727 46.2089L32.0184 48.0684C31.1804 48.3266 31.1713 49.5067 32.0048 49.7762L38.0319 51.7263C39.255 52.1227 40.2086 53.0921 40.5868 54.322L42.4464 60.374C42.7023 61.212 43.8846 61.2211 44.1542 60.3876Z",
    fill: "#FFFFFF",
  },
  {
    // Coral flowing wave (right) — lightened
    d: "M139.848 56.881C137.352 54.09 133.457 52.5186 129.67 51.8742C125.853 51.2553 121.85 51.3127 118.082 51.9822C110.457 53.272 103.53 56.4292 97.4881 60.3241C94.3506 62.2356 91.675 64.4474 88.903 66.7C87.5674 67.8392 86.3497 69.0524 85.0815 70.2482L81.6163 73.696C77.851 77.6317 74.1398 81.2165 70.549 84.1878C66.9437 87.1454 63.573 89.3917 60.2512 90.9604C56.9315 92.5372 53.3794 93.4645 48.7495 93.6129C44.1603 93.7748 38.7307 92.9465 32.9229 91.5794C27.0839 90.2183 20.9523 88.2782 14.1004 86.6088C16.4912 93.2414 20.0914 99.1027 24.7137 104.461C29.3902 109.726 35.2297 114.524 42.7314 117.68C50.1247 120.906 59.4157 122.064 68.1031 120.317C76.8135 118.64 84.4573 114.61 90.6359 109.948C96.8304 105.239 101.842 99.8748 106.067 94.298C107.233 92.7572 107.85 91.8949 108.694 90.6906L111.027 87.2351C112.648 85.0977 114.124 82.6641 115.728 80.5464C118.874 76.1112 121.976 71.6811 125.58 67.5997C127.394 65.5296 129.307 63.5495 131.565 61.6466C132.691 60.7178 133.908 59.8088 135.256 58.99C136.624 58.1068 138.069 57.4155 139.848 56.881Z",
    fill: "#F4A49A",
  },
  {
    // White flowing wave (left)
    d: "M139.848 56.8808C137.167 50.1148 132.182 44.4194 125.491 40.2167C118.841 36.0601 109.605 33.9389 100.452 35.7471C95.9307 36.6216 91.5501 38.3052 87.7059 40.5472C83.8791 42.7803 80.4499 45.4685 77.4812 48.3524C75.9992 49.7992 74.654 51.3084 73.3176 52.8262L69.8538 57.2423L64.5039 64.3512C57.6836 73.4976 50.3391 84.2166 38.2863 87.3927C26.454 90.5108 21.3221 87.7493 14.1004 86.6085C15.4209 90.0176 17.0565 93.3284 19.2739 96.2409C21.45 99.2124 24.0204 102.003 27.216 104.396C28.8309 105.545 30.5359 106.679 32.4295 107.641C34.3146 108.57 36.3474 109.388 38.5172 110.003C42.8332 111.186 47.6923 111.601 52.397 110.964C57.1039 110.336 61.6029 108.845 65.5355 106.864C69.4971 104.901 72.9481 102.511 76.0296 99.9891C82.1551 94.9021 86.9197 89.2815 90.9444 83.6C92.9688 80.7594 94.8064 77.8652 96.5059 74.9702L98.5062 71.5236C99.1177 70.5161 99.7362 69.5024 100.364 68.5584C102.899 64.7654 105.378 61.7241 108.389 59.4413C111.358 57.0995 115.493 55.3693 121.018 54.9674C126.52 54.5606 132.872 55.312 139.848 56.8808Z",
    fill: "#FFFFFF",
  },
  {
    // Coral circle (bottom-right) — lightened
    d: "M110.081 113.097C110.081 118.067 114.112 122.097 119.081 122.097C124.051 122.097 128.076 118.067 128.076 113.097C128.076 108.128 124.051 104.097 119.081 104.097C114.112 104.097 110.081 108.128 110.081 113.097Z",
    fill: "#F4A49A",
  },
]

const LOGO_VIEWBOX = { width: 158, height: 158 }

// Blue base and amber target for pulse
const BLUE_BASE  = { r: 56,  g: 56,  b: 168 }
const AMBER_BASE = { r: 245, g: 158, b: 11  }

function brightenColor(r: number, g: number, b: number): string {
  const br = Math.min(255, Math.floor(r + (255 - r) * 0.7))
  const bg = Math.min(255, Math.floor(g + (255 - g) * 0.7))
  const bb = Math.min(255, Math.floor(b + (255 - b) * 0.7))
  return `rgb(${br},${bg},${bb})`
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): string {
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bv = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r},${g},${bv})`
}

export default function LogoParticles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const isTouchingRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = Math.round(rect.width)
      canvas.height = Math.round(rect.height)
      setIsMobile(rect.width < 768)
    }

    updateCanvasSize()

    let particles: {
      x: number
      y: number
      baseX: number
      baseY: number
      size: number
      color: string
      glowColor: string
      scatteredColor: string
      isBlue: boolean
      pulseOffset: number
      life: number
    }[] = []

    let textImageData: ImageData | null = null

    function createTextImage() {
      if (!ctx || !canvas) return

      ctx.save()

      const logoSize = isMobile ? 487 : 702
      const logoScale = logoSize / LOGO_VIEWBOX.width

      ctx.translate(
        canvas.width / 2 - (LOGO_VIEWBOX.width * logoScale) / 2,
        canvas.height / 2 - (LOGO_VIEWBOX.height * logoScale) / 2,
      )
      ctx.scale(logoScale, logoScale)

      LOGO_PATHS.forEach((pathInfo) => {
        ctx.fillStyle = pathInfo.fill
        const path = new Path2D(pathInfo.d)
        ctx.fill(path, "evenodd")
      })

      ctx.restore()

      textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    function createParticle() {
      if (!ctx || !canvas || !textImageData) return null

      const data = textImageData.data

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * canvas.width)
        const y = Math.floor(Math.random() * canvas.height)
        const idx = (y * canvas.width + x) * 4

        if (data[idx + 3] > 128) {
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]

          const isBlueArea = b > r * 1.5 && b > g * 1.5
          // Keep 12.5% of blue pixels (half of the previous 25%)
          if (isBlueArea && Math.random() > 0.125) continue

          return {
            x,
            y,
            baseX: x,
            baseY: y,
            size: Math.random() * 2.2 + 0.8,
            color: `rgb(${r},${g},${b})`,
            glowColor: `rgba(${r},${g},${b},0.3)`,
            scatteredColor: brightenColor(r, g, b),
            isBlue: isBlueArea,
            pulseOffset: Math.random() * Math.PI * 2,
            life: Math.random() * 120 + 60,
          }
        }
      }

      return null
    }

    function createInitialParticles() {
      const baseParticleCount = 12000
      const particleCount = Math.floor(
        baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)),
      )
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle()
        if (particle) particles.push(particle)
      }
    }

    let animationFrameId: number

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const { x: mouseX, y: mouseY } = mousePositionRef.current
      const maxDistance = 30
      const now = Date.now()

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        let currentColor: string
        let currentGlow: string

        if (distance < maxDistance && (isTouchingRef.current || !("ontouchstart" in window))) {
          const force = (maxDistance - distance) / maxDistance
          const angle = Math.atan2(dy, dx)
          const moveX = Math.cos(angle) * force * 8
          const moveY = Math.sin(angle) * force * 8
          p.x = p.baseX - moveX
          p.y = p.baseY - moveY
          currentColor = p.scatteredColor
          currentGlow = p.scatteredColor.replace("rgb", "rgba").replace(")", ",0.5)")
        } else {
          p.x += (p.baseX - p.x) * 0.015
          p.y += (p.baseY - p.y) * 0.015

          if (p.isBlue) {
            // Pulse: slow sine wave (3 s period) with per-particle phase offset
            const t = (Math.sin(now / 3000 + p.pulseOffset) + 1) / 2
            currentColor = lerpColor(BLUE_BASE, AMBER_BASE, t)
            const tGlow = t * 0.4
            currentGlow = lerpColor(
              { r: BLUE_BASE.r, g: BLUE_BASE.b, b: BLUE_BASE.b },
              { r: AMBER_BASE.r, g: AMBER_BASE.g, b: AMBER_BASE.b },
              tGlow,
            ).replace("rgb", "rgba").replace(")", ",0.25)")
          } else {
            currentColor = p.color
            currentGlow = p.glowColor
          }
        }

        // Draw glow layer
        ctx.fillStyle = currentGlow
        const glowSize = p.size * 3
        ctx.fillRect(p.x - glowSize / 2, p.y - glowSize / 2, glowSize, glowSize)

        // Draw core particle
        ctx.fillStyle = currentColor
        ctx.fillRect(p.x, p.y, p.size, p.size)

        p.life--
        if (p.life <= 0) {
          const newParticle = createParticle()
          if (newParticle) {
            particles[i] = newParticle
          } else {
            particles.splice(i, 1)
            i--
          }
        }
      }

      const baseParticleCount = 12000
      const targetParticleCount = Math.floor(
        baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)),
      )
      while (particles.length < targetParticleCount) {
        const newParticle = createParticle()
        if (newParticle) particles.push(newParticle)
      }

      animationFrameId = requestAnimationFrame(() => animate())
    }

    createTextImage()
    createInitialParticles()
    animate()

    const handleResize = () => {
      updateCanvasSize()
      createTextImage()
      particles = []
      createInitialParticles()
    }

    const handleMove = (x: number, y: number) => {
      mousePositionRef.current = { x, y }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      handleMove(e.clientX - rect.left, e.clientY - rect.top)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        const rect = canvas.getBoundingClientRect()
        handleMove(
          e.touches[0].clientX - rect.left,
          e.touches[0].clientY - rect.top,
        )
      }
    }

    const handleTouchStart = () => {
      isTouchingRef.current = true
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
      mousePositionRef.current = { x: 0, y: 0 }
    }

    const handleMouseLeave = () => {
      if (!("ontouchstart" in window)) {
        mousePositionRef.current = { x: 0, y: 0 }
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("mouseleave", handleMouseLeave)
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      resizeObserver.disconnect()
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchend", handleTouchEnd)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isMobile])

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className || ""}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute top-0 left-0 touch-none"
        aria-label="Interactive particle effect with SN logo"
      />
    </div>
  )
}
