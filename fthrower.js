// --- Enhanced FlameParticle Class (from flamethrower.html) ---
class FlameParticle {
    constructor(x, y, angle, speed, lifespan, weapon, isWallHitParticle = false) {
        this.x = x;
        this.y = y;
        this.ownerWeapon = weapon; // Store weapon stats
        this.angle = angle;

        // Initial speed variation: +/- 42.5% -> range 57.5% to 142.5%
        this.speed = speed * (0.575 + Math.random() * 0.85);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;

        // Lifespan variation: +/- 60%
        // Lifespan is expected in milliseconds
        this.lifespan = lifespan * (isWallHitParticle ? 0.4 : 1.0) * (0.4 + Math.random() * 1.2);
        this.startLifespan = this.lifespan;

        // Size variation and growth
        this.baseRadius = weapon.particleBaseRadius * (0.8 + Math.random() * 0.4);
        this.startRadius = this.baseRadius * (isWallHitParticle ? 0.6 : 1.0);
        this.endRadius = this.startRadius * weapon.particleSizeGrowFactor * (isWallHitParticle ? 0.7 : 1.0);

        // Damping uses the weapon constant
        this.damping = weapon.particleDamping;

        this.active = true;
        this.isWallHitParticle = isWallHitParticle;
        this.hitWall = false; // Flag for wall collision detection in game.js
        this.wallHitX = 0;    // Position where wall was hit
        this.wallHitY = 0;

        // --- ADDED for Damage ---
        this.damagedTargets = new Set(); // Keep track of zombies hit by this particle

        // Color definitions
        this.colorStart = [255, 255, 120]; // Yellowish White
        this.colorMid = [255, 160, 0];   // Orange
        this.colorEnd = [180, 60, 10];    // Dark Red/Brown
    }

    // --- ADDED zombies parameter ---
    update(dt, isWallFunc, zombies) {
        if (!this.active) return;

        const prevX = this.x;
        const prevY = this.y;

        // Apply damping (using the weapon's damping factor)
        const dampingFactor = 1.0 - (this.damping * dt);
        if (dampingFactor > 0) {
            this.vx *= dampingFactor;
            this.vy *= dampingFactor;
        } else {
            this.vx = 0;
            this.vy = 0;
        }

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Decrease lifespan (lifespan is in milliseconds)
        this.lifespan -= dt * 1000;

        if (this.lifespan <= 0) {
            this.active = false;
            return;
        }

        // Wall check (only sets flags, game.js handles particle spawning)
        if (isWallFunc(Math.floor(this.x / TILE_SIZE), Math.floor(this.y / TILE_SIZE))) {
            this.active = false;
            if (!this.isWallHitParticle) { // Only primary particles trigger wall bursts
                this.hitWall = true;
                this.wallHitX = prevX;
                this.wallHitY = prevY;
            }
            return;
        }

        // --- Zombie Collision & Damage Logic ---
        // Calculate current radius for collision check
        const lifeRatio = Math.max(0, this.lifespan / this.startLifespan);
        const growRatio = 1.0 - lifeRatio;
        const currentRadius = lerp(this.startRadius, this.endRadius, growRatio);

        // Avoid checking if radius is invalid
        if (isNaN(currentRadius) || currentRadius <= 0.1) return;

        if (zombies && zombies.length > 0) {
            for (const zombie of zombies) {
                // Check if zombie is alive AND this particle hasn't damaged it yet
                // Using zombie object directly as key in Set works fine here.
                if (zombie.hp > 0 && !this.damagedTargets.has(zombie)) {
                    // Check distance between particle center and zombie center
                    if (distance(this.x, this.y, zombie.x, zombie.y) < currentRadius + zombie.radius) {
                        zombie.takeDamage(FLAME_PARTICLE_DAMAGE, 'flame'); // Apply damage
                        this.damagedTargets.add(zombie); // Mark this zombie as hit by *this* particle
                        // Particle does NOT disappear on hit, it continues
                    }
                }
            }
        }
        // --- End Damage Logic ---
    }

    draw(ctx, offsetX, offsetY) {
        if (!this.active) return;

        // Don't draw if outside revealed fog (optimization)
        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        if (typeof level !== 'undefined' && level.fogGrid && level.fogGrid[gridY]?.[gridX] !== FOG_STATE.REVEALED) {
             return;
        }


        const lifeRatio = Math.max(0, this.lifespan / this.startLifespan);
        const growRatio = 1.0 - lifeRatio;

        const currentRadius = lerp(this.startRadius, this.endRadius, growRatio);
        // Ensure radius doesn't become negative or NaN
        if (isNaN(currentRadius) || currentRadius <= 0.1) return;

        const alpha = Math.max(0, lifeRatio * (this.isWallHitParticle ? 0.8 : 1.0));

        let r, g, b;
        // Interpolate color based on lifespan remaining
        if (lifeRatio > 0.5) {
            // Interpolate between Start and Mid color
            const t = (lifeRatio - 0.5) * 2; // Map 0.5-1.0 range to 0-1
            r = lerp(this.colorMid[0], this.colorStart[0], t);
            g = lerp(this.colorMid[1], this.colorStart[1], t);
            b = lerp(this.colorMid[2], this.colorStart[2], t);
        } else {
            // Interpolate between Mid and End color
            const t = lifeRatio * 2; // Map 0-0.5 range to 0-1
            r = lerp(this.colorEnd[0], this.colorMid[0], t);
            g = lerp(this.colorEnd[1], this.colorMid[1], t);
            b = lerp(this.colorEnd[2], this.colorMid[2], t);
        }
        r = Math.max(0, Math.min(255, Math.round(r)));
        g = Math.max(0, Math.min(255, Math.round(g)));
        b = Math.max(0, Math.min(255, Math.round(b)));

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, currentRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}