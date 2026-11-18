/**
 * High-Performance Canvas Confetti and Star Particle System with Fireworks Rocket System
 */

class ConfettiSystem {
    constructor(canvasId = 'confetti-canvas') {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.rockets = [];
        this.animationId = null;
        this.colors = [
            '#FFD700', '#FFA500', '#FF4500', '#00E5FF', 
            '#00FF88', '#FF3366', '#A855F7', '#FFFFFF',
            '#F43F5E', '#EC4899', '#38BDF8', '#FBBF24'
        ];
    }

    init() {
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = this.canvasId;
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.zIndex = '9999';
            document.body.appendChild(this.canvas);
        }

        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * (window.devicePixelRatio || 1);
        this.canvas.height = this.height * (window.devicePixelRatio || 1);
        if (this.ctx) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        }
    }

    launchRocket(startX, targetX, targetY, color) {
        if (!this.canvas) this.init();
        const startY = window.innerHeight;
        const distY = startY - targetY;
        const gravity = 0.38;
        const vy = -Math.sqrt(2 * gravity * Math.max(100, distY)) * (0.95 + Math.random() * 0.1);
        const time = Math.abs(vy / gravity);
        const vx = (targetX - startX) / (time || 1);

        this.rockets.push({
            x: startX,
            y: startY,
            vx: vx,
            vy: vy,
            gravity: gravity,
            targetY: targetY,
            color: color || this.colors[Math.floor(Math.random() * this.colors.length)]
        });

        if (!this.animationId) {
            this.loop();
        }
    }

    explodeRocket(x, y, baseColor) {
        const count = 90;
        const secColor = this.colors[Math.floor(Math.random() * this.colors.length)];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 11 + 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 3,
                color: Math.random() > 0.35 ? baseColor : secColor,
                gravity: 0.16,
                drag: 0.95,
                opacity: 1,
                decay: Math.random() * 0.016 + 0.009,
                isStar: Math.random() > 0.45,
                isSparkle: true,
                sparkleSpeed: Math.random() * 0.2 + 0.1
            });
        }
    }

    burst(x = window.innerWidth / 2, y = window.innerHeight * 0.45, count = 120) {
        if (!this.canvas) this.init();

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 14 + 5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 6,
                size: Math.random() * 10 + 6,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 12,
                gravity: 0.28,
                drag: 0.96,
                opacity: 1,
                decay: Math.random() * 0.012 + 0.008,
                isStar: Math.random() > 0.6
            });
        }

        if (!this.animationId) {
            this.loop();
        }
    }

    celebrate(durationMs = 4500) {
        if (!this.canvas) this.init();

        const end = Date.now() + durationMs;
        const interval = setInterval(() => {
            if (Date.now() > end) {
                clearInterval(interval);
                return;
            }
            this.burst(window.innerWidth * 0.2, window.innerHeight * 0.5, 30);
            this.burst(window.innerWidth * 0.8, window.innerHeight * 0.5, 30);
        }, 300);

        // Immediate central burst
        this.burst(window.innerWidth / 2, window.innerHeight * 0.4, 100);
    }

    fireworks(durationMs = 5000) {
        if (!this.canvas) this.init();

        const end = Date.now() + durationMs;

        // Wave launches of rockets across screen
        const interval = setInterval(() => {
            if (Date.now() > end) {
                clearInterval(interval);
                return;
            }

            const xPositions = [0.2, 0.38, 0.5, 0.65, 0.8];
            const chosen = xPositions.sort(() => Math.random() - 0.5).slice(0, 2);
            chosen.forEach(ratio => {
                const startX = window.innerWidth * ratio + (Math.random() - 0.5) * 80;
                const targetX = startX + (Math.random() - 0.5) * 120;
                const targetY = window.innerHeight * (0.18 + Math.random() * 0.32);
                this.launchRocket(startX, targetX, targetY);
            });

            // Occasional side confetti bursts
            this.burst(window.innerWidth * (Math.random() > 0.5 ? 0.15 : 0.85), window.innerHeight * 0.35, 25);
        }, 320);

        // Immediate opening salvo
        this.launchRocket(window.innerWidth * 0.25, window.innerWidth * 0.3, window.innerHeight * 0.25);
        this.launchRocket(window.innerWidth * 0.75, window.innerWidth * 0.7, window.innerHeight * 0.25);
        this.launchRocket(window.innerWidth * 0.5, window.innerWidth * 0.5, window.innerHeight * 0.22);
        this.burst(window.innerWidth / 2, window.innerHeight * 0.38, 80);
    }

    drawStar(cx, cy, spikes, outerRadius, innerRadius, color, rotation) {
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate((rotation * Math.PI) / 180);
        this.ctx.beginPath();
        let rot = (Math.PI / 2) * 3;
        let x = 0;
        let y = 0;
        const step = Math.PI / spikes;

        this.ctx.moveTo(0, -outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = Math.cos(rot) * outerRadius;
            y = Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;

            x = Math.cos(rot) * innerRadius;
            y = Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        this.ctx.lineTo(0, -outerRadius);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.restore();
    }

    loop() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Process and draw ascending firework rockets
        for (let r = this.rockets.length - 1; r >= 0; r--) {
            const rk = this.rockets[r];
            rk.x += rk.vx;
            rk.y += rk.vy;
            rk.vy += rk.gravity;

            // Tail sparks
            for (let s = 0; s < 2; s++) {
                this.particles.push({
                    x: rk.x + (Math.random() - 0.5) * 4,
                    y: rk.y + (Math.random() - 0.5) * 4,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: Math.random() * 2 + 1,
                    size: Math.random() * 3 + 1,
                    color: '#FFF275',
                    gravity: 0.05,
                    drag: 0.96,
                    opacity: 0.8,
                    decay: 0.06,
                    isStar: false
                });
            }

            // Rocket head
            this.ctx.save();
            this.ctx.fillStyle = rk.color;
            this.ctx.beginPath();
            this.ctx.arc(rk.x, rk.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();

            // Explode at apex or when passing target
            if (rk.vy >= -1.5 || rk.y <= rk.targetY) {
                this.explodeRocket(rk.x, rk.y, rk.color);
                this.rockets.splice(r, 1);
            }
        }

        // 2. Process and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.vx *= p.drag;
            p.vy *= p.drag;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            if (p.rotation !== undefined) {
                p.rotation += (p.rotationSpeed || 2);
            }
            p.opacity -= p.decay;

            if (p.opacity <= 0 || p.y > this.height + 50) {
                this.particles.splice(i, 1);
                continue;
            }

            let currentAlpha = Math.max(0, p.opacity);
            if (p.isSparkle) {
                currentAlpha = Math.min(1, currentAlpha * (0.6 + Math.random() * 0.5));
            }

            this.ctx.globalAlpha = currentAlpha;

            if (p.isStar) {
                this.drawStar(p.x, p.y, 5, p.size * 0.8, p.size * 0.4, p.color, p.rotation || 0);
            } else if (p.isSparkle) {
                this.ctx.save();
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            } else {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(((p.rotation || 0) * Math.PI) / 180);
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
                this.ctx.restore();
            }
        }

        this.ctx.globalAlpha = 1;

        if (this.particles.length > 0 || this.rockets.length > 0) {
            this.animationId = requestAnimationFrame(() => this.loop());
        } else {
            this.animationId = null;
        }
    }

    clear() {
        this.particles = [];
        this.rockets = [];
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// Global confetti & fireworks instance
const instance = new ConfettiSystem();
window.confettiSystem = instance;
window.confetti = instance;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => instance.init());
} else {
    instance.init();
}
