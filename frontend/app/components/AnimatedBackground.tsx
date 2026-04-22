'use client'

import { useEffect, useRef } from 'react'

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布大小
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 粒子类
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      color: string

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth
        this.y = Math.random() * canvasHeight
        this.size = Math.random() * 3 + 1
        this.speedX = (Math.random() - 0.5) * 0.5
        this.speedY = (Math.random() - 0.5) * 0.5
        this.opacity = Math.random() * 0.5 + 0.2

        // 随机选择颜色（蓝色、紫色、青色）
        const colors = ['99, 102, 241', '139, 92, 246', '59, 130, 246', '168, 85, 247']
        this.color = colors[Math.floor(Math.random() * colors.length)]
      }

      update(canvasWidth: number, canvasHeight: number) {
        this.x += this.speedX
        this.y += this.speedY

        // 边界检测
        if (this.x > canvasWidth) this.x = 0
        if (this.x < 0) this.x = canvasWidth
        if (this.y > canvasHeight) this.y = 0
        if (this.y < 0) this.y = canvasHeight
      }

      draw() {
        if (!ctx) return
        ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 创建粒子数组
    const particles: Particle[] = []
    const particleCount = 100

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height))
    }

    // 网格线
    const drawGrid = (time: number) => {
      if (!ctx) return

      const gridSize = 50
      const offsetY = (time * 0.02) % gridSize

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)'
      ctx.lineWidth = 1

      // 垂直线
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      // 水平线（带滚动效果）
      for (let y = -gridSize; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y + offsetY)
        ctx.lineTo(canvas.width, y + offsetY)
        ctx.stroke()
      }
    }

    // 光晕效果
    const drawGlow = (time: number) => {
      if (!ctx) return

      const glows = [
        { x: 0.2, y: 0.3, size: 300, color: '99, 102, 241' },
        { x: 0.8, y: 0.7, size: 400, color: '139, 92, 246' },
        { x: 0.5, y: 0.5, size: 350, color: '59, 130, 246' },
      ]

      glows.forEach((glow, index) => {
        const x = canvas.width * glow.x + Math.sin(time * 0.001 + index) * 100
        const y = canvas.height * glow.y + Math.cos(time * 0.001 + index) * 100

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glow.size)
        gradient.addColorStop(0, `rgba(${glow.color}, 0.15)`)
        gradient.addColorStop(0.5, `rgba(${glow.color}, 0.05)`)
        gradient.addColorStop(1, `rgba(${glow.color}, 0)`)

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      })
    }

    // 连接粒子
    const connectParticles = () => {
      if (!ctx) return

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.2 * (1 - distance / 150)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }

    // 动画循环
    let animationId: number
    let startTime = Date.now()

    const animate = () => {
      const currentTime = Date.now() - startTime

      // 清空画布
      ctx.fillStyle = 'rgba(15, 23, 42, 1)' // 深色背景
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 绘制网格
      drawGrid(currentTime)

      // 绘制光晕
      drawGlow(currentTime)

      // 更新和绘制粒子
      particles.forEach(particle => {
        particle.update(canvas.width, canvas.height)
        particle.draw()
      })

      // 连接粒子
      connectParticles()

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: 'linear-gradient(to bottom, #0f172a, #1e1b4b)' }}
    />
  )
}
