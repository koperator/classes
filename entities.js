// --- Zombie Class ---
class Zombie { constructor(x, y, type = ZOMBIE_TYPE.REGULAR) { this.x = x; this.y = y; this.type = type; this.stunTimer = 0; switch (type) { case ZOMBIE_TYPE.TANK: this.speed = TANK_SPEED; this.hp = TANK_HP; this.color = TANK_COLOR; this.radius = ZOMBIE_SIZE * 1.3 * 0.8; this.attackDamageMin = TANK_DMG; this.attackDamageMax = TANK_DMG; break; case ZOMBIE_TYPE.TYRANT: this.speed = TYRANT_SPEED; this.hp = TYRANT_HP; this.color = TYRANT_COLOR; this.radius = ZOMBIE_SIZE * 1.8 * 1.1; this.attackDamageMin = TYRANT_DMG; this.attackDamageMax = TYRANT_DMG; break; case ZOMBIE_TYPE.REGULAR: default: this.speed = getRandomElement(ZOMBIE_SPEED_TIERS); this.hp = getRandomElement(ZOMBIE_HP_TIERS); this.color = ZOMBIE_REGULAR_COLOR; this.radius = ZOMBIE_SIZE / 2; this.attackDamageMin = ZOMBIE_ATTACK_DAMAGE_MIN; this.attackDamageMax = ZOMBIE_ATTACK_DAMAGE_MAX; break; } this.maxHp = this.hp; this.path = []; this.pathCooldown = 0.5 + Math.random() * 0.3; this.pathTimer = Math.random() * this.pathCooldown; this.targetNodeIndex = 0; this.lastAttackTime = 0; this.isAttacking = false; this.currentTarget = null; }
    update(effectiveDt, player, mercenaries_ref, pathfinderGrid, finder, isWallFunc, zombies) {
        if(this.hp <= 0) return;
        if (this.stunTimer > 0) {
            this.stunTimer -= effectiveDt * 1000;
            this.isAttacking = false;
            return;
        }
        let closestTarget = null; let minDistSq = Infinity; if (player && player.active && player.hp > 0) { const distSq = distance(this.x, this.y, player.x, player.y) ** 2; if (distSq < minDistSq) { minDistSq = distSq; closestTarget = player; } }
        mercenaries_ref.forEach(merc => { if (merc.active && merc.hp > 0) { const distSq = distance(this.x, this.y, merc.x, merc.y) ** 2; if (distSq < minDistSq) { minDistSq = distSq; closestTarget = merc; } } }); this.currentTarget = closestTarget;
        this.pathTimer += effectiveDt;
        if (this.pathTimer >= this.pathCooldown && this.currentTarget && pathfinderGrid && finder) { this.pathTimer = 0; const startX = Math.floor(this.x / TILE_SIZE); const startY = Math.floor(this.y / TILE_SIZE); const endX = Math.floor(this.currentTarget.x / TILE_SIZE); const endY = Math.floor(this.currentTarget.y / TILE_SIZE); if (!isWallFunc(startX, startY) && !isWallFunc(endX, endY)) { if (pathfinderGrid) { const gridClone = pathfinderGrid.clone(); try { this.path = finder.findPath(startX, startY, endX, endY, gridClone); this.targetNodeIndex = 0; } catch (e) { this.path = []; } } else { this.path = [];} } else { this.path = []; } } let targetX = this.currentTarget ? this.currentTarget.x : this.x; let targetY = this.currentTarget ? this.currentTarget.y : this.y; if (this.path.length > 0 && this.targetNodeIndex < this.path.length) { const targetNode = this.path[this.targetNodeIndex]; targetX = targetNode[0] * TILE_SIZE + TILE_SIZE / 2; targetY = targetNode[1] * TILE_SIZE + TILE_SIZE / 2; if (distance(this.x, this.y, targetX, targetY) < TILE_SIZE * 0.6) { this.targetNodeIndex++; if (this.targetNodeIndex >= this.path.length) { this.path = []; targetX = this.currentTarget ? this.currentTarget.x : this.x; targetY = this.currentTarget ? this.currentTarget.y : this.y; } else { const nextNode = this.path[this.targetNodeIndex]; targetX = nextNode[0] * TILE_SIZE + TILE_SIZE / 2; targetY = nextNode[1] * TILE_SIZE + TILE_SIZE / 2; } } } else if(this.currentTarget) { targetX = this.currentTarget.x; targetY = this.currentTarget.y; } const dx = targetX - this.x; const dy = targetY - this.y; const distToTarget = Math.sqrt(dx * dx + dy * dy); let moveX = 0; let moveY = 0; if (distToTarget > this.radius * 0.5) { const moveNorm = normalizeVector(dx, dy);
        moveX = moveNorm.x * this.speed * effectiveDt;
        moveY = moveNorm.y * this.speed * effectiveDt;
        zombies.forEach(other => { if (other !== this && other.hp > 0) { const distOther = distance(this.x, this.y, other.x, other.y); const minDist = this.radius + other.radius; if (distOther < minDist * 1.1) { const pushDx = this.x - other.x; const pushDy = this.y - other.y; const pushMag = Math.sqrt(pushDx*pushDx + pushDy*pushDy); if (pushMag > 0.1) { const overlap = minDist - distOther; const pushForceFactor = (overlap / minDist) * 0.5;
        moveX += (pushDx / pushMag) * this.speed * effectiveDt * pushForceFactor;
        moveY += (pushDy / pushMag) * this.speed * effectiveDt * pushForceFactor;
        } } } }); let nextX = this.x + moveX; let nextY = this.y + moveY; const currentGridX = Math.floor(this.x / TILE_SIZE); const currentGridY = Math.floor(this.y / TILE_SIZE); const nextGridX = Math.floor(nextX / TILE_SIZE); const nextGridY = Math.floor(nextY / TILE_SIZE); if (!isWallFunc(nextGridX, currentGridY)) { this.x = nextX; } else {
        const slideY = this.y + Math.sign(moveY) * this.speed * effectiveDt * 0.5;
        if (!isWallFunc(currentGridX, Math.floor(slideY / TILE_SIZE))) { this.y = slideY; } } if (!isWallFunc(currentGridX, nextGridY)) { this.y = nextY; } else {
        const slideX = this.x + Math.sign(moveX) * this.speed * effectiveDt * 0.5;
        if (!isWallFunc(Math.floor(slideX / TILE_SIZE), currentGridY)) { this.x = slideX; } } } this.isAttacking = false; if (this.currentTarget && this.currentTarget.hp > 0 && this.currentTarget.active !== false) { const distToCurrentTargetSq = (this.x - this.currentTarget.x)**2 + (this.y - this.currentTarget.y)**2; const attackRangeSq = (this.radius + this.currentTarget.radius + 5)**2; if (distToCurrentTargetSq <= attackRangeSq) { const now = performance.now();
        if (now - this.lastAttackTime >= ZOMBIE_ATTACK_COOLDOWN) {
             const damage = getRandomInt(this.attackDamageMin, this.attackDamageMax);
             this.currentTarget.takeDamage(damage, 'zombie_melee');
             this.lastAttackTime = now; this.isAttacking = true;
             }
        }
    }
}
    takeDamage(amount, sourceType = 'unknown', stunDuration = null) {
        if (this.hp <= 0) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            kills++;
        }
        let calculatedStun = 0;
        if (stunDuration !== null) {
            calculatedStun = stunDuration; // Use passed stun (from Psi Blast particle)
        } else if (sourceType === 'explosion' && this.type === ZOMBIE_TYPE.TYRANT) {
            calculatedStun = RPG_STUN_DURATION;
        } else if (sourceType === 'bullet') {
            // Shotgun stun handled in Projectile update
        }
        if (calculatedStun > 0) {
             this.stunTimer = Math.max(this.stunTimer || 0, calculatedStun);
        }
    }

    // --- MODIFIED Zombie Draw for Psion X-Ray ---
    draw(ctx, offsetX, offsetY, playerRef = null) { // Optional player reference
        if (this.hp <= 0) return;

        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        let isVisible = level.fogGrid?.[gridY]?.[gridX] === FOG_STATE.REVEALED;
        let isXRayVisible = false;

        // Psion X-Ray Logic
        if (!isVisible && playerRef && playerRef.isPsion && playerRef.active) {
            const distToPlayer = distance(this.x, this.y, playerRef.x, playerRef.y);
            if (distToPlayer <= PSION_XRAY_RANGE) {
                // Check LOS *without* revealing walls to see if it's actually behind something
                if (!hasLineOfSight(playerRef.x, playerRef.y, this.x, this.y, isWall)) {
                    isXRayVisible = true;
                }
            }
        }

        if (isVisible || isXRayVisible) {
            const isStunned = this.stunTimer > 0;
            let drawColor = isStunned ? 'lightblue' : (this.isAttacking ? 'orange' : this.color);
            let alpha = 1.0;
            let drawOutline = false;

            if (isXRayVisible) {
                // Draw differently for X-Ray vision
                drawColor = 'rgba(255, 0, 0, 0.6)'; // Semi-transparent red
                alpha = 0.6;
                drawOutline = true; // Add outline for clarity
            }

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = drawColor;
            ctx.beginPath();
            ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2);
            ctx.fill();

            if (drawOutline) {
                ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            if (isVisible && isStunned) { // Only show stun effect if normally visible
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x - offsetX, this.y - offsetY, this.radius + 3, Math.PI * 1.2, Math.PI * 1.8);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(this.x - offsetX, this.y - offsetY, this.radius + 3, Math.PI * 0.2, Math.PI * 0.8);
                ctx.stroke();
            }
            ctx.restore(); // Restore alpha

            // Draw HP bar only if normally visible
            if (isVisible) {
                const barWidth = this.radius * 1.5;
                const barHeight = 4;
                const barX = this.x - offsetX - barWidth / 2;
                const barY = this.y - offsetY - this.radius - barHeight - 4;
                const hpRatio = this.hp / this.maxHp;
                ctx.fillStyle = '#555';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                ctx.fillStyle = hpRatio > 0.5 ? 'lime' : (hpRatio > 0.2 ? 'yellow' : 'red');
                ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barWidth, barHeight);
            }
        }
    }
}


// --- Mercenary Class ---
class Mercenary { constructor(x, y, id) { this.id = id; this.x = x; this.y = y; this.radius = MERC_SIZE / 2; this.hp = MERC_HP; this.maxHp = MERC_HP; this.speed = MERC_SPEED; this.angle = 0; this.targetZombie = null; this.targetPos = { x: x, y: y }; this.weapon = MERC_WEAPON; this.ammo = this.weapon.magSize; this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0; this.fireInterval = 60000 / this.weapon.rpm; this.active = true; this.path = []; this.pathCooldown = MERC_PATHFINDING_COOLDOWN + Math.random() * 0.2; this.pathTimer = Math.random() * this.pathCooldown; this.targetNodeIndex = 0; }
    update(effectiveDt, player, zombies, mercenaries_ref, isWallFunc, pathfinderGrid, finder, projectiles_ref) {
         if (!this.active || !player || !player.active) return;
         const followOffsetDist = TILE_SIZE * (1.0 + this.id * 0.5); const angleOffset = (this.id === 0 ? -0.8 : (this.id === 1 ? 0.8 : (this.id === 2 ? 0 : 0))) * (Math.PI / 2);
         const targetAngle = player.angle + Math.PI + angleOffset; this.targetPos.x = player.x + Math.cos(targetAngle) * followOffsetDist; this.targetPos.y = player.y + Math.sin(targetAngle) * followOffsetDist;
         this.pathTimer += effectiveDt;
         const distToTargetPos = distance(this.x, this.y, this.targetPos.x, this.targetPos.y); let needsNewPath = false; if (this.path.length === 0 || this.targetNodeIndex >= this.path.length) { needsNewPath = true; } else { const currentPathTargetNode = this.path[this.targetNodeIndex]; const distToNode = distance(this.x, this.y, currentPathTargetNode[0]*TILE_SIZE + TILE_SIZE/2, currentPathTargetNode[1]*TILE_SIZE + TILE_SIZE/2); if (distToNode > TILE_SIZE * 5) { needsNewPath = true; } } const targetPosMovedSignificantly = distToTargetPos > MERC_FOLLOW_DISTANCE_MAX * 1.1; const shouldRecalculatePath = needsNewPath || targetPosMovedSignificantly; if (this.pathTimer >= this.pathCooldown && pathfinderGrid && finder && shouldRecalculatePath) { this.pathTimer = 0; const startX = Math.floor(this.x / TILE_SIZE); const startY = Math.floor(this.y / TILE_SIZE); const endX = Math.floor(this.targetPos.x / TILE_SIZE); const endY = Math.floor(this.targetPos.y / TILE_SIZE); if (!isWallFunc(endX, endY) && !isWallFunc(startX, startY)) { try { const gridClone = pathfinderGrid.clone(); this.path = finder.findPath(startX, startY, endX, endY, gridClone); this.targetNodeIndex = 0; } catch (e) { this.path = []; } } else { this.path = []; } } let moveX = 0; let moveY = 0; let movingAlongPath = false; if (this.path.length > 0 && this.targetNodeIndex < this.path.length) { const targetNode = this.path[this.targetNodeIndex]; const nodeCenterX = targetNode[0] * TILE_SIZE + TILE_SIZE / 2; const nodeCenterY = targetNode[1] * TILE_SIZE + TILE_SIZE / 2; const dxNode = nodeCenterX - this.x; const dyNode = nodeCenterY - this.y; const distNode = Math.hypot(dxNode, dyNode); if (distNode > this.radius * 0.2) { const norm = normalizeVector(dxNode, dyNode); moveX = norm.x; moveY = norm.y; movingAlongPath = true; } if (distNode < TILE_SIZE * 0.7) { this.targetNodeIndex++; if (this.targetNodeIndex >= this.path.length) { this.path = []; } } } if (!movingAlongPath && distToTargetPos > MERC_FOLLOW_DISTANCE_MIN * 0.8) { const norm = normalizeVector(this.targetPos.x - this.x, this.targetPos.y - this.y); moveX = norm.x; moveY = norm.y; } mercenaries_ref.forEach(other => { if(other !== this && other.active) { const distOther = distance(this.x, this.y, other.x, other.y); if(distOther < MERC_SEPARATION_DISTANCE){ const pushDx = this.x - other.x; const pushDy = this.y - other.y; const pushNorm = normalizeVector(pushDx, pushDy); moveX += pushNorm.x * 0.3; moveY += pushNorm.y * 0.3; } } }); if (moveX !== 0 || moveY !== 0) { const moveNorm = normalizeVector(moveX, moveY);
        let nextX = this.x + moveNorm.x * this.speed * effectiveDt;
        let nextY = this.y + moveNorm.y * this.speed * effectiveDt;
        if (!isWallFunc(Math.floor(nextX / TILE_SIZE), Math.floor(this.y / TILE_SIZE))) { this.x = nextX; } if (!isWallFunc(Math.floor(this.x / TILE_SIZE), Math.floor(nextY / TILE_SIZE))) { this.y = nextY; } } this.targetZombie = null; let closestDistSq = this.weapon.range * this.weapon.range; zombies.forEach(zombie => { if (zombie.hp <= 0) return; const distSq = distance(this.x, this.y, zombie.x, zombie.y) ** 2; if (distSq < closestDistSq) { const targetTileX = Math.floor(zombie.x / TILE_SIZE); const targetTileY = Math.floor(zombie.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[targetTileY]?.[targetTileX] === FOG_STATE.REVEALED && hasLineOfSight(this.x, this.y, zombie.x, zombie.y, isWallFunc)) { closestDistSq = distSq; this.targetZombie = zombie; } } }); if (this.reloading) {
        this.reloadTimer += effectiveDt * 1000;
        if (this.reloadTimer >= this.weapon.reloadTime) { this.reloading = false; this.ammo = this.weapon.magSize; } } else { if (this.ammo <= 0) { this.reloading = true; this.reloadTimer = 0; } }
        this.fireTimer -= effectiveDt * 1000;
        if (this.targetZombie && !this.reloading && this.fireTimer <= 0) { this.angle = Math.atan2(this.targetZombie.y - this.y, this.targetZombie.x - this.x); const shotAngle = this.angle + (Math.random() - 0.5) * this.weapon.spread; const barrelOffset = this.radius * 1.1; const barrelStartX = this.x + Math.cos(this.angle) * barrelOffset; const barrelStartY = this.y + Math.sin(this.angle) * barrelOffset; const damage = getRandomInt(this.weapon.damageMin, this.weapon.damageMax); projectiles_ref.push(new Projectile( barrelStartX, barrelStartY, shotAngle, damage, this.weapon.projectileSpeed, this.weapon.penetration, this.weapon.ricochets, PROJECTILE_LENGTH_DEFAULT, PROJECTILE_WIDTH_DEFAULT )); this.fireTimer = this.fireInterval; this.ammo--; } else if (!this.targetZombie) { if (moveX !== 0 || moveY !== 0) { this.angle = Math.atan2(moveY, moveX); } else if(player && player.active) { this.angle = Math.atan2(player.y - this.y, player.x - this.x); } } }
    takeDamage(amount, sourceType = 'unknown') {
        if (!this.active) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.active = false;
        }
    }
    draw(ctx, offsetX, offsetY) {
        if (!this.active) return;
        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        if (typeof level !== 'undefined' && level.fogGrid?.[gridY]?.[gridX] === FOG_STATE.REVEALED) {
            ctx.save();
            ctx.translate(this.x - offsetX, this.y - offsetY);
            ctx.rotate(this.angle);
            ctx.fillStyle = MERC_COLOR;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'grey';
            ctx.fillRect(this.radius * 0.6, -2, this.radius * 0.8, 4);
            ctx.restore();

            const barWidth = this.radius * 1.5;
            const barHeight = 4;
            const barX = this.x - offsetX - barWidth / 2;
            const barY = this.y - offsetY - this.radius - barHeight - 4;
            const hpRatio = this.hp / this.maxHp;
            ctx.fillStyle = '#555';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = hpRatio > 0.5 ? 'lime' : (hpRatio > 0.2 ? 'yellow' : 'red');
            ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
}

// --- Drone Class ---
class Drone {
    constructor(owner, index) { this.owner = owner; this.index = index; this.target = null; this.previousTarget = null; this.fireCooldown = 0; this.switchTargetCooldownTimer = 0; this.x = owner.x + (Math.random() - 0.5) * 50; this.y = owner.y + (Math.random() - 0.5) * 50; this.vx = 0; this.vy = 0; this.targetPos = { x: this.x, y: this.y }; this.noisePhaseX = Math.random() * Math.PI * 2; this.noisePhaseY = Math.random() * Math.PI * 2; this.noiseOffsetX = 0; this.noiseOffsetY = 0; }
    update(effectiveDt, zombies, isWallFunc, projectiles_ref, allDrones) { const realTimeSeconds = performance.now() / 1000; const targetNoiseOffsetX = Math.cos(realTimeSeconds * DRONE_NOISE_FREQUENCY_X + this.noisePhaseX) * DRONE_NOISE_AMPLITUDE; const targetNoiseOffsetY = Math.sin(realTimeSeconds * DRONE_NOISE_FREQUENCY_Y + this.noisePhaseY) * DRONE_NOISE_AMPLITUDE; const noiseLerpFactor = 0.05 * (effectiveDt / (1/60)); this.noiseOffsetX = lerp(this.noiseOffsetX, targetNoiseOffsetX, Math.min(1, noiseLerpFactor)); this.noiseOffsetY = lerp(this.noiseOffsetY, targetNoiseOffsetY, Math.min(1, noiseLerpFactor)); const playerAngle = this.owner.angle; const formationAngleOffset = (this.index - (allDrones.length -1) / 2) * (Math.PI / 3.5); const targetAngle = playerAngle + formationAngleOffset; const leadDist = this.owner.isMoving ? DRONE_FOLLOW_DISTANCE * DRONE_LEAD_FACTOR : DRONE_FOLLOW_DISTANCE * 0.2; const baseTargetX = this.owner.x + Math.cos(playerAngle) * leadDist + Math.cos(targetAngle) * DRONE_FOLLOW_DISTANCE; const baseTargetY = this.owner.y + Math.sin(playerAngle) * leadDist + Math.sin(targetAngle) * DRONE_FOLLOW_DISTANCE; this.targetPos.x = baseTargetX + this.noiseOffsetX; this.targetPos.y = baseTargetY + this.noiseOffsetY; let steeringX = 0; let steeringY = 0; const seekDx = this.targetPos.x - this.x; const seekDy = this.targetPos.y - this.y; const seekDist = Math.sqrt(seekDx*seekDx + seekDy*seekDy); if (seekDist > 0.1) { const seekNorm = normalizeVector(seekDx, seekDy); const seekForceScale = Math.min(1.0, seekDist / (TILE_SIZE * 2)); steeringX += seekNorm.x * 1.5 * seekForceScale; steeringY += seekNorm.y * 1.5 * seekForceScale; }
        allDrones.forEach(otherDrone => { if (otherDrone !== this) { const distSq = distance(this.x, this.y, otherDrone.x, otherDrone.y)**2; if (distSq > 0 && distSq < (DRONE_SEPARATION_DISTANCE ** 2)) { const pushDx = this.x - otherDrone.x; const pushDy = this.y - otherDrone.y; const pushNorm = normalizeVector(pushDx, pushDy); const pushStrength = (DRONE_SEPARATION_DISTANCE**2 / distSq) * 1.2; steeringX += pushNorm.x * pushStrength; steeringY += pushNorm.y * pushStrength; } } }); const distPlayerSq = distance(this.x, this.y, this.owner.x, this.owner.y)**2; if (distPlayerSq > 0 && distPlayerSq < (DRONE_FOLLOW_DISTANCE * 0.5)**2) { const pushDx = this.x - this.owner.x; const pushDy = this.y - this.owner.y; const pushNorm = normalizeVector(pushDx, pushDy); steeringX += pushNorm.x * 0.5; steeringY += pushNorm.y * 0.5; }
        const steeringNorm = normalizeVector(steeringX, steeringY); this.vx += steeringNorm.x * DRONE_SPEED * DRONE_ACCELERATION_FACTOR * effectiveDt; this.vy += steeringNorm.y * DRONE_SPEED * DRONE_ACCELERATION_FACTOR * effectiveDt; const dampingFactor = 1.0 - (0.15 * effectiveDt / (1/60)); this.vx *= Math.max(0, dampingFactor); this.vy *= Math.max(0, dampingFactor); const currentSpeed = Math.sqrt(this.vx**2 + this.vy**2); if (currentSpeed > DRONE_SPEED) { const scale = DRONE_SPEED / currentSpeed; this.vx *= scale; this.vy *= scale; } this.x += this.vx * effectiveDt; this.y += this.vy * effectiveDt;
        if (this.fireCooldown > 0) this.fireCooldown -= effectiveDt * 1000; if (this.switchTargetCooldownTimer > 0) this.switchTargetCooldownTimer -= effectiveDt * 1000; let closestDistSq = DRONE_TARGETING_RANGE * DRONE_TARGETING_RANGE; let potentialTarget = null; zombies.forEach(zombie => { if (zombie.hp <= 0) return; const distSq = distance(this.x, this.y, zombie.x, zombie.y) ** 2; if (distSq < closestDistSq) { const targetTileX = Math.floor(zombie.x / TILE_SIZE); const targetTileY = Math.floor(zombie.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[targetTileY]?.[targetTileX] === FOG_STATE.REVEALED && hasLineOfSight(this.x, this.y, zombie.x, zombie.y, isWallFunc)) { closestDistSq = distSq; potentialTarget = zombie; } } }); if (potentialTarget !== this.target && potentialTarget !== null) { const currentTargetDistSq = this.target ? distance(this.x, this.y, this.target.x, this.target.y)**2 : Infinity; if (!this.target || this.target.hp <= 0 || closestDistSq < currentTargetDistSq * 0.7) { this.switchTargetCooldownTimer = DRONE_SWITCH_TARGET_COOLDOWN; this.target = potentialTarget; } } else if (this.target && this.target.hp <= 0) { this.target = potentialTarget; } else if (!this.target){ this.target = potentialTarget; }
        if (this.target && this.fireCooldown <= 0 && this.switchTargetCooldownTimer <= 0) { const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x); projectiles_ref.push(new Projectile( this.x, this.y, targetAngle, DRONE_PROJECTILE_DAMAGE, DRONE_PROJECTILE_SPEED, 0, 0, DRONE_PROJECTILE_LENGTH, DRONE_PROJECTILE_WIDTH, true )); this.fireCooldown = 1000 / DRONE_FIRE_RATE; } this.previousTarget = this.target; }
    draw(ctx, offsetX, offsetY) { const ownerGridX = Math.floor(this.owner.x / TILE_SIZE); const ownerGridY = Math.floor(this.owner.y / TILE_SIZE); const selfGridX = Math.floor(this.x / TILE_SIZE); const selfGridY = Math.floor(this.y / TILE_SIZE); if (typeof level !== 'undefined' && level.fogGrid?.[ownerGridY]?.[ownerGridX] !== FOG_STATE.REVEALED && level.fogGrid?.[selfGridY]?.[selfGridX] !== FOG_STATE.REVEALED ) { return; } ctx.fillStyle = 'lightblue'; ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x - offsetX, this.y - offsetY, PLAYER_SIZE * DRONE_SIZE_MULTIPLIER, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

// --- Player Class (Updated for Psion & Recon) ---
class Player {
    constructor(x, y, classData) {
        this.x = x; this.y = y; this.radius = PLAYER_SIZE / 2; this.classData = classData;
        this.hp = classData.hp; this.maxHp = classData.hp; this.speedMultiplier = classData.speedMultiplier;
        this.speedWalk = BASE_PLAYER_SPEED_WALK * this.speedMultiplier; this.speedRun = BASE_PLAYER_SPEED_RUN * this.speedMultiplier;
        this.speed = this.speedWalk; this.angle = 0; this.vx = 0; this.vy = 0; this.isMoving = false; this.isRunning = false;
        this.currentWeaponIndex = weapons.findIndex(w => w.id === classData.weaponId); if (this.currentWeaponIndex === -1) { this.currentWeaponIndex = 0; }
        this.currentWeapon = weapons[this.currentWeaponIndex]; this.ammo = this.currentWeapon.magSize; this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0;
        this.spread = this.currentWeapon.spreadStand; this.abilityType = classData.ability.type; this.abilityCooldown = classData.ability.cooldown || 0; // Default cooldown if not defined
        this.abilityUsesTotal = classData.ability.uses !== undefined ? classData.ability.uses : Infinity; this.abilityUsesLeft = this.abilityUsesTotal; this.abilityDuration = classData.ability.duration || 0;
        this.isDashing = false; this.dashTimer = 0;
        this.isBulletTimeActive = false; this.bulletTimeTimer = 0;
        this.passiveType = classData.passive ? classData.passive.type : null; this.drones = []; if (this.passiveType === 'drone' && this.classData.id === CLASS_ID.RECON) { for (let i = 0; i < 3; i++) { this.drones.push(new Drone(this, i)); } }
        this.active = true; this.isInvincible = false; this.lastAfterimageTime = 0;

        // --- Psion Specific ---
        this.isPsion = (this.classData.id === CLASS_ID.PSION);
        this.shieldHp = this.isPsion ? PSION_SHIELD_HP : 0;
        this.maxShieldHp = this.isPsion ? PSION_SHIELD_HP : 0;
        this.shieldRegenTimer = 0;
        this.lastDamageTime = -Infinity;
        this.lastShieldDepletedTime = -Infinity; // <<< Track when shield hit 0
        this.lastPsiBladeAttackTime = 0;
        this.attackedThisClick = false;
        this.isCastingPsiBlast = false;
        this.psiBlastCastTimer = 0;
        this.psiBlastStoredParticleCount = 0;
        this.psiBlastStoredDamagePerParticle = 0;
        this.psiBlastStoredStunDuration = 0;
        this.psiBlastStoredLifespan = 0;
        this.psiBlastStoredBaseRadius = 0;

        // --- Recon Specific ---
        this.isRecon = (this.classData.id === CLASS_ID.RECON);
        this.abilityCharges = this.isRecon ? classData.ability.maxUses : this.abilityUsesLeft; // Start with full charges if Recon
        this.abilityMaxCharges = this.isRecon ? classData.ability.maxUses : this.abilityUsesTotal;
        this.abilityRechargeTime = this.isRecon ? classData.ability.rechargeTime : 0;
        this.abilityRechargeTimer = this.isRecon ? this.abilityRechargeTime : 0; // Start fully charged or ready
        this.abilityCooldownTimer = this.isRecon ? 0 : (classData.ability.cooldown || 0); // Recon uses charges, others use cooldown

        // Ensure initial state is correct for Recon
        if (this.isRecon) {
            this.abilityUsesLeft = this.abilityCharges; // Sync uses left with charges
            this.abilityUsesTotal = this.abilityMaxCharges;
        }
    }

    update(effectiveDt, input, camera, isSolidFunc, isWallFunc, projectiles_ref, grenades_ref, rpgProjectiles_ref, psiBlastParticles_ref, psiBladeEffects_ref, zombies_ref, mercenaries_ref, flameParticles_ref) {
        if (!this.active) return;

        const now = performance.now();

        // --- Update Timers ---
        if (!this.isRecon && this.abilityCooldownTimer > 0) { // Cooldown for non-Recon
            this.abilityCooldownTimer -= effectiveDt * 1000;
        }

        // --- Recon Dash Charge Recharge ---
        if (this.isRecon) {
            if (this.abilityCharges < this.abilityMaxCharges) {
                this.abilityRechargeTimer -= effectiveDt * 1000;
                if (this.abilityRechargeTimer <= 0) {
                    this.abilityCharges++;
                    this.abilityUsesLeft = this.abilityCharges; // Keep usesLeft synced
                    console.log(`Recon Dash Charge +1 (Now ${this.abilityCharges})`);
                    // If not at max charges, start timer for next charge
                    if (this.abilityCharges < this.abilityMaxCharges) {
                        this.abilityRechargeTimer = this.abilityRechargeTime;
                    }
                }
            }
        }

        // --- Psion Shield Regeneration ---
        if (this.isPsion) {
            const baseDelay = PSION_SHIELD_REGEN_DELAY;
            // Add extra delay if shield was fully depleted recently
            const extraDelay = (this.shieldHp <= 0.1 && now - this.lastShieldDepletedTime < baseDelay + PSION_SHIELD_REGEN_DELAY_ZERO + 100 /* add buffer */ ) ? PSION_SHIELD_REGEN_DELAY_ZERO : 0;
            const requiredDelay = baseDelay + extraDelay;

            if (now - this.lastDamageTime >= requiredDelay) {
                 const regenAmount = PSION_SHIELD_REGEN_RATE * effectiveDt;
                 this.shieldHp = Math.min(this.maxShieldHp, this.shieldHp + regenAmount);
            }
        }

        // --- Psi Blast Cast Delay ---
        if (this.isCastingPsiBlast) {
            this.psiBlastCastTimer -= effectiveDt * 1000;
            if (this.psiBlastCastTimer <= 0) {
                this.activatePsiBlast(
                    psiBlastParticles_ref,
                    this.psiBlastStoredParticleCount,
                    this.psiBlastStoredDamagePerParticle,
                    this.psiBlastStoredBaseRadius,
                    this.psiBlastStoredLifespan,
                    this.psiBlastStoredStunDuration
                );
                this.isCastingPsiBlast = false;
            }
        }


        // --- Bullet Time Update ---
        if (this.isBulletTimeActive) {
            this.bulletTimeTimer -= effectiveDt * 1000;
            if (this.bulletTimeTimer <= 0) {
                this.isBulletTimeActive = false;
                gameTimeScale = NORMAL_TIME_SCALE;
            }
        }

        // --- Dash Update ---
        this.isInvincible = false;
        if (this.isDashing) {
            this.isInvincible = true;
            this.dashTimer -= effectiveDt * 1000;
            if (now - this.lastAfterimageTime > PLAYER_DASH_AFTERIMAGE_INTERVAL) {
                 afterimages.push(new Afterimage(this.x, this.y, this.angle, this.radius, this.classData.color));
                 this.lastAfterimageTime = now;
            }
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.isInvincible = false;
                this.speed = this.isRunning ? this.speedRun : this.speedWalk;
            }
        }

        // --- Movement ---
        this.isRunning = input.shift && !this.isDashing;
        this.speed = this.isDashing ? this.speedRun * PLAYER_DASH_SPEED_FACTOR : (this.isRunning ? this.speedRun : this.speedWalk);
        let moveX = 0; let moveY = 0; if (input.w) moveY -= 1; if (input.s) moveY += 1; if (input.a) moveX -= 1; if (input.d) moveX += 1; this.isMoving = (moveX !== 0 || moveY !== 0); this.spread = this.isMoving ? (this.isRunning ? this.currentWeapon.spreadRun : this.currentWeapon.spreadWalk) : this.currentWeapon.spreadStand; const moveMagnitude = Math.sqrt(moveX * moveX + moveY * moveY); if (moveMagnitude > 0) { moveX /= moveMagnitude; moveY /= moveMagnitude; }
        this.vx = moveX * this.speed;
        this.vy = moveY * this.speed;

        let nextX = this.x + this.vx * effectiveDt;
        let nextY = this.y + this.vy * effectiveDt;

        let canMoveX = !checkWallCollision(nextX, this.y, this.radius);
        let canMoveY = !checkWallCollision(this.x, nextY, this.radius);
        if (canMoveX) { this.x = nextX; } else { this.vx = 0; }
        if (canMoveY) { this.y = nextY; } else { this.vy = 0; }
        if (!canMoveX && !canMoveY) {
            nextX = this.x + this.vx * effectiveDt;
            nextY = this.y + this.vy * effectiveDt;
            if (!checkWallCollision(nextX, this.y, this.radius)) this.x = nextX;
            else if (!checkWallCollision(this.x, nextY, this.radius)) this.y = nextY;
        }

        // --- Aiming ---
        const canvasRect = canvas.getBoundingClientRect(); const mouseGameX = input.mouseX - canvasRect.left + camera.x; const mouseGameY = input.mouseY - canvasRect.top + camera.y; this.angle = Math.atan2(mouseGameY - this.y, mouseGameX - this.x);

        // --- Reloading ---
        if (this.currentWeapon.id !== WEAPON_ID.PSI_BLADES) {
            if (this.reloading) {
                this.reloadTimer += effectiveDt * 1000;
                if (this.reloadTimer >= this.currentWeapon.reloadTime) {
                    this.reloading = false;
                    this.ammo = this.currentWeapon.magSize;
                }
            } else {
                if (input.r && this.ammo < this.currentWeapon.magSize) { this.startReload(); }
                if (this.ammo <= 0 && !this.reloading) { this.startReload(); }
            }
        }


        // --- Firing ---
        const fireInterval = 60000 / this.currentWeapon.rpm;
        this.fireTimer -= effectiveDt * 1000;

        if (this.currentWeapon.id === WEAPON_ID.PSI_BLADES) {
            if (input.mouseDown && !this.attackedThisClick && now - this.lastPsiBladeAttackTime >= PSI_BLADE_MIN_ATTACK_INTERVAL) {
                this.shootPsiBlade(psiBladeEffects_ref, zombies_ref);
                this.lastPsiBladeAttackTime = now;
                this.attackedThisClick = true;
            }
        } else {
             const canShoot = (this.currentWeapon.auto && input.mouseDown) || (!this.currentWeapon.auto && input.mouseDown && this.fireTimer <= -fireInterval * 0.5);
            if (canShoot && !this.reloading && this.ammo > 0 && this.fireTimer <= 0) {
                if (this.currentWeapon.isRaycast) this.shootRaycast(zombies_ref, isWallFunc);
                else this.shootProjectile(projectiles_ref, flameParticles_ref, isWallFunc);

                this.fireTimer = fireInterval;
                this.ammo--;
                if (this.ammo <= 0 && !this.reloading) this.startReload();
                if (!this.currentWeapon.auto) input.mouseDown = false;
            }
        }

        // --- Ability Use ---
        // General condition: space pressed, not reloading, not casting psi blast
        let canUseAbility = input.space && !this.reloading && !this.isCastingPsiBlast;

        // Class-specific condition
        if (this.isRecon) {
             canUseAbility = canUseAbility && this.abilityCharges > 0;
        } else if (this.isPsion) {
            canUseAbility = canUseAbility && this.shieldHp >= PSI_BLAST_MIN_SHIELD_COST && this.abilityCooldownTimer <= 0;
        } else { // Other classes (Marine, Demo, Brawler)
            canUseAbility = canUseAbility && this.abilityUsesLeft > 0 && this.abilityCooldownTimer <= 0;
        }

        if (canUseAbility) {
            this.useAbility(grenades_ref, rpgProjectiles_ref, psiBlastParticles_ref, this, zombies_ref, mercenaries_ref, this.drones);
             input.space = false;
        }

        // --- Update Drones ---
        this.drones.forEach(drone => drone.update(effectiveDt, zombies_ref, isWallFunc, projectiles_ref, this.drones));
    }

    startReload() { if (!this.reloading && this.ammo < this.currentWeapon.magSize && this.currentWeapon.id !== WEAPON_ID.PSI_BLADES) { this.reloading = true; this.reloadTimer = 0; this.fireTimer = 0; } }

    shootPsiBlade(psiBladeEffects_ref, zombies_ref) {
        psiBladeEffects_ref.push(new PsiBladeEffect(this.x, this.y, this.angle, PSI_BLADE_RANGE, PSI_BLADE_ARC_ANGLE)); // Use constant
        const startAngle = this.angle - PSI_BLADE_ARC_ANGLE / 2;
        const endAngle = this.angle + PSI_BLADE_ARC_ANGLE / 2;

        zombies_ref.forEach(zombie => {
            if (zombie.hp <= 0) return;
            const distSq = distance(this.x, this.y, zombie.x, zombie.y) ** 2;
            if (distSq <= (PSI_BLADE_RANGE + zombie.radius) ** 2) {
                const angleToZombie = Math.atan2(zombie.y - this.y, zombie.x - this.x);
                const angleDiffToCenter = angleDiff(this.angle, angleToZombie);
                if (Math.abs(angleDiffToCenter) <= PSI_BLADE_ARC_ANGLE / 2) {
                    zombie.takeDamage(PSI_BLADE_DAMAGE, 'psi_blade');
                }
            }
        });
    }

    // Modified activatePsiBlast to accept scaled parameters
    activatePsiBlast(psiBlastParticles_ref, particleCount, damagePerParticle, baseRadius, lifespan, stunDuration) {
        const angleIncrement = particleCount > 0 ? (Math.PI * 2) / particleCount : 0;
         for (let i = 0; i < particleCount; i++) {
             const angle = i * angleIncrement;
             psiBlastParticles_ref.push(new PsiBlastParticle(this.x, this.y, angle, damagePerParticle, baseRadius, lifespan, stunDuration));
         }
         shockwaves.push(new Shockwave(this.x, this.y, TILE_SIZE * 2.5 * (baseRadius / PSI_BLAST_MAX_BASE_RADIUS), 200)); // Scale shockwave radius
    }


    shootProjectile(projectiles_ref, flameParticlesRef, isWallFuncRef) {
        const weapon = this.currentWeapon;
        const barrelOffset = GUN_BARREL_OFFSET;
        const barrelStartX = this.x + Math.cos(this.angle) * barrelOffset;
        const barrelStartY = this.y + Math.sin(this.angle) * barrelOffset;

        if (weapon.id === WEAPON_ID.FLAMETHROWER) {
            const particlesToSpawn = weapon.particleCountPerShot || 1;
            for (let i = 0; i < particlesToSpawn; i++) {
                const shotAngle = this.angle + (Math.random() - 0.5) * this.spread;
                flameParticlesRef.push(new FlameParticle( barrelStartX, barrelStartY, shotAngle, weapon.particleSpeed, weapon.particleLifespan, weapon ));
            }
        } else {
            const pellets = weapon.pellets || 1;
            for (let i = 0; i < pellets; i++) {
                const shotAngle = this.angle + (Math.random() - 0.5) * this.spread;
                const damage = getRandomInt(weapon.damageMin, weapon.damageMax);
                let projSpeed = weapon.projectileSpeed;
                let projLength = PROJECTILE_LENGTH_DEFAULT;
                let projWidth = PROJECTILE_WIDTH_DEFAULT;
                const isShotgun = weapon.id === WEAPON_ID.AUTOSHOTGUN;
                if (isShotgun) { projSpeed *= (1 + (Math.random() - 0.5) * SHOTGUN_PELLET_SPEED_VARIATION); }
                if (weapon.id === WEAPON_ID.MACHINEGUN) { projLength = MG_PROJECTILE_LENGTH; }
                projectiles_ref.push(new Projectile(barrelStartX, barrelStartY, shotAngle, damage, projSpeed, weapon.penetration, weapon.ricochets, projLength, projWidth, false, isShotgun, weapon.id));
            }
        }
    }
    shootRaycast(zombies_ref, isWallFunc) { const weapon = this.currentWeapon; const angle = this.angle + (Math.random() - 0.5) * this.spread; const damage = getRandomInt(weapon.damageMin, weapon.damageMax); const rayDx = Math.cos(angle); const rayDy = Math.sin(angle); const maxRange = canvas.width * 2; let hitPoint = { x: this.x + rayDx * maxRange, y: this.y + rayDy * maxRange }; let rayDist = maxRange; const step = TILE_SIZE / 4; for (let d = TILE_SIZE*0.5; d < maxRange; d += step) { const checkX = this.x + rayDx * d; const checkY = this.y + rayDy * d; const gridX = Math.floor(checkX / TILE_SIZE); const gridY = Math.floor(checkY / TILE_SIZE); if (isWallFunc(gridX, gridY)) { hitPoint = { x: checkX, y: checkY }; rayDist = d; break; } } zombies_ref.forEach(zombie => { if (zombie.hp <= 0) return; const vecToZombieX = zombie.x - this.x; const vecToZombieY = zombie.y - this.y; const projLen = dotProduct(vecToZombieX, vecToZombieY, rayDx, rayDy); if(projLen < 0 || projLen > rayDist) return; const closestPointX = this.x + rayDx * projLen; const closestPointY = this.y + rayDy * projLen; const distToRaySq = distance(zombie.x, zombie.y, closestPointX, closestPointY) ** 2; if (distToRaySq < (zombie.radius + RAILGUN_WIDTH/2)**2) { zombie.takeDamage(damage, 'railgun'); } }); const beamLength = distance(this.x, this.y, hitPoint.x, hitPoint.y); const numParticles = Math.max(5, Math.floor(beamLength / (TILE_SIZE * 0.5))); const particlePositions = []; for (let i = 0; i < numParticles; i++) { const fraction = i / Math.max(1, numParticles -1); particlePositions.push({ x: this.x + rayDx * beamLength * fraction, y: this.y + rayDy * beamLength * fraction }); }
        railgunEffects.push({ startX: this.x, startY: this.y, endX: hitPoint.x, endY: hitPoint.y, timer: RAILGUN_EFFECT_DURATION, particlesSpawned: false, particlePositions: particlePositions });
    }
    switchWeapon(index) { if(index >= 0 && index < weapons.length && index !== this.currentWeaponIndex) { this.currentWeaponIndex = index; this.currentWeapon = weapons[this.currentWeaponIndex]; this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0; this.ammo = this.currentWeapon.magSize; this.spread = this.currentWeapon.spreadStand; } }

    // --- MODIFIED: useAbility to handle Recon charges and Psion Blast logic ---
    useAbility(grenades_ref, rpgProjectiles_ref, psiBlastParticles_ref, player_ref, zombies_ref, mercenaries_ref, drones_ref) {
        let abilityUsed = false;
        switch (this.abilityType) {
            case 'dash': // Could be Recon or another class with dash
                if (this.isRecon) {
                    if (this.abilityCharges > 0) {
                        this.isDashing = true;
                        this.dashTimer = this.abilityDuration;
                        this.lastAfterimageTime = 0;
                        this.abilityCharges--;
                        this.abilityUsesLeft = this.abilityCharges; // Sync uses
                        // Start recharge timer only if it wasn't already running
                        if (this.abilityCharges === this.abilityMaxCharges - 1) {
                            this.abilityRechargeTimer = this.abilityRechargeTime;
                        }
                        abilityUsed = true;
                    }
                } else { // Standard cooldown dash (if any other class gets it)
                    if (this.abilityCooldownTimer <= 0 && this.abilityUsesLeft > 0) {
                        this.isDashing = true;
                        this.dashTimer = this.abilityDuration;
                        this.lastAfterimageTime = 0;
                        abilityUsed = true;
                    }
                }
                break;
            case 'grenade':
                if (this.abilityUsesLeft > 0 && this.abilityCooldownTimer <= 0){
                    this.throwGrenade(grenades_ref);
                    abilityUsed = true;
                }
                break;
            case 'rpg':
                 if (this.abilityUsesLeft > 0 && this.abilityCooldownTimer <= 0){
                    const rpgAngle = this.angle;
                    const barrelOffsetRPG = GUN_BARREL_OFFSET;
                    const rpgStartX = this.x + Math.cos(rpgAngle) * barrelOffsetRPG;
                    const rpgStartY = this.y + Math.sin(rpgAngle) * barrelOffsetRPG;
                    rpgProjectiles_ref.push(new RPGProjectile(rpgStartX, rpgStartY, rpgAngle));
                    abilityUsed = true;
                 }
                break;
            case 'bullet_time':
                if (!this.isBulletTimeActive && this.abilityCooldownTimer <= 0) {
                    this.isBulletTimeActive = true;
                    this.bulletTimeTimer = this.abilityDuration;
                    gameTimeScale = BULLET_TIME_SCALE;
                    abilityUsed = true;
                }
                break;
            case 'psi_blast':
                 if (this.shieldHp >= PSI_BLAST_MIN_SHIELD_COST && !this.isCastingPsiBlast && this.abilityCooldownTimer <= 0) { // Check min shield and cooldown
                    this.isCastingPsiBlast = true;
                    this.psiBlastCastTimer = PSI_BLAST_CAST_DELAY;

                    const consumedShield = this.shieldHp;
                    this.shieldHp = 0;
                    this.lastShieldDepletedTime = performance.now(); // Track depletion time

                    const shieldFraction = this.maxShieldHp > 0 ? Math.max(0, Math.min(1, consumedShield / this.maxShieldHp)) : 0;

                    // Calculate and store dynamic parameters
                    this.psiBlastStoredParticleCount = Math.round(lerp(PSI_BLAST_MIN_PARTICLES, PSI_BLAST_MAX_PARTICLES, shieldFraction));
                    // New damage formula
                    this.psiBlastStoredDamagePerParticle = (consumedShield + 10) / 2;
                    this.psiBlastStoredBaseRadius = lerp(PSI_BLAST_MAX_BASE_RADIUS * 0.5, PSI_BLAST_MAX_BASE_RADIUS, shieldFraction);
                    this.psiBlastStoredLifespan = lerp(PSI_BLAST_MAX_LIFESPAN * 0.5, PSI_BLAST_MAX_LIFESPAN, shieldFraction);
                    this.psiBlastStoredStunDuration = lerp(0, PSI_BLAST_MAX_STUN_DURATION, shieldFraction);

                    abilityUsed = true;
                 }
                 break;
        }
        // Consume uses/charges and apply cooldown if ability was successfully used
        if (abilityUsed) {
             if (!this.isRecon && this.abilityUsesTotal !== Infinity) { // Recon charges handled above
                  this.abilityUsesLeft--;
             }
             if (this.abilityCooldown > 0) { // Apply cooldown if it exists
                 this.abilityCooldownTimer = this.abilityCooldown;
             }
        }
    }
    throwGrenade(grenades_ref) { const barrelOffset = GUN_BARREL_OFFSET; const startX = this.x + Math.cos(this.angle) * barrelOffset * 1.5; const startY = this.y + Math.sin(this.angle) * barrelOffset * 1.5; grenades_ref.push(new Grenade(startX, startY, this.angle)); }

    takeDamage(amount, sourceType = 'unknown') {
        if (!this.active || gameOver || this.isInvincible) return;

        const previousShield = this.shieldHp; // Store shield before taking damage

        this.lastDamageTime = performance.now(); // Reset shield regen timer regardless of hit type

        if (this.classData.id === CLASS_ID.DEMOLISHER && (sourceType === 'explosion' || sourceType === 'explosion_particle' || sourceType === 'flame')) {
             amount *= 0.5;
        }

        if (this.isPsion && this.shieldHp > 0) {
            const damageToShield = Math.min(amount, this.shieldHp);
            this.shieldHp -= damageToShield;
            amount -= damageToShield;
        }

        if (amount > 0) {
            this.hp -= amount;
            if (this.hp <= 0) {
                this.hp = 0;
                this.active = false;
                gameOver = true;
                console.log("Player HP reached 0, setting gameOver flag.");
                gameTimeScale = NORMAL_TIME_SCALE;
            }
        }

        // Check if shield was depleted by this hit
        if (this.isPsion && previousShield > 0 && this.shieldHp <= 0) {
             this.lastShieldDepletedTime = this.lastDamageTime; // Record the time shield hit 0
        }
    }

    draw(ctx, offsetX, offsetY) {
        if(!this.active) return;

        ctx.save();
        ctx.translate(this.x - offsetX, this.y - offsetY);

        if (this.isPsion && this.shieldHp > 0) {
            const shieldAlpha = Math.min(0.8, 0.2 + (this.shieldHp / this.maxShieldHp) * 0.6);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(170, 100, 255, ${shieldAlpha})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(220, 180, 255, ${shieldAlpha * 1.1})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.rotate(this.angle);
        ctx.fillStyle = this.classData.color || 'blue';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.currentWeapon.id !== WEAPON_ID.PSI_BLADES) {
            ctx.fillStyle = 'white';
            const barrelOffset = GUN_BARREL_OFFSET;
            ctx.fillRect(this.radius * 0.5, -2, barrelOffset, 4);
        } else {
            ctx.fillStyle = 'rgba(200, 150, 255, 0.9)';
            const bladeLength = this.radius * 1.2;
            const bladeWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.radius * 0.5, -bladeWidth/2);
            ctx.lineTo(bladeLength, 0);
            ctx.lineTo(this.radius * 0.5, bladeWidth/2);
            ctx.closePath();
            ctx.fill();
        }

        if (this.isCastingPsiBlast) {
            const castProgress = 1 - (this.psiBlastCastTimer / PSI_BLAST_CAST_DELAY);
            const indicatorRadius = this.radius * (1 + castProgress * 0.5);
            const indicatorAlpha = 0.3 + castProgress * 0.4;
            ctx.rotate(-this.angle); // Counter-rotate
            ctx.beginPath();
            ctx.arc(0, 0, indicatorRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 255, ${indicatorAlpha})`;
            ctx.lineWidth = 2 + castProgress * 2;
            ctx.stroke();
        }

        ctx.restore();

        if (this.currentWeapon.id !== WEAPON_ID.PSI_BLADES && this.reloading) {
            ctx.fillStyle = 'yellow';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("Reloading...", this.x - offsetX, this.y - offsetY - this.radius - 15);
            ctx.textAlign = 'left';
        }
    }
}