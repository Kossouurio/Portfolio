// This file contains the main JavaScript functionality for the website, including event listeners and DOM manipulation.

document.addEventListener('DOMContentLoaded', () => {
    // Initialize event listeners and other functionalities here
    console.log('Document is ready. Initialize your scripts here.');

    // Initialize floating particles
    initParticles();

    // Initialize scroll effects
    initScrollEffects();

    // Initialize smooth scroll for nav links
    initSmoothScroll();
});

// Scroll Effects (Nav background on scroll)
function initScrollEffects() {
    const nav = document.querySelector('nav');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Floating Particles Effect with Mouse Interaction
function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
    `;
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    // Mouse tracking
    const mouse = {
        x: null,
        y: null,
        radius: 120 // Interaction radius
    };

    // Track mouse position
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // Clear mouse position when leaving window
    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Resize canvas to match window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
        constructor() {
            this.reset();
            this.baseSpeedX = 0;
            this.baseSpeedY = 0;
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2.5 + 0.5;
            this.baseSize = this.size;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3 - 0.2; // Slight upward drift
            this.baseSpeedX = this.speedX;
            this.baseSpeedY = this.speedY;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.baseOpacity = this.opacity;
            this.fadeSpeed = Math.random() * 0.005 + 0.002;
            this.growing = Math.random() > 0.5;
            
            // Gold/orange color palette
            const colors = [
                { r: 255, g: 215, b: 0 },   // Gold
                { r: 255, g: 165, b: 0 },   // Orange
                { r: 255, g: 107, b: 107 }, // Coral accent
                { r: 255, g: 200, b: 50 },  // Light gold
            ];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            // Mouse interaction
            if (mouse.x !== null && mouse.y !== null) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    // Calculate repulsion force (stronger when closer)
                    const force = (mouse.radius - distance) / mouse.radius;
                    const angle = Math.atan2(dy, dx);
                    
                    // Push particles away from cursor
                    this.speedX = this.baseSpeedX + Math.cos(angle) * force * 2;
                    this.speedY = this.baseSpeedY + Math.sin(angle) * force * 2;
                    
                    // Brighten and enlarge near cursor
                    this.opacity = Math.min(0.9, this.baseOpacity + force * 0.5);
                    this.size = this.baseSize + force * 2;
                } else {
                    // Gradually return to base state
                    this.speedX += (this.baseSpeedX - this.speedX) * 0.05;
                    this.speedY += (this.baseSpeedY - this.speedY) * 0.05;
                    this.size += (this.baseSize - this.size) * 0.05;
                }
            } else {
                // No mouse - return to normal
                this.speedX += (this.baseSpeedX - this.speedX) * 0.05;
                this.speedY += (this.baseSpeedY - this.speedY) * 0.05;
                this.size += (this.baseSize - this.size) * 0.05;
            }

            this.x += this.speedX;
            this.y += this.speedY;

            // Gentle floating motion
            this.x += Math.sin(Date.now() * 0.001 + this.y * 0.01) * 0.1;

            // Fade in/out (only when not near mouse)
            if (mouse.x === null || Math.sqrt((this.x - mouse.x) ** 2 + (this.y - mouse.y) ** 2) > mouse.radius) {
                if (this.growing) {
                    this.opacity += this.fadeSpeed;
                    if (this.opacity >= 0.6) this.growing = false;
                } else {
                    this.opacity -= this.fadeSpeed;
                    if (this.opacity <= 0.1) this.growing = true;
                }
            }

            // Reset if out of bounds
            if (this.x < -10 || this.x > canvas.width + 10 || 
                this.y < -10 || this.y > canvas.height + 10) {
                this.reset();
                // Respawn from edges
                if (Math.random() > 0.5) {
                    this.y = canvas.height + 5;
                } else {
                    this.x = Math.random() * canvas.width;
                    this.y = canvas.height + 5;
                }
            }
        }

        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
            
            // Add glow effect
            ctx.shadowBlur = this.size * 4;
            ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * 0.5})`;
            ctx.fill();
            ctx.restore();
        }
    }

    // Create particles (slightly more for better interaction)
    const particleCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Draw connections between nearby particles
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    const opacity = (1 - distance / 100) * 0.15;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw connections first (behind particles)
        drawConnections();
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        animationId = requestAnimationFrame(animate);
    }

    animate();

    // Pause animation when tab is not visible for performance
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            animate();
        }
    });
}