"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface ThoughtParticlesProps {
    density?: number;
    sensitivity?: number;
    color?: string;
    speedMultiplier?: number;
    sizeMultiplier?: number;
}

export function ThoughtParticles({
    density = 1.0,
    sensitivity = 20,
    color = "#ffffff",
    speedMultiplier = 1.0,
    sizeMultiplier = 1.0
}: ThoughtParticlesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let mouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        class Particle {
            x: number;
            y: number;
            originX: number;
            originY: number;
            size: number;
            speedX: number;
            speedY: number;
            vx: number;
            vy: number;
            opacity: number;
            fadeSpeed: number;
            density: number;

            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.originX = this.x;
                this.originY = this.y;
                this.size = (Math.random() * 1.5 + 0.5) * sizeMultiplier;
                this.speedX = (Math.random() - 0.5) * 0.2 * speedMultiplier;
                this.speedY = -(Math.random() * 0.3 + 0.1) * speedMultiplier;
                this.vx = 0;
                this.vy = 0;
                this.opacity = Math.random() * 0.5;
                this.fadeSpeed = (Math.random() * 0.005 + 0.002) * speedMultiplier;
                this.density = (Math.random() * 20) + 1;
            }

            update() {
                // Background movement
                this.x += this.speedX;
                this.y += this.speedY;

                // Mouse interaction (Avoidance)
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                const maxDistance = sensitivity * 5; // Scale maxDistance with sensitivity
                let force = (maxDistance - distance) / maxDistance;

                if (distance < maxDistance) {
                    this.x -= forceDirectionX * force * this.density;
                    this.y -= forceDirectionY * force * this.density;
                }

                if (this.y < 0) {
                    this.y = canvas.height;
                    this.x = Math.random() * canvas.width;
                }

                // Bounce off edges if pushed too far
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;

                // Pulse opacity
                this.opacity += this.fadeSpeed;
                if (this.opacity > 0.6 || this.opacity < 0.1) {
                    this.fadeSpeed *= -1;
                }
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

                // Handle 'accent' keyword or hex
                const particleColor = color === 'accent' ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffffff' : color;

                // Convert hex to rgba for opacity
                let fillStyle = particleColor;
                if (particleColor.startsWith('#')) {
                    const r = parseInt(particleColor.slice(1, 3), 16);
                    const g = parseInt(particleColor.slice(3, 5), 16);
                    const b = parseInt(particleColor.slice(5, 7), 16);
                    fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity})`;
                }

                ctx.fillStyle = fillStyle;
                ctx.fill();

                // Add a very subtle glow to some particles
                if (this.size > 1.2 * sizeMultiplier) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = particleColor === "#ffffff" ? "rgba(255, 255, 255, 0.2)" : `${particleColor}33`;
                } else {
                    ctx.shadowBlur = 0;
                }
            }
        }

        const init = () => {
            particles = [];
            // Made density significantly more noticeable
            const baseDensity = 8000;
            const baseParticleCount = Math.floor((canvas.width * canvas.height) / baseDensity);
            const particleCount = Math.floor(baseParticleCount * density);
            for (let i = 0; i < Math.min(particleCount, 500); i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p) => {
                p.update();
                p.draw();
            });
            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", handleMouseMove);
        resize();
        init();
        animate();

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [density, sensitivity, color, speedMultiplier, sizeMultiplier]);

    return (
        <motion.canvas
            ref={canvasRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ filter: "blur(0.5px)" }}
        />
    );
}
