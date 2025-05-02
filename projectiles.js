// --- Particle & Effect Classes ---
class Afterimage {
    constructor(x, y, angle, radius, color) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.radius = radius;
        this.color = color;
        this.lifespan = 165;
        this.startLifespan = this.lifespan;
        this.active = true;
    }

    update(effectiveDt) {
        if (!this.active) return;
        this.lifespan -= effectiveDt * 1000;
        if (this.lifespan <= 0) {
            this.active = false;
        }
    }

    draw(ctx, offsetX, offsetY) {
        if (!this.active) return;
        const alpha = Math.max(0, this.lifespan / this.startLifespan) * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x - offsetX, this.y - offsetY);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Shockwave { constructor(x, y, maxRadius, lifespan) { this.x = x; this.y = y; this.radius = 0; this.maxRadius = maxRadius; this.lifespan = lifespan; this.startLifespan = lifespan; this.active = true; } update(effectiveDt) { if (!this.active) return; this.lifespan -= effectiveDt * 1000; if (this.lifespan <= 0) { this.active = false; return; } const lifeRatio = 1 - (this.lifespan / this.startLifespan); this.radius = this.maxRadius * lifeRatio; this.alpha = (1 - lifeRatio) * 0.15; } draw(ctx, offsetX, offsetY) { if (!this.active || this.alpha <= 0) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; } }


// --- ADDED: Psi Blade Effect Class ---
class PsiBladeEffect {
    constructor(x, y, angle, range, arcAngle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.range = range;
        this.arcAngle = arcAngle;
        this.lifespan = PSI_BLADE_EFFECT_DURATION; // <<< Uses constant
        this.startLifespan = this.lifespan;
        this.active = true;
    }

    update(effectiveDt) {
        if (!this.active) return;
        this.lifespan -= effectiveDt * 1000;
        if (this.lifespan <= 0) {
            this.active = false;
        }
    }

    draw(ctx, offsetX, offsetY) {
        if (!this.active) return;

        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return;

        const lifeRatio = Math.max(0, this.lifespan / this.startLifespan);
        const alpha = lifeRatio * 0.6;

        ctx.save();
        ctx.translate(this.x - offsetX, this.y - offsetY);
        ctx.rotate(this.angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.range, -this.arcAngle / 2, this.arcAngle / 2);
        ctx.closePath();

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.range * lifeRatio);
        gradient.addColorStop(0, `rgba(200, 100, 255, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(150, 50, 220, ${alpha * 0.2})`);

        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }
}

// --- MODIFIED: Psi Blast Particle Class ---
class PsiBlastParticle {
    // Constructor now accepts dynamic properties scaled by shield amount
    constructor(x, y, angle, damage, initialRadius, currentLifespan, currentStunDuration) {
        this.x = x;
        this.y = y;
        this.baseRadius = initialRadius;
        this.radius = this.baseRadius * (1 + Math.random() * 0.2);
        this.speed = PSI_BLAST_PARTICLE_SPEED * (0.9 + Math.random() * 0.3);
        this.angle = angle;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.damping = PSI_BLAST_PARTICLE_DAMPING;
        this.lifespan = currentLifespan * (0.85 + Math.random() * 0.3); // Use scaled lifespan
        this.startLifespan = this.lifespan;
        this.damage = damage; // Dynamic damage
        this.stunDuration = currentStunDuration; // Use scaled stun duration
        this.active = true;
        this.hitTargets = new Set();

        this.colorStart = PSI_BLAST_PARTICLE_COLOR_START;
        this.colorEnd = PSI_BLAST_PARTICLE_COLOR_END;
    }

    update(effectiveDt, isWallFunc, zombies) {
        if (!this.active) return;

        const dampingFactor = Math.max(0, 1.0 - (this.damping * effectiveDt));
        this.vx *= dampingFactor;
        this.vy *= dampingFactor;

        this.x += this.vx * effectiveDt;
        this.y += this.vy * effectiveDt;

        this.lifespan -= effectiveDt; // Lifespan is in seconds
        if (this.lifespan <= 0) {
            this.active = false;
            return;
        }

        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        if (isWallFunc(gridX, gridY)) {
            this.active = false;
            return;
        }
        if (typeof level !== 'undefined' && (this.x < 0 || this.x > level.width * TILE_SIZE || this.y < 0 || this.y > level.height * TILE_SIZE)) {
             this.active = false;
             return;
        }

        if(zombies && Array.isArray(zombies)) {
            for (const zombie of zombies) {
                if (zombie && zombie.hp > 0 && !this.hitTargets.has(zombie)) {
                    if (distance(this.x, this.y, zombie.x, zombie.y) < this.radius + zombie.radius) {
                        if (this.damage > 0) {
                           zombie.takeDamage(this.damage, 'psi_blast', this.stunDuration); // Pass calculated stun
                        }
                        this.hitTargets.add(zombie);
                    }
                }
            }
        }
    }

    draw(ctx, offsetX, offsetY) {
        if (!this.active) return;

        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return;

        const lifeRatio = this.startLifespan > 0 ? Math.max(0, this.lifespan / this.startLifespan) : 0;
        const alpha = lifeRatio * 1.0;

        this.radius = this.baseRadius * (0.3 + lifeRatio * 0.7);

        const r = lerp(this.colorEnd[0], this.colorStart[0], lifeRatio);
        const g = lerp(this.colorEnd[1], this.colorStart[1], lifeRatio);
        const b = lerp(this.colorEnd[2], this.colorStart[2], lifeRatio);

        ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, Math.max(1.5, this.radius), 0, Math.PI * 2);
        ctx.fill();
    }
}
// --- END MODIFIED CLASS ---


class RailgunParticle { constructor(x, y) { this.x = x; this.y = y; this.radius = RAILGUN_PARTICLE_RADIUS * (0.8 + Math.random() * 0.4); this.lifespan = RAILGUN_PARTICLE_LIFESPAN * (0.7 + Math.random() * 0.6); this.startLifespan = this.lifespan; this.active = true; this.alpha = 1.0; } update(effectiveDt) { if (!this.active) return; this.lifespan -= effectiveDt * 1000; if (this.lifespan <= 0) { this.active = false; return; } this.alpha = Math.max(0, this.lifespan / this.startLifespan); } draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; ctx.fillStyle = `rgba(80, 180, 220, ${this.alpha * 0.6})`; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2); ctx.fill(); } }
class GrenadeParticle { constructor(x, y, angle) { this.x = x; this.y = y; this.radius = GRENADE_PARTICLE_WIDTH / 2; this.speed = GRENADE_PARTICLE_SPEED * (0.8 + Math.random() * 0.4); this.angle = angle; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.lifespan = GRENADE_PARTICLE_LIFESPAN * (0.9 + Math.random() * 0.2); this.damage = GRENADE_PARTICLE_DAMAGE; this.active = true; this.hitTargets = new Set(); this.length = GRENADE_PARTICLE_LENGTH; this.width = GRENADE_PARTICLE_WIDTH; this.bouncesLeft = 1; } update(effectiveDt, isWallFunc, zombies, player, mercenaries) { if (!this.active) return; const prevX = this.x; const prevY = this.y; this.x += this.vx * effectiveDt; this.y += this.vy * effectiveDt; this.lifespan -= effectiveDt; if (this.lifespan <= 0) { this.active = false; return; } const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (isWallFunc(gridX, gridY)) { if (this.bouncesLeft > 0) { this.bouncesLeft--; const prevGridX = Math.floor(prevX / TILE_SIZE); const prevGridY = Math.floor(prevY / TILE_SIZE); let wallNormalX = 0; let wallNormalY = 0; if (prevGridX !== gridX && !isWallFunc(prevGridX, gridY)) wallNormalX = (this.x > prevX) ? -1 : 1; if (prevGridY !== gridY && !isWallFunc(gridX, prevGridY)) wallNormalY = (this.y > prevY) ? -1 : 1; if(wallNormalX === 0 && wallNormalY === 0) { if (Math.abs(this.vx) > Math.abs(this.vy)) wallNormalX = (this.vx > 0) ? -1 : 1; else wallNormalY = (this.vy > 0) ? -1 : 1; } const norm = normalizeVector(wallNormalX, wallNormalY); wallNormalX = norm.x; wallNormalY = norm.y; const reflectFactor = 2 * dotProduct(this.vx, this.vy, wallNormalX, wallNormalY); this.vx = (this.vx - reflectFactor * wallNormalX) * PARTICLE_BOUNCE_DAMPING; this.vy = (this.vy - reflectFactor * wallNormalY) * PARTICLE_BOUNCE_DAMPING; this.angle = Math.atan2(this.vy, this.vx); this.x = prevX + this.vx * effectiveDt * 0.1; this.y = prevY + this.vy * effectiveDt * 0.1; } else { this.active = false; return; } } for (const zombie of zombies) { if (zombie.hp > 0 && !this.hitTargets.has(zombie)) { if (distance(this.x, this.y, zombie.x, zombie.y) < this.radius + zombie.radius) { zombie.takeDamage(this.damage, 'explosion_particle'); this.hitTargets.add(zombie); this.active = false; return; } } } for (const merc of mercenaries) { if (merc.active && merc.hp > 0 && !this.hitTargets.has(merc)) { if (distance(this.x, this.y, merc.x, merc.y) < this.radius + merc.radius) { merc.takeDamage(this.damage, 'explosion_particle'); this.hitTargets.add(merc); this.active = false; return; } } } if (player && player.active && player.hp > 0 && !this.hitTargets.has(player)) { if (distance(this.x, this.y, player.x, player.y) < this.radius + player.radius) { player.takeDamage(this.damage, 'explosion_particle'); this.hitTargets.add(player); this.active = false; return; } } } draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; ctx.save(); ctx.translate(this.x - offsetX, this.y - offsetY); ctx.rotate(this.angle); ctx.strokeStyle = `rgba(255, ${100 + Math.random()*100}, 0, ${Math.max(0.1, this.lifespan / GRENADE_PARTICLE_LIFESPAN)})`; ctx.lineWidth = this.width; ctx.beginPath(); ctx.moveTo(-this.length / 2, 0); ctx.lineTo(this.length / 2, 0); ctx.stroke(); ctx.restore(); } }
class Grenade { constructor(x, y, angle) { this.x = x; this.y = y; this.radius = 5; this.speed = GRENADE_SPEED; this.angle = angle; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.fuseTimer = GRENADE_FUSE_TIME; this.active = true; this.stopped = false; this.justBounced = false; } update(effectiveDt, isWallFunc) { if (!this.active) return; this.justBounced = false; this.fuseTimer -= effectiveDt * 1000; if (this.fuseTimer <= 0) { this.explode(this.x, this.y); this.active = false; return; } if (!this.stopped) { const prevX = this.x; const prevY = this.y; let nextX = this.x + this.vx * effectiveDt; let nextY = this.y + this.vy * effectiveDt; const gridX = Math.floor(nextX / TILE_SIZE); const gridY = Math.floor(nextY / TILE_SIZE); let collisionNormal = null; if (isWallFunc(gridX, gridY)) { const prevGridX = Math.floor(prevX / TILE_SIZE); const prevGridY = Math.floor(prevY / TILE_SIZE); if (prevGridX !== gridX && !isWallFunc(prevGridX, gridY)) { collisionNormal = { x: (nextX > prevX) ? -1 : 1, y: 0 }; } else if (prevGridY !== gridY && !isWallFunc(gridX, prevGridY)) { collisionNormal = { x: 0, y: (nextY > prevY) ? -1 : 1 }; } else { collisionNormal = normalizeVector(prevX - nextX, prevY - nextY); } } if (collisionNormal) { if (Math.random() < GRENADE_BOUNCE_CHANCE) { this.justBounced = true; const reflectFactor = 2 * dotProduct(this.vx, this.vy, collisionNormal.x, collisionNormal.y); this.vx = (this.vx - reflectFactor * collisionNormal.x) * GRENADE_BOUNCE_DAMPING; this.vy = (this.vy - reflectFactor * collisionNormal.y) * GRENADE_BOUNCE_DAMPING; this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy); this.angle = Math.atan2(this.vy, this.vx); this.x = prevX + this.vx * effectiveDt * 0.1; this.y = prevY + this.vy * effectiveDt * 0.1; } else { this.stopped = true; this.vx = 0; this.vy = 0; this.x = prevX; this.y = prevY; } } else { this.x = nextX; this.y = nextY; } } } explode(explodeX, explodeY) { for (let i = 0; i < GRENADE_PARTICLE_COUNT; i++) { grenadeParticles.push(new GrenadeParticle(explodeX, explodeY, Math.random() * Math.PI * 2)); } const radius = RPG_EXPLOSION_RADIUS * GRENADE_EXPLOSION_RADIUS_FACTOR; const maxDamage = GRENADE_PARTICLE_DAMAGE * 2; const minDamage = GRENADE_PARTICLE_DAMAGE * 0.5; const radiusSq = radius * radius; if (player && player.active && player.hp > 0) { const distSq = distance(explodeX, explodeY, player.x, player.y) ** 2; if (distSq < radiusSq) { const damageRatio = Math.max(0, 1 - Math.sqrt(distSq) / radius); const damage = Math.round(minDamage + (maxDamage - minDamage) * damageRatio); player.takeDamage(damage, 'explosion'); } } zombies.forEach(zombie => { if (zombie.hp > 0) { const distSq = distance(explodeX, explodeY, zombie.x, zombie.y) ** 2; if (distSq < radiusSq) { const damageRatio = Math.max(0, 1 - Math.sqrt(distSq) / radius); const damage = Math.round(minDamage + (maxDamage - minDamage) * damageRatio); zombie.takeDamage(damage, 'explosion'); } } }); mercenaries.forEach(merc => { if (merc.active && merc.hp > 0) { const distSq = distance(explodeX, explodeY, merc.x, merc.y) ** 2; if (distSq < radiusSq) { const damageRatio = Math.max(0, 1 - Math.sqrt(distSq) / radius); const damage = Math.round(minDamage + (maxDamage - minDamage) * damageRatio); merc.takeDamage(damage, 'explosion'); } } }); } draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; ctx.fillStyle = 'black'; ctx.strokeStyle = 'darkgrey'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (Math.floor(this.fuseTimer / 150) % 2 === 0) { ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, 2, 0, Math.PI * 2); ctx.fill(); } } }
class RPGProjectile { constructor(x, y, angle) { this.x = x; this.y = y; this.radius = 4; this.speed = RPG_SPEED; this.angle = angle; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.active = true; this.smokeTimer = 0; } update(effectiveDt, isWallFunc, zombies, player, mercenaries) { if (!this.active) return; const nextX = this.x + this.vx * effectiveDt; const nextY = this.y + this.vy * effectiveDt; const gridX = Math.floor(nextX / TILE_SIZE); const gridY = Math.floor(nextY / TILE_SIZE); let collisionPoint = null; let impactTarget = null; let impactAngle = this.angle; if (isWallFunc(gridX, gridY)) { collisionPoint = {x: this.x, y: this.y}; impactAngle = Math.atan2(-this.vy, -this.vx) + Math.PI; impactTarget = { type: 'wall', gridX, gridY }; destroyTile(gridX, gridY); } else { for (const zombie of zombies) { if(zombie.hp > 0 && distance(nextX, nextY, zombie.x, zombie.y) < this.radius + zombie.radius){ collisionPoint = {x: this.x, y: this.y}; impactAngle = Math.atan2(zombie.y-this.y, zombie.x-this.x); impactTarget = zombie; break; } } } if (!collisionPoint) { for (const merc of mercenaries) { if(merc.active && merc.hp > 0 && distance(nextX, nextY, merc.x, merc.y) < this.radius + merc.radius){ collisionPoint = {x: this.x, y: this.y}; impactAngle = Math.atan2(merc.y-this.y, merc.x-this.x); impactTarget = merc; break; } } } if (!collisionPoint && player && player.active && player.hp > 0) { if(distance(nextX, nextY, player.x, player.y) < this.radius + player.radius){ collisionPoint = {x: this.x, y: this.y}; impactAngle = Math.atan2(player.y-this.y, player.x-this.x); impactTarget = player; } } if (!collisionPoint && (nextX < 0 || typeof level === 'undefined' || nextX > level.width * TILE_SIZE || nextY < 0 || nextY > level.height * TILE_SIZE)) { collisionPoint = {x: this.x, y: this.y}; impactAngle = Math.atan2(-this.vy, -this.vx) + Math.PI; impactTarget = { type: 'bounds' }; } if (collisionPoint){ this.explode(collisionPoint.x, collisionPoint.y, impactAngle, player, zombies, mercenaries, impactTarget); this.active = false; return; } this.x = nextX; this.y = nextY; this.smokeTimer -= effectiveDt*1000; if(this.smokeTimer <= 0){ smokeParticles.push(new SmokeParticle(this.x - this.vx * effectiveDt * 0.5, this.y - this.vy * effectiveDt * 0.5)); this.smokeTimer = RPG_SMOKE_INTERVAL; } } explode(explodeX, explodeY, impactAngle, player, zombies, mercenaries, impactTarget) { if (!this.active) return; createExplosion(explodeX, explodeY, RPG_EXPLOSION_RADIUS, RPG_DAMAGE_CENTER, RPG_DAMAGE_EDGE, RPG_EXPLOSION_PARTICLE_COUNT, RPG_EXPLOSION_PARTICLE_SPEED, RPG_EXPLOSION_PARTICLE_LIFESPAN, RPG_PARTICLE_LENGTH, RPG_PARTICLE_WIDTH, 0, player, zombies, mercenaries, impactAngle, impactTarget); } draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; ctx.save(); ctx.translate(this.x - offsetX, this.y - offsetY); ctx.rotate(this.angle); ctx.fillStyle = 'grey'; ctx.fillRect(-8, -3, 16, 6); ctx.fillStyle = 'red'; ctx.fillRect(8, -2, 4, 4); ctx.restore(); } }
class ExplosionParticle extends GrenadeParticle { constructor(x, y, angle, speed, lifespan, damage, length, width) { super(x, y, angle); this.speed = speed; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.lifespan = lifespan * (0.9 + Math.random() * 0.2); this.damage = damage; this.length = length; this.width = width; this.radius = width / 2; this.bouncesLeft = 2; } update(effectiveDt, isWallFunc, zombies, player, mercenaries) { if (!this.active) return; const prevX = this.x; const prevY = this.y; this.x += this.vx * effectiveDt; this.y += this.vy * effectiveDt; this.lifespan -= effectiveDt; if (this.lifespan <= 0) { this.active = false; return; } const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (isWallFunc(gridX, gridY)) { if (this.bouncesLeft > 0) { this.bouncesLeft--; const prevGridX = Math.floor(prevX / TILE_SIZE); const prevGridY = Math.floor(prevY / TILE_SIZE); let wallNormalX = 0; let wallNormalY = 0; if (prevGridX !== gridX && !isWallFunc(prevGridX, gridY)) wallNormalX = (this.x > prevX) ? -1 : 1; if (prevGridY !== gridY && !isWallFunc(gridX, prevGridY)) wallNormalY = (this.y > prevY) ? -1 : 1; if(wallNormalX === 0 && wallNormalY === 0) { if (Math.abs(this.vx) > Math.abs(this.vy)) wallNormalX = (this.vx > 0) ? -1 : 1; else wallNormalY = (this.vy > 0) ? -1 : 1; } const norm = normalizeVector(wallNormalX, wallNormalY); wallNormalX = norm.x; wallNormalY = norm.y; const reflectFactor = 2 * dotProduct(this.vx, this.vy, wallNormalX, wallNormalY); this.vx = (this.vx - reflectFactor * wallNormalX) * PARTICLE_BOUNCE_DAMPING; this.vy = (this.vy - reflectFactor * wallNormalY) * PARTICLE_BOUNCE_DAMPING; this.angle = Math.atan2(this.vy, this.vx); this.x = prevX + this.vx * effectiveDt * 0.1; this.y = prevY + this.vy * effectiveDt * 0.1; } else { this.active = false; return; } } for (const zombie of zombies) { if (zombie.hp > 0 && !this.hitTargets.has(zombie)) { if (distance(this.x, this.y, zombie.x, zombie.y) < this.radius + zombie.radius) { if(this.damage > 0) zombie.takeDamage(this.damage, 'explosion_particle'); this.hitTargets.add(zombie); this.active = false; return; } } } for (const merc of mercenaries) { if (merc.active && merc.hp > 0 && !this.hitTargets.has(merc)) { if (distance(this.x, this.y, merc.x, merc.y) < this.radius + merc.radius) { if(this.damage > 0) merc.takeDamage(this.damage, 'explosion_particle'); this.hitTargets.add(merc); this.active = false; return; } } } if (player && player.active && player.hp > 0 && !this.hitTargets.has(player)) { if (distance(this.x, this.y, player.x, player.y) < this.radius + player.radius) { if(this.damage > 0) player.takeDamage(this.damage, 'explosion_particle'); this.hitTargets.add(player); this.active = false; return; } } } draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; ctx.save(); ctx.translate(this.x - offsetX, this.y - offsetY); ctx.rotate(this.angle); const lifeRatio = this.lifespan > 0 ? Math.max(0, this.lifespan / RPG_EXPLOSION_PARTICLE_LIFESPAN) : 0; ctx.strokeStyle = `rgba(255, ${50 + Math.random()*150}, 0, ${0.1 + lifeRatio * 0.7})`; ctx.lineWidth = this.width; ctx.beginPath(); ctx.moveTo(-this.length / 2, 0); ctx.lineTo(this.length / 2, 0); ctx.stroke(); ctx.restore(); } }
class SmokeParticle { constructor(x, y) { this.x = x + (Math.random() - 0.5) * 5; this.y = y + (Math.random() - 0.5) * 5; this.radius = RPG_SMOKE_SIZE * (0.5 + Math.random() * 0.5); this.maxRadius = this.radius * (1.5 + Math.random()); this.lifespan = RPG_SMOKE_LIFESPAN * (0.8 + Math.random() * 0.4); this.startLifespan = this.lifespan; this.active = true; this.alpha = 0.6; this.growthRate = (this.maxRadius - this.radius) / (this.startLifespan / 1000); this.vx = (Math.random() - 0.5) * 15; this.vy = (Math.random() - 0.5) * 15; } update(effectiveDt) { if (!this.active) return; this.lifespan -= effectiveDt * 1000; if (this.lifespan <= 0) { this.active = false; return; } this.x += this.vx * effectiveDt; this.y += this.vy * effectiveDt; this.radius += this.growthRate * effectiveDt; this.alpha = 0.6 * (this.lifespan / this.startLifespan); } draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; ctx.fillStyle = `rgba(100, 100, 100, ${this.alpha})`; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2); ctx.fill(); } }

// --- Wall Spark Particle (for Machinegun) ---
class WallSparkParticle {
    constructor(x, y, angle, speed) { this.x = x; this.y = y; this.radius = MG_WALL_SPARK_RADIUS * (0.8 + Math.random() * 0.4); this.angle = angle; this.speed = speed; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed; this.lifespan = MG_WALL_SPARK_LIFESPAN * (0.8 + Math.random() * 0.4); this.startLifespan = this.lifespan; this.active = true; this.bouncesLeft = MG_WALL_SPARK_BOUNCES; }
    update(effectiveDt, isWallFunc) { if (!this.active) return; const prevX = this.x; const prevY = this.y; this.x += this.vx * effectiveDt; this.y += this.vy * effectiveDt; this.lifespan -= effectiveDt * 1000; if (this.lifespan <= 0) { this.active = false; return; }
        const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE);
        if (isWallFunc(gridX, gridY)) {
            if (this.bouncesLeft > 0) {
                this.bouncesLeft--; const prevGridX = Math.floor(prevX / TILE_SIZE); const prevGridY = Math.floor(prevY / TILE_SIZE); let wallNormalX = 0; let wallNormalY = 0;
                if (prevGridX !== gridX && !isWallFunc(prevGridX, gridY)) wallNormalX = (this.x > prevX) ? -1 : 1; if (prevGridY !== gridY && !isWallFunc(gridX, prevGridY)) wallNormalY = (this.y > prevY) ? -1 : 1; if (wallNormalX === 0 && wallNormalY === 0) { if (Math.abs(this.vx) > Math.abs(this.vy)) wallNormalX = (this.vx > 0) ? -1 : 1; else wallNormalY = (this.vy > 0) ? -1 : 1; }
                const norm = normalizeVector(wallNormalX, wallNormalY); wallNormalX = norm.x; wallNormalY = norm.y; const reflectFactor = 2 * dotProduct(this.vx, this.vy, wallNormalX, wallNormalY); this.vx = (this.vx - reflectFactor * wallNormalX) * MG_WALL_SPARK_DAMPING; this.vy = (this.vy - reflectFactor * wallNormalY) * MG_WALL_SPARK_DAMPING; this.angle = Math.atan2(this.vy, this.vx); this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy); this.x = prevX + this.vx * effectiveDt * 0.1; this.y = prevY + this.vy * effectiveDt * 0.1;
            } else { this.active = false; return; }
        }
    }
    draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; const lifeRatio = Math.max(0, this.lifespan / this.startLifespan); const brightness = 220 + Math.floor(35 * lifeRatio); const currentRadius = this.radius * (0.6 + lifeRatio * 0.4); ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness - 20}, ${lifeRatio * 0.95})`; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, currentRadius, 0, Math.PI * 2); ctx.fill(); }
}

// --- Flash Particle (for RPG Explosions) ---
class FlashParticle {
    constructor(x, y, angle, speed, lifespan) { this.x = x; this.y = y; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed; this.lifespan = lifespan; this.startLifespan = lifespan; this.active = true; this.colorVal = Math.random(); this.flickerSpeed = 25 + Math.random() * 30; this.baseRadius = 1.0 + Math.random() * 1.0; }
    update(effectiveDt) { if (!this.active) return; this.x += this.vx * effectiveDt; this.y += this.vy * effectiveDt; this.lifespan -= effectiveDt * 1000; if (this.lifespan <= 0) { this.active = false; } }
    draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; const lifeRatio = Math.max(0, this.lifespan / this.startLifespan); const flicker = 0.5 + Math.abs(Math.sin(performance.now() * 0.001 * this.flickerSpeed)) * 0.5; const radius = this.baseRadius * (0.5 + lifeRatio * 0.5); const alpha = lifeRatio * flicker; const r = 255; const g = lerp(180, 255, this.colorVal); const b = lerp(0, 50, this.colorVal); ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, Math.max(0.5, radius), 0, Math.PI * 2); ctx.fill(); }
}


class Projectile {
    constructor(x, y, angle, damage, speed, penetration, ricochets, length = PROJECTILE_LENGTH_DEFAULT, width = PROJECTILE_WIDTH_DEFAULT, ignoreWalls = false, isShotgunPellet = false, weaponId = -1) { this.x = x; this.y = y; this.radius = width / 2; this.damage = damage; this.speed = speed; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.angle = angle; this.length = length; this.width = width; this.lifespan = PROJECTILE_LIFESPAN_DEFAULT; this.active = true; this.penetrationLeft = penetration; this.maxRicochets = ricochets; this.ricochetsLeft = ricochets; this.hitTargets = new Set(); this.justBounced = false; this.ignoreWalls = ignoreWalls; this.isShotgunPellet = isShotgunPellet; this.weaponId = weaponId; this.hitWallThisFrame = false; this.wallHitX = 0; this.wallHitY = 0; this.wallHitAngle = 0; }
    update(effectiveDt, isWallFunc, zombies) { if (!this.active) return; this.justBounced = false; this.hitWallThisFrame = false; const prevX = this.x; const prevY = this.y; let nextX = this.x + this.vx * effectiveDt; let nextY = this.y + this.vy * effectiveDt; this.lifespan -= effectiveDt; if (this.lifespan <= 0) { this.active = false; return; }
        if (!this.ignoreWalls) {
            const currentGridX = Math.floor(nextX / TILE_SIZE); const currentGridY = Math.floor(nextY / TILE_SIZE);
            if (isWallFunc(currentGridX, currentGridY)) {
                const prevGridX = Math.floor(prevX / TILE_SIZE); const prevGridY = Math.floor(prevY / TILE_SIZE); let wallNormalX = 0; let wallNormalY = 0; let hitVertical = false; let hitHorizontal = false;
                if (prevGridX !== currentGridX && !isWallFunc(prevGridX, currentGridY)) { wallNormalX = (nextX > prevX) ? -1 : 1; hitVertical = true; } if (prevGridY !== currentGridY && !isWallFunc(currentGridX, prevGridY)) { wallNormalY = (nextY > prevY) ? -1 : 1; hitHorizontal = true; } if (!hitVertical && !hitHorizontal) { if (Math.abs(this.vx) > Math.abs(this.vy)) wallNormalX = (this.vx > 0) ? -1 : 1; else wallNormalY = (this.vy > 0) ? -1 : 1; }
                const norm = normalizeVector(wallNormalX, wallNormalY); wallNormalX = norm.x; wallNormalY = norm.y; this.hitWallThisFrame = true; this.wallHitX = prevX; this.wallHitY = prevY; this.wallHitAngle = this.angle;
                const normVel = normalizeVector(this.vx, this.vy); const dotIncidence = dotProduct(normVel.x, normVel.y, wallNormalX, wallNormalY); const ricochetChance = (1.0 - Math.abs(dotIncidence)) * 0.9 + 0.05;
                if (this.ricochetsLeft > 0 && Math.random() < ricochetChance) { this.ricochetsLeft--; this.penetrationLeft = 0; this.justBounced = true; const reflectFactor = 2 * dotProduct(this.vx, this.vy, wallNormalX, wallNormalY); this.vx -= reflectFactor * wallNormalX; this.vy -= reflectFactor * wallNormalY; this.x = prevX + this.vx * effectiveDt * 0.1; this.y = prevY + this.vy * effectiveDt * 0.1; this.angle = Math.atan2(this.vy, this.vx); nextX = this.x + this.vx * effectiveDt; nextY = this.y + this.vy * effectiveDt; }
                else { this.active = false; this.x = prevX; this.y = prevY; return; }
            }
        }
        if(this.active) { this.x = nextX; this.y = nextY; }
        if (!this.justBounced) {
            for (const zombie of zombies) { if (zombie.hp <= 0 || this.hitTargets.has(zombie)) continue; if (distance(this.x, this.y, zombie.x, zombie.y) < this.radius + zombie.radius) { zombie.takeDamage(this.damage, 'bullet'); this.hitTargets.add(zombie); if (this.isShotgunPellet && AUTOSHOTGUN_STUN_DURATION > 0) { zombie.stunTimer = Math.max(zombie.stunTimer || 0, AUTOSHOTGUN_STUN_DURATION); } if (zombie.type === ZOMBIE_TYPE.TYRANT) { this.penetrationLeft = 0; this.ricochetsLeft = 0; this.active = false; return; } else if (this.penetrationLeft > 0 && this.penetrationLeft !== Infinity) { this.penetrationLeft--; this.ricochetsLeft = Math.max(0, this.ricochetsLeft - 1); } else if (this.penetrationLeft === 0) { this.active = false; return; } } }
        }
    }
    draw(ctx, offsetX, offsetY) { if (!this.active) return; const gridX = Math.floor(this.x / TILE_SIZE); const gridY = Math.floor(this.y / TILE_SIZE); if (!this.ignoreWalls && typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] !== FOG_STATE.REVEALED) return; ctx.save(); ctx.translate(this.x - offsetX, this.y - offsetY); ctx.rotate(this.angle); ctx.strokeStyle = (this.penetrationLeft === Infinity) ? 'cyan' : 'yellow'; ctx.lineWidth = this.width; ctx.beginPath(); ctx.moveTo(-this.length / 2, 0); ctx.lineTo(this.length / 2, 0); ctx.stroke(); ctx.restore(); }
}
function createExplosion(x, y, radius, maxDamage, minDamage, particleCount, particleSpeed, particleLifespan, particleLength, particleWidth, particleDamage, player, zombies, mercenaries, impactAngle = null, impactTarget = null) {
    const radiusSq = radius * radius; let bossHitAndStunned = false;
    const applyAoEDamage = (target) => { if (target && target.active !== false && target.hp > 0) { const distSq = distance(x, y, target.x, target.y) ** 2; if (distSq < radiusSq) { const damageRatio = Math.max(0, 1 - Math.sqrt(distSq) / radius); const damage = Math.round(minDamage + (maxDamage - minDamage) * damageRatio); target.takeDamage(damage, 'explosion'); if (target === impactTarget && target.type === ZOMBIE_TYPE.TYRANT && target.hp > 0) { target.stunTimer = Math.max(target.stunTimer || 0, RPG_STUN_DURATION); bossHitAndStunned = true; } } } };
    applyAoEDamage(player); zombies.forEach(applyAoEDamage); mercenaries.forEach(merc => { if(merc.active) applyAoEDamage(merc); });
    shockwaves.push(new Shockwave(x, y, RPG_SHOCKWAVE_MAX_RADIUS, RPG_SHOCKWAVE_LIFESPAN)); const baseAngle = impactAngle !== null ? impactAngle + Math.PI : Math.random() * Math.PI * 2;
    for (let i = 0; i < particleCount; i++) { const randomAngleOffset = (Math.random() - 0.5) * RPG_PARTICLE_CONE_ANGLE; const particleAngle = baseAngle + randomAngleOffset; let currentSpeed = particleSpeed; const diffFromBase = angleDiff(baseAngle, particleAngle); if (Math.abs(diffFromBase) < RPG_PARTICLE_CONE_ANGLE / 2) { currentSpeed *= RPG_PARTICLE_SPEED_BIAS_FACTOR * (0.9 + Math.random() * 0.3); } else { currentSpeed *= (0.5 + Math.random() * 0.4); } explosionParticles.push(new ExplosionParticle( x, y, particleAngle, currentSpeed, particleLifespan, particleDamage, particleLength, particleWidth )); }
    for (let i = 0; i < RPG_FLASH_PARTICLE_COUNT; i++) { const flashAngle = Math.random() * Math.PI * 2; const flashSpeed = getRandomInt(RPG_FLASH_PARTICLE_SPEED_MIN, RPG_FLASH_PARTICLE_SPEED_MAX); const flashLifespan = getRandomInt(RPG_FLASH_PARTICLE_LIFESPAN_MIN, RPG_FLASH_PARTICLE_LIFESPAN_MAX); flashParticles.push(new FlashParticle( x, y, flashAngle, flashSpeed, flashLifespan )); }
}