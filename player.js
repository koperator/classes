import * as C from './constants.js'; // Import all constants with alias C
import { distance, normalizeVector, dotProduct, getRandomInt, hasLineOfSight } from './utils.js';
import { Projectile, Grenade, RPGProjectile } from './projectiles.js'; // Import specific projectile classes

// --- Drone Class ---
class Drone {
    constructor(owner) { this.owner = owner; this.angle = Math.random() * Math.PI * 2; this.target = null; this.fireCooldown = 0; this.x = 0; this.y = 0; } // Init x/y
    update(dt, zombies, isWallFunc, projectiles_ref) { // Pass projectile array ref
        this.angle += C.DRONE_ORBIT_SPEED * dt; if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
        this.x = this.owner.x + Math.cos(this.angle) * C.DRONE_ORBIT_RADIUS; this.y = this.owner.y + Math.sin(this.angle) * C.DRONE_ORBIT_RADIUS;
        if (this.fireCooldown > 0) this.fireCooldown -= dt * 1000;
        let closestDistSq = C.DRONE_TARGETING_RANGE * C.DRONE_TARGETING_RANGE; let potentialTarget = null;
        zombies.forEach(zombie => { if (zombie.hp <= 0) return; const distSq = distance(this.x, this.y, zombie.x, zombie.y) ** 2; if (distSq < closestDistSq) { if (hasLineOfSight(this.x, this.y, zombie.x, zombie.y, isWallFunc)) { closestDistSq = distSq; potentialTarget = zombie; } } });
        this.target = potentialTarget;
        if (this.target && this.fireCooldown <= 0) {
            const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            projectiles_ref.push(new Projectile( this.x, this.y, targetAngle, C.DRONE_PROJECTILE_DAMAGE, C.DRONE_PROJECTILE_SPEED, 0, 0, C.DRONE_PROJECTILE_LENGTH, C.DRONE_PROJECTILE_WIDTH ));
            this.fireCooldown = 1000 / C.DRONE_FIRE_RATE;
        }
    }
    draw(ctx, offsetX, offsetY) { ctx.fillStyle = 'lightblue'; ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, C.PLAYER_SIZE * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

// --- Player Class ---
export class Player {
     constructor(x, y, classData) {
        this.x = x; this.y = y; this.radius = C.PLAYER_SIZE / 2; this.classData = classData;
        this.hp = classData.hp; this.maxHp = classData.hp; this.speedMultiplier = classData.speedMultiplier;
        this.speedWalk = C.BASE_PLAYER_SPEED_WALK * this.speedMultiplier; this.speedRun = C.BASE_PLAYER_SPEED_RUN * this.speedMultiplier;
        this.speed = this.speedWalk; this.angle = 0; this.vx = 0; this.vy = 0; this.isMoving = false; this.isRunning = false;
        this.currentWeaponIndex = C.weapons.findIndex(w => w.id === classData.weaponId); if (this.currentWeaponIndex === -1) this.currentWeaponIndex = 0;
        this.currentWeapon = C.weapons[this.currentWeaponIndex]; this.ammo = this.currentWeapon.magSize; this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0;
        this.spread = this.currentWeapon.spreadWalk;
        this.abilityType = classData.ability.type; this.abilityCooldown = classData.ability.cooldown; this.abilityCooldownTimer = 0;
        this.abilityUsesTotal = classData.ability.uses !== undefined ? classData.ability.uses : Infinity; this.abilityUsesLeft = this.abilityUsesTotal;
        this.abilityDuration = classData.ability.duration || 0; this.healAmount = classData.ability.healAmount || 0;
        this.isDashing = false; this.dashTimer = 0;
        this.passiveType = classData.passive ? classData.passive.type : null; this.drone = null; if (this.passiveType === 'drone') this.drone = new Drone(this);
    }
    update(dt, input, camera, isSolidFunc, isWallFunc, projectiles_ref, grenades_ref, rpgProjectiles_ref, zombies_ref) { // Pass dependencies
        if (this.abilityCooldownTimer > 0) this.abilityCooldownTimer -= dt * 1000;
        if (this.isDashing) { this.dashTimer -= dt * 1000; if (this.dashTimer <= 0) { this.isDashing = false; this.speed = this.isRunning ? this.speedRun : this.speedWalk; } }
        this.isRunning = input.shift && !this.isDashing; this.speed = this.isDashing ? this.speedRun * C.PLAYER_DASH_SPEED_FACTOR : (this.isRunning ? this.speedRun : this.speedWalk);
        let moveX = 0; let moveY = 0; if (input.w) moveY -= 1; if (input.s) moveY += 1; if (input.a) moveX -= 1; if (input.d) moveX += 1;
        this.isMoving = (moveX !== 0 || moveY !== 0); this.spread = this.isMoving ? (this.isRunning ? this.currentWeapon.spreadRun : this.currentWeapon.spreadWalk) : this.currentWeapon.spreadStand;
        const moveMagnitude = Math.sqrt(moveX * moveX + moveY * moveY); if (moveMagnitude > 0) { moveX /= moveMagnitude; moveY /= moveMagnitude; }
        this.vx = moveX * this.speed; this.vy = moveY * this.speed; let nextX = this.x + this.vx * dt; let nextY = this.y + this.vy * dt;
        let collidedX = isSolidFunc(Math.floor(nextX / C.TILE_SIZE), Math.floor(this.y / C.TILE_SIZE)); let collidedY = isSolidFunc(Math.floor(this.x / C.TILE_SIZE), Math.floor(nextY / C.TILE_SIZE)); // Simplified check
        // Refined check for collision points might be needed from checkWallCollision logic
        // For now, simplified check:
        if (!isSolidFunc(Math.floor(nextX / C.TILE_SIZE), Math.floor(this.y / C.TILE_SIZE))) this.x = nextX; else this.vx = 0;
        if (!isSolidFunc(Math.floor(this.x / C.TILE_SIZE), Math.floor(nextY / C.TILE_SIZE))) this.y = nextY; else this.vy = 0;
        // Simple slide attempt
        if(collidedX && collidedY){
             if (!isSolidFunc(Math.floor((this.x + this.vx*dt) / C.TILE_SIZE), Math.floor(this.y / C.TILE_SIZE))) this.x += this.vx * dt;
             else if (!isSolidFunc(Math.floor(this.x / C.TILE_SIZE), Math.floor((this.y + this.vy*dt) / C.TILE_SIZE))) this.y += this.vy * dt;
        }

        const canvasRect = canvas.getBoundingClientRect(); const mouseGameX = input.mouseX - canvasRect.left + camera.x; const mouseGameY = input.mouseY - canvasRect.top + camera.y; this.angle = Math.atan2(mouseGameY - this.y, mouseGameX - this.x);
        if (this.reloading) { this.reloadTimer += dt * 1000; if (this.reloadTimer >= this.currentWeapon.reloadTime) { this.reloading = false; this.ammo = this.currentWeapon.magSize; } }
        else { if (input.r && this.ammo < this.currentWeapon.magSize) { this.startReload(); } if (this.ammo <= 0 && !this.reloading) { this.startReload(); } }
        const fireInterval = 60000 / this.currentWeapon.rpm; this.fireTimer -= dt * 1000;
        const canShoot = (this.currentWeapon.auto && input.mouseDown) || (!this.currentWeapon.auto && input.mouseDown && this.fireTimer <= -fireInterval * 0.5);
        if (canShoot && !this.reloading && this.ammo > 0 && this.fireTimer <= 0) {
            if (this.currentWeapon.isRaycast) this.shootRaycast(zombies_ref); // Pass zombies for raycast check
            else this.shootProjectile(projectiles_ref); // Pass projectile array
            this.fireTimer = fireInterval; this.ammo--;
            if (!this.currentWeapon.auto) input.mouseDown = false; // Consume click for non-auto
        }
        if (input.space && !this.reloading && this.abilityUsesLeft > 0 && this.abilityCooldownTimer <= 0) { this.useAbility(grenades_ref, rpgProjectiles_ref); input.space = false; }
        if (this.drone) { this.drone.update(dt, zombies_ref, isWallFunc, projectiles_ref); } // Update drone
    }
    startReload() { if (!this.reloading && this.ammo < this.currentWeapon.magSize) { this.reloading = true; this.reloadTimer = 0; this.fireTimer = 0; } }
    shootProjectile(projectiles_ref) { const weapon = this.currentWeapon; const pellets = weapon.pellets; const barrelOffset = C.PLAYER_SIZE * C.GUN_BARREL_OFFSET_FACTOR; for (let i = 0; i < pellets; i++) { const shotAngle = this.angle + (Math.random() - 0.5) * this.spread; const barrelStartX = this.x + Math.cos(this.angle) * barrelOffset; const barrelStartY = this.y + Math.sin(this.angle) * barrelOffset; const damage = getRandomInt(weapon.damageMin, weapon.damageMax); projectiles_ref.push(new Projectile(barrelStartX, barrelStartY, shotAngle, damage, weapon.projectileSpeed, weapon.penetration, weapon.ricochets, C.PROJECTILE_LENGTH_DEFAULT, C.PROJECTILE_WIDTH_DEFAULT)); } }
    shootRaycast(zombies_ref) { const weapon = this.currentWeapon; const angle = this.angle + (Math.random() - 0.5) * this.spread; const damage = getRandomInt(weapon.damageMin, weapon.damageMax); const rayDx = Math.cos(angle); const rayDy = Math.sin(angle); const maxRange = canvas.width * 2; let hitPoint = { x: this.x + rayDx * maxRange, y: this.y + rayDy * maxRange }; let rayDist = maxRange; let wallHit = false; const step = C.TILE_SIZE / 4; for (let d = C.TILE_SIZE*0.5; d < maxRange; d += step) { const checkX = this.x + rayDx * d; const checkY = this.y + rayDy * d; const gridX = Math.floor(checkX / C.TILE_SIZE); const gridY = Math.floor(checkY / C.TILE_SIZE); if (isWall(gridX, gridY)) { hitPoint = { x: checkX, y: checkY }; rayDist = d; wallHit = true; break; } } zombies_ref.forEach(zombie => { if (zombie.hp <= 0) return; const distToStart = distance(this.x, this.y, zombie.x, zombie.y); if (distToStart > rayDist + zombie.radius) return; const projLen = dotProduct(zombie.x - this.x, zombie.y - this.y, rayDx, rayDy); if(projLen < 0 || projLen > rayDist) return; const closestPointX = this.x + rayDx * projLen; const closestPointY = this.y + rayDy * projLen; const distToRay = distance(zombie.x, zombie.y, closestPointX, closestPointY); if (distToRay < zombie.radius + C.RAILGUN_WIDTH/2) { zombie.takeDamage(damage); } }); railgunEffects.push({ startX: this.x, startY: this.y, endX: hitPoint.x, endY: hitPoint.y, timer: C.RAILGUN_EFFECT_DURATION }); }
    switchWeapon(index) { if(index >= 0 && index < C.weapons.length && index !== this.currentWeaponIndex) { this.currentWeaponIndex = index; this.currentWeapon = C.weapons[this.currentWeaponIndex]; console.log("Switched to:", this.currentWeapon.name); this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0; this.ammo = this.currentWeapon.magSize; this.spread = this.currentWeapon.spreadStand; } }
    useAbility(grenades_ref, rpgProjectiles_ref) { if (this.abilityCooldownTimer > 0 || this.abilityUsesLeft <= 0) return; switch (this.abilityType) { case 'dash': this.isDashing = true; this.dashTimer = this.abilityDuration; this.abilityCooldownTimer = this.abilityCooldown; break; case 'grenade': this.throwGrenade(grenades_ref); this.abilityUsesLeft--; this.abilityCooldownTimer = this.abilityCooldown; break; case 'rpg': const rpgAngle = this.angle; const barrelOffset = C.PLAYER_SIZE * C.GUN_BARREL_OFFSET_FACTOR; const rpgStartX = this.x + Math.cos(rpgAngle) * barrelOffset; const rpgStartY = this.y + Math.sin(rpgAngle) * barrelOffset; rpgProjectiles_ref.push(new RPGProjectile(rpgStartX, rpgStartY, rpgAngle, C.RPG_SPEED)); this.abilityUsesLeft--; this.abilityCooldownTimer = this.abilityCooldown; break; case 'medkit': this.hp = Math.min(this.maxHp, this.hp + this.healAmount); this.abilityUsesLeft--; this.abilityCooldownTimer = this.abilityCooldown; break; } }
    throwGrenade(grenades_ref) { const barrelOffset = C.PLAYER_SIZE * C.GUN_BARREL_OFFSET_FACTOR; const startX = this.x + Math.cos(this.angle) * barrelOffset * 1.5; const startY = this.y + Math.sin(this.angle) * barrelOffset * 1.5; grenades_ref.push(new Grenade(startX, startY, this.angle, C.GRENADE_SPEED, C.GRENADE_FUSE_TIME)); }
    takeDamage(amount) { this.hp -= amount; if (this.hp <= 0) { this.hp = 0; /* game over set globally */ } }
    draw(ctx, offsetX, offsetY) { ctx.save(); ctx.translate(this.x - offsetX, this.y - offsetY); ctx.rotate(this.angle); ctx.fillStyle = this.classData.color || 'blue'; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'white'; ctx.fillRect(this.radius * 0.5, -2, C.PLAYER_SIZE * C.GUN_BARREL_OFFSET_FACTOR, 4); ctx.restore(); if (this.reloading) { ctx.fillStyle = 'yellow'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.fillText("Reloading...", this.x - offsetX, this.y - offsetY - this.radius - 15); ctx.textAlign = 'left'; } if (this.isDashing) { /* Draw dash effect? */ } }
}