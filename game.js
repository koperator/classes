// --- Game Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game State Enum ---
const GameState = { CharacterSelection: 'CharSelect', Initializing: 'Init', Playing: 'Playing', GameOver: 'Over', GameWon: 'Won' };
let gameState = GameState.CharacterSelection;

// --- Core Game State Variables ---
let player = null; let zombies = []; let projectiles = []; let grenades = []; let grenadeParticles = []; let rpgProjectiles = []; let explosionParticles = []; let smokeParticles = []; let railgunEffects = []; let mercenaries = [];
let railgunParticles = [];
let flameParticles = [];
let wallSparkParticles = [];
let flashParticles = [];
let shockwaves = [];
let afterimages = [];
let psiBlastParticles = [];
let psiBladeEffects = [];

let level = { grid: [], fogGrid: [], width: 0, height: 0, startX: 0, startY: 0, endX: 0, endY: 0, entrances: [], pathfinderGrid: null, finder: new PF.AStarFinder({ allowDiagonal: true, dontCrossCorners: true }) };
let camera = { x: 0, y: 0 }; let input = { w: false, a: false, s: false, d: false, shift: false, r: false, space: false, mouseDown: false, mouseX: 0, mouseY: 0, keys: {} };
let lastTime = 0; let deltaTime = 0; let lastZombieSpawnTime = 0; let gameStartTime = 0; let elapsedTime = 0;
let gameOver = false; let gameWon = false; let selectionBoxes = []; let hoveredClassIndex = -1; let kills = 0;
let lastAfterimageTime = 0;
let gameTimeScale = NORMAL_TIME_SCALE;

// --- Game Loop ---
function gameLoop(timestamp) {
    if (!lastTime) { lastTime = timestamp; }
    deltaTime = (timestamp - lastTime) / 1000;
    deltaTime = Math.min(deltaTime, 0.1);
    lastTime = timestamp;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    switch (gameState) {
        case GameState.CharacterSelection:
            updateCharacterSelection();
            drawCharacterSelection();
            break;
        case GameState.Initializing:
            ctx.fillStyle = 'white';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("Initializing...", canvas.width / 2, canvas.height / 2);
            ctx.textAlign = 'left';
            break;
        case GameState.Playing:
            updatePlaying(deltaTime);
            drawPlaying();
            drawUI();
            break;
        case GameState.GameOver:
            gameTimeScale = NORMAL_TIME_SCALE;
            drawPlaying();
            drawGameOver();
            break;
        case GameState.GameWon:
             gameTimeScale = NORMAL_TIME_SCALE;
            drawPlaying();
            drawGameWon();
            break;
    }
    requestAnimationFrame(gameLoop);
}

// --- Update Functions per State ---
function updateCharacterSelection() {
    hoveredClassIndex = -1;
    const rect = canvas.getBoundingClientRect();
    const mouseCanvasX = input.mouseX - rect.left;
    const mouseCanvasY = input.mouseY - rect.top;
    for(const box of selectionBoxes) {
        if (mouseCanvasX >= box.rect.x && mouseCanvasX <= box.rect.x + box.rect.w &&
            mouseCanvasY >= box.rect.y && mouseCanvasY <= box.rect.y + box.rect.h) {
            hoveredClassIndex = box.classIndex;
            break;
        }
    }
}

function updatePlaying(dt) {
    if(gameOver) { if(gameState !== GameState.GameOver) { gameState = GameState.GameOver; } return; }
    if(gameWon) { if(gameState !== GameState.GameWon) { gameState = GameState.GameWon; } return; }
    if (!player || !player.active) return;

    const effectiveDt = dt * gameTimeScale;

    const isWallFunc = (gx, gy) => isWall(gx, gy);
    const isSolidFunc = (gx, gy) => isSolidForPlayer(gx, gy);
    elapsedTime = (performance.now() - gameStartTime) / 1000;

    updateFogOfWar();

    player.update(effectiveDt, input, camera, isSolidFunc, isWallFunc, projectiles, grenades, rpgProjectiles, psiBlastParticles, psiBladeEffects, zombies, mercenaries, flameParticles);
    mercenaries.forEach(m => m.update(effectiveDt, player, zombies, mercenaries, isWallFunc, level.pathfinderGrid, level.finder, projectiles));

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update(effectiveDt, isWallFunc, zombies);
        if (p.hitWallThisFrame && p.weaponId === WEAPON_ID.MACHINEGUN) {
            for (let j = 0; j < MG_WALL_SPARK_COUNT; j++) {
                const sparkAngle = p.wallHitAngle + Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
                const sparkSpeed = getRandomInt(MG_WALL_SPARK_SPEED_MIN, MG_WALL_SPARK_SPEED_MAX);
                wallSparkParticles.push(new WallSparkParticle(p.wallHitX, p.wallHitY, sparkAngle, sparkSpeed));
            }
        }
    }

    for (let i = flameParticles.length - 1; i >= 0; i--) {
        const p = flameParticles[i];
        p.update(effectiveDt, isWallFunc, zombies);
        if (p.hitWall && p.ownerWeapon) {
            for (let j = 0; j < p.ownerWeapon.wallHitParticleCount; j++) {
                const burstAngle = Math.random() * Math.PI * 2;
                const burstSpeed = p.ownerWeapon.particleSpeed * 0.4 * (0.5 + Math.random());
                const burstLifespan = p.ownerWeapon.wallHitAOELifespan * (0.7 + Math.random());
                flameParticles.push(new FlameParticle(p.wallHitX, p.wallHitY, burstAngle, burstSpeed, burstLifespan, p.ownerWeapon, true));
            }
            p.active = false;
        }
        if (!p.active) { flameParticles.splice(i, 1); }
    }

    grenades.forEach(g => { g.update(effectiveDt, isWallFunc); });
    grenadeParticles.forEach(p => p.update(effectiveDt, isWallFunc, zombies, player, mercenaries));
    rpgProjectiles.forEach(r => { r.update(effectiveDt, isWallFunc, zombies, player, mercenaries); });
    explosionParticles.forEach(p => p.update(effectiveDt, isWallFunc, zombies, player, mercenaries));
    smokeParticles.forEach(p => p.update(effectiveDt));
    wallSparkParticles.forEach(p => p.update(effectiveDt, isWallFunc));
    flashParticles.forEach(p => p.update(effectiveDt));
    psiBlastParticles.forEach(p => p.update(effectiveDt, isWallFunc, zombies));
    psiBladeEffects.forEach(e => e.update(effectiveDt));
    railgunParticles.forEach(p => p.update(effectiveDt));
    shockwaves.forEach(s => s.update(effectiveDt));
    afterimages.forEach(a => a.update(effectiveDt));
    zombies.forEach(z => z.update(effectiveDt, player, mercenaries, level.pathfinderGrid, level.finder, isWallFunc, zombies));

    railgunEffects.forEach(effect => {
        effect.timer -= effectiveDt * 1000;
        if (!effect.particlesSpawned && effect.timer <= RAILGUN_EFFECT_DURATION - RAILGUN_PARTICLE_SPAWN_DELAY) {
            effect.particlePositions.forEach(pos => { railgunParticles.push(new RailgunParticle(pos.x, pos.y)); });
            effect.particlesSpawned = true;
        }
    });

    railgunEffects = railgunEffects.filter(effect => effect.timer > 0);
    projectiles = projectiles.filter(p => p.active);
    smokeParticles = smokeParticles.filter(p => p.active);
    railgunParticles = railgunParticles.filter(p => p.active);
    flameParticles = flameParticles.filter(p => p.active);
    wallSparkParticles = wallSparkParticles.filter(p => p.active);
    grenades = grenades.filter(g => g.active);
    flashParticles = flashParticles.filter(p => p.active);
    grenadeParticles = grenadeParticles.filter(p => p.active);
    rpgProjectiles = rpgProjectiles.filter(r => r.active);
    explosionParticles = explosionParticles.filter(p => p.active);
    psiBlastParticles = psiBlastParticles.filter(p => p.active);
    psiBladeEffects = psiBladeEffects.filter(e => e.active);
    shockwaves = shockwaves.filter(s => s.active);
    afterimages = afterimages.filter(a => a.active);
    zombies = zombies.filter(z => z.hp > 0);
    mercenaries = mercenaries.filter(m => m.active);

    spawnZombies();

    camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(level.width * TILE_SIZE - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(level.height * TILE_SIZE - canvas.height, camera.y));

    if (!gameWon && level.endX > 0) { const playerGridX = Math.floor(player.x / TILE_SIZE); const playerGridY = Math.floor(player.y / TILE_SIZE); const endGridX = Math.floor(level.endX / TILE_SIZE); const endGridY = Math.floor(level.endY / TILE_SIZE); if (playerGridX === endGridX && playerGridY === endGridY) { gameWon = true; console.log("You reached the end!"); gameTimeScale = NORMAL_TIME_SCALE; } }
}


// --- Drawing Functions per State ---
function drawCharacterSelection() {
    selectionBoxes = [];
    const boxWidth = 300;
    const boxHeight = 400;
    const spacing = 40;
    const totalWidth = (classes.length * boxWidth) + ((classes.length - 1) * spacing);
    const startX = (canvas.width - totalWidth) / 2;
    const startY = canvas.height / 2 - boxHeight / 2;

    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Choose your Class (Press 1-${classes.length} or Click)`, canvas.width / 2, startY - 80);

    classes.forEach((cls, index) => {
        const boxX = startX + index * (boxWidth + spacing);
        const boxY = startY;
        selectionBoxes.push({ classIndex: index, rect: { x: boxX, y: boxY, w: boxWidth, h: boxHeight } });
        ctx.strokeStyle = (hoveredClassIndex === index) ? 'yellow' : 'white';
        ctx.lineWidth = (hoveredClassIndex === index) ? 4 : 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        ctx.fillStyle = cls.color || 'grey';
        ctx.fillRect(boxX + 10, boxY + 10, boxWidth - 20, 50);
        ctx.fillStyle = 'white';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`(${index + 1}) ${cls.name}`, boxX + boxWidth / 2, boxY + 45);
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${cls.hp}`, boxX + 20, boxY + 90);
        if (cls.id === CLASS_ID.PSION) {
             ctx.fillText(`Shield: ${PSION_SHIELD_HP}`, boxX + 150, boxY + 90);
        }
        ctx.fillText(`Speed: ${Math.round(cls.speedMultiplier * 100)}%`, boxX + 20, boxY + 115);
        const weapon = weapons.find(w => w.id === cls.weaponId);
        ctx.fillText(`Weapon: ${weapon ? weapon.name : 'N/A'}`, boxX + 20, boxY + 140);
        let abilityName = cls.ability.type.replace('_', ' ');
        abilityName = abilityName.charAt(0).toUpperCase() + abilityName.slice(1);
        if (cls.id === CLASS_ID.BRAWLER) abilityName = 'Bullet Time';
        ctx.fillText(`Ability: ${abilityName}`, boxX + 20, boxY + 165);
        if (cls.passive) {
            let passiveName = cls.passive.type.replace('_', ' ');
            passiveName = passiveName.charAt(0).toUpperCase() + passiveName.slice(1);
            if (cls.id === CLASS_ID.RECON) passiveName = 'Drones (x3)';
            if (cls.id === CLASS_ID.DEMOLISHER) passiveName = 'Explosion Resist';
            if (cls.id === CLASS_ID.PSION) passiveName = 'Shield Regen & X-Ray'; // Updated passive name
            ctx.fillText(`Passive: ${passiveName}`, boxX + 20, boxY + 190);
        }
        ctx.font = '14px Arial';
        const descriptionLines = wrapText(ctx, cls.description, boxWidth - 40);
        descriptionLines.forEach((line, lineIndex) => { ctx.fillText(line, boxX + 20, boxY + 230 + lineIndex * 20); });
    });
     ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

function drawPlaying() {
     if (!player || !player.active) return;
     const camOffsetX = camera.x; const camOffsetY = camera.y;
     drawLevel(ctx, level, camOffsetX, camOffsetY);

     afterimages.forEach(a => a.draw(ctx, camOffsetX, camOffsetY));
     shockwaves.forEach(s => s.draw(ctx, camOffsetX, camOffsetY));
     smokeParticles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));
     explosionParticles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));
     flashParticles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));
     wallSparkParticles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));
     grenadeParticles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));
     railgunParticles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));

     ctx.globalCompositeOperation = 'lighter';
     psiBlastParticles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));
     psiBladeEffects.forEach(e => e.draw(ctx, camOffsetX, camOffsetY));
     flameParticles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));
     ctx.globalCompositeOperation = 'source-over';

     grenades.forEach(g => g.draw(ctx, camOffsetX, camOffsetY));
     rpgProjectiles.forEach(r => r.draw(ctx, camOffsetX, camOffsetY));
     projectiles.forEach(p => p.draw(ctx, camOffsetX, camOffsetY));

     // Pass player reference to zombie draw for X-Ray check
     zombies.forEach(z => z.draw(ctx, camOffsetX, camOffsetY, player));
     mercenaries.forEach(m => m.draw(ctx, camOffsetX, camOffsetY));

     railgunEffects.forEach(effect => {
         const startGridX = Math.floor(effect.startX / TILE_SIZE);
         const startGridY = Math.floor(effect.startY / TILE_SIZE);
         const endGridX = Math.floor(effect.endX / TILE_SIZE);
         const endGridY = Math.floor(effect.endY / TILE_SIZE);
         if (level.fogGrid?.[startGridY]?.[startGridX] === FOG_STATE.REVEALED || level.fogGrid?.[endGridY]?.[endGridX] === FOG_STATE.REVEALED) {
             if (effect.timer > RAILGUN_EFFECT_DURATION - RAILGUN_PARTICLE_SPAWN_DELAY * 1.5) {
                 const alpha = Math.min(1, effect.timer / (RAILGUN_EFFECT_DURATION * 0.5));
                 ctx.strokeStyle = RAILGUN_COLOR;
                 ctx.lineWidth = RAILGUN_WIDTH * alpha;
                 ctx.globalAlpha = alpha * 0.8;
                 ctx.beginPath();
                 ctx.moveTo(effect.startX - camOffsetX, effect.startY - camOffsetY);
                 ctx.lineTo(effect.endX - camOffsetX, effect.endY - camOffsetY);
                 ctx.stroke();
                 ctx.globalAlpha = 1.0;
             }
         }
     });

     player.draw(ctx, camOffsetX, camOffsetY);
     player.drones.forEach(drone => drone.draw(ctx, camOffsetX, camOffsetY));

     if (player.isBulletTimeActive) {
         ctx.fillStyle = 'rgba(0, 100, 255, 0.10)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
     }
}
function drawGameOver() { ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'red'; ctx.font = '90px Arial'; ctx.textAlign = 'center'; ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30); ctx.fillStyle = 'white'; ctx.font = '40px Arial'; ctx.fillText(`Kills: ${kills}`, canvas.width / 2, canvas.height / 2 + 40); ctx.font = '30px Arial'; ctx.fillText("Refresh (F5) to try again", canvas.width / 2, canvas.height / 2 + 90); ctx.textAlign = 'left'; }
function drawGameWon() { ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'lime'; ctx.font = '90px Arial'; ctx.textAlign = 'center'; ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2 - 30); ctx.fillStyle = 'white'; ctx.font = '40px Arial'; ctx.fillText(`Kills: ${kills}`, canvas.width / 2, canvas.height / 2 + 40); ctx.font = '30px Arial'; ctx.fillText("Refresh (F5) to play again", canvas.width / 2, canvas.height / 2 + 90); ctx.textAlign = 'left'; }

function drawUI() {
    if (!player || !player.active) return;

    const weapon = player.currentWeapon;
    const barHeight = 20;
    const hpBarWidth = 200;
    const hpBarX = 10;
    const hpBarY = canvas.height - barHeight - 10;

    // HP Bar
    ctx.fillStyle = 'red';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, barHeight);
    ctx.fillStyle = 'lime';
    const hpWidth = player.maxHp > 0 ? (player.hp / player.maxHp) * hpBarWidth : 0;
    ctx.fillRect(hpBarX, hpBarY, hpWidth > 0 ? hpWidth : 0, barHeight);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, barHeight);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, hpBarX + 5, hpBarY + barHeight - 5);

    // Shield Bar (Psion Only)
    let nextBarY = hpBarY;
    if (player.isPsion) {
        const shieldBarWidth = hpBarWidth * 0.8;
        const shieldBarX = hpBarX;
        const shieldBarY = hpBarY - barHeight - 5;
        nextBarY = shieldBarY;

        ctx.fillStyle = 'rgba(50, 50, 100, 0.8)';
        ctx.fillRect(shieldBarX, shieldBarY, shieldBarWidth, barHeight);
        ctx.fillStyle = 'rgba(170, 100, 255, 0.9)';
        const shieldWidth = player.maxShieldHp > 0 ? (player.shieldHp / player.maxShieldHp) * shieldBarWidth : 0;
        ctx.fillRect(shieldBarX, shieldBarY, shieldWidth > 0 ? shieldWidth : 0, barHeight);
        ctx.strokeStyle = 'rgba(220, 180, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(shieldBarX, shieldBarY, shieldBarWidth, barHeight);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`SH: ${Math.floor(player.shieldHp)}/${player.maxShieldHp}`, shieldBarX + 5, shieldBarY + barHeight - 5);
    }

    ctx.font = '20px Arial'; ctx.textAlign = 'right';

    // Ammo display (Hide for Psion)
    if (weapon.id !== WEAPON_ID.PSI_BLADES) {
        let ammoText = `Ammo: ${player.ammo} / ${weapon.magSize}`;
        let ammoColor = 'white';
        if (player.reloading) {
            const realReloadTimeLeft = Math.max(0, weapon.reloadTime - player.reloadTimer);
            ammoText = `Reloading... (${(realReloadTimeLeft / 1000).toFixed(1)}s)`;
            ammoColor = 'yellow';
        } else if (player.ammo <= 0 && !player.reloading) {
            ammoText = "RELOAD NEEDED"; ammoColor = 'orange';
        }
        ctx.fillStyle = ammoColor;
        ctx.fillText(ammoText, canvas.width - 15, canvas.height - 25);
        ctx.fillText(`Weapon: ${weapon.name}`, canvas.width - 15, canvas.height - 85);
    } else {
         ctx.fillText(`Weapon: ${weapon.name}`, canvas.width - 15, canvas.height - 85);
    }

    // Ability display
    let abilityName = player.abilityType.replace('_', ' ');
    abilityName = abilityName.charAt(0).toUpperCase() + abilityName.slice(1);
    if (player.classData.id === CLASS_ID.BRAWLER) abilityName = 'Bullet Time';
    let abilityText = `Ability [SPACE]: ${abilityName}`;
    let abilityColor = 'white';

    if (player.isRecon) { // <<< Recon Charge Display
        abilityText += ` [${player.abilityCharges}/${player.abilityMaxCharges}]`;
        if (player.abilityCharges < player.abilityMaxCharges && player.abilityRechargeTimer > 0) {
            abilityText += ` (Recharging ${(player.abilityRechargeTimer / 1000).toFixed(1)}s)`;
            abilityColor = 'yellow';
        } else if (player.abilityCharges === 0) {
            abilityText += " (EMPTY)";
            abilityColor = 'grey';
        } else {
             abilityColor = 'lime'; // Ready
        }
    } else if (player.isPsion) { // <<< Psion Ability Status
        if (player.abilityCooldownTimer > 0) {
            abilityText += ` (CD ${(player.abilityCooldownTimer / 1000).toFixed(1)}s)`;
            abilityColor = 'yellow';
        } else if (player.shieldHp < PSI_BLAST_MIN_SHIELD_COST) {
            abilityText += ` (Need ${PSI_BLAST_MIN_SHIELD_COST} Shield)`;
            abilityColor = 'grey';
        } else {
             abilityColor = 'lime'; // Ready
        }
        if (player.isCastingPsiBlast) {
            abilityText += " (Casting...)";
            abilityColor = 'yellow';
        }
    } else { // Other classes (uses/cooldown)
        if (player.abilityUsesTotal !== Infinity) { abilityText += ` [${player.abilityUsesLeft}/${player.abilityUsesTotal}]`; }
        if (player.abilityCooldownTimer > 0) {
            const realCooldownLeft = player.abilityCooldownTimer;
            abilityText += ` (CD ${(realCooldownLeft / 1000).toFixed(1)}s)`;
            abilityColor = 'yellow';
        } else if (player.abilityUsesLeft === 0 && player.abilityUsesTotal !== Infinity) {
            abilityText += " (EMPTY)"; abilityColor = 'grey';
        } else {
            abilityColor = 'lime';
        }
    }

    if (player.isBulletTimeActive) {
        const realDurationLeft = player.bulletTimeTimer;
        abilityText += ` (ACTIVE ${(realDurationLeft / 1000).toFixed(1)}s)`;
        abilityColor = 'cyan';
    }

    ctx.fillStyle = abilityColor; ctx.fillText(abilityText, canvas.width - 15, canvas.height - 55);
    ctx.fillStyle = 'white'; ctx.font = '18px Arial';

    ctx.textAlign = 'left'; ctx.fillStyle = 'white'; ctx.font = '16px Arial'; const aliveZombies = zombies.length; ctx.fillText(`Zombies: ${aliveZombies}`, 15, 25); ctx.fillText(`Kills: ${kills}`, 15, 50);
    const timeMinutes = Math.floor(elapsedTime / 60); const timeSeconds = Math.floor(elapsedTime % 60); ctx.fillText(`Time: ${timeMinutes.toString().padStart(2, '0')}:${timeSeconds.toString().padStart(2, '0')}`, 15, 75);
    ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

// --- Input Handling ---
function setupInputListeners() {
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (gameState === GameState.CharacterSelection) {
            const numberKey = parseInt(key);
            if (!isNaN(numberKey) && numberKey >= 1 && numberKey <= classes.length) {
                const index = numberKey - 1;
                startGame(index);
            }
        } else if (gameState === GameState.Playing && player && player.active) {
            if (e.key === ' ') e.preventDefault();
            if (key === 'w') input.w = true;
            else if (key === 'a') input.a = true;
            else if (key === 's') input.s = true;
            else if (key === 'd') input.d = true;
            else if (key === 'shift') input.shift = true;
            else if (key === 'r') input.r = true;
            else if (key === ' ') input.space = true;
        }
        input.keys[key] = true;
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (gameState === GameState.Playing) {
            if (key === 'w') input.w = false;
            else if (key === 'a') input.a = false;
            else if (key === 's') input.s = false;
            else if (key === 'd') input.d = false;
            else if (key === 'shift') input.shift = false;
            else if (key === 'r') input.r = false;
            else if (key === ' ') input.space = false;
        }
        delete input.keys[key];
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (gameState === GameState.CharacterSelection) {
                const rect = canvas.getBoundingClientRect();
                const mouseCanvasX = e.clientX - rect.left;
                const mouseCanvasY = e.clientY - rect.top;
                selectionBoxes.forEach(box => {
                    if (mouseCanvasX >= box.rect.x && mouseCanvasX <= box.rect.x + box.rect.w &&
                        mouseCanvasY >= box.rect.y && mouseCanvasY <= box.rect.y + box.rect.h) {
                        startGame(box.classIndex);
                    }
                });
            } else if (gameState === GameState.Playing && player && player.active) {
                input.mouseDown = true;
                // Reset attacked flag on new mousedown for Psion non-auto attack
                if (player.isPsion) {
                    player.attackedThisClick = false;
                }
            }
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            if (gameState === GameState.Playing && player && player.active) {
                input.mouseDown = false;
                // Reset attacked flag when mouse is released (important for non-auto click)
                if (player.isPsion) {
                    player.attackedThisClick = false;
                }
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        input.mouseX = e.clientX;
        input.mouseY = e.clientY;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}


// --- Zombie Spawning ---
function spawnZombies() {
    const now = performance.now();
    let currentInterval = ZOMBIE_SPAWN_INTERVAL_START;
    let currentBatchSize = ZOMBIE_SPAWN_BATCH_SIZE_START;

    if (gameState === GameState.Playing && gameStartTime > 0) {
        const intervalProgress = Math.min(1, elapsedTime / ZOMBIE_SPAWN_INTERVAL_SCALE_TIME);
        currentInterval = ZOMBIE_SPAWN_INTERVAL_START + (ZOMBIE_SPAWN_INTERVAL_MIN - ZOMBIE_SPAWN_INTERVAL_START) * intervalProgress;
        if (elapsedTime > ZOMBIE_SPAWN_INTERVAL_SCALE_TIME) {
            currentInterval = Math.max(ZOMBIE_SPAWN_CAP_INTERVAL, ZOMBIE_SPAWN_INTERVAL_MIN - (elapsedTime - ZOMBIE_SPAWN_INTERVAL_SCALE_TIME) * 0.5);
        }
        currentInterval = Math.max(ZOMBIE_SPAWN_CAP_INTERVAL, currentInterval);

        const batchProgress = Math.min(1, elapsedTime / ZOMBIE_SPAWN_BATCH_SCALE_TIME);
        currentBatchSize = ZOMBIE_SPAWN_BATCH_SIZE_START + (ZOMBIE_SPAWN_BATCH_SIZE_MAX - ZOMBIE_SPAWN_BATCH_SIZE_START) * batchProgress;
        if (elapsedTime > ZOMBIE_SPAWN_BATCH_SCALE_TIME) {
            currentBatchSize = ZOMBIE_SPAWN_BATCH_SIZE_MAX + Math.floor((elapsedTime - ZOMBIE_SPAWN_BATCH_SCALE_TIME) / 30);
            currentBatchSize = Math.min(ZOMBIE_SPAWN_CAP_BATCH, currentBatchSize);
        }
        currentBatchSize = Math.round(currentBatchSize);
    } else {
        return;
    }

    if (Math.random() < TYRANT_SPAWN_CHANCE && zombies.length < MAX_ZOMBIES) {
        trySpawnSpecialZombie(ZOMBIE_TYPE.TYRANT);
    }

    if (now - lastZombieSpawnTime < currentInterval || zombies.length >= MAX_ZOMBIES) {
        return;
    }

    lastZombieSpawnTime = now;

    const totalWeight = ENTRANCE_SPAWN_WEIGHT + OFFSCREEN_SPAWN_WEIGHT;
    let spawnedThisBatch = 0;
    for (let i = 0; i < currentBatchSize; i++) {
        if (zombies.length >= MAX_ZOMBIES) break;
        let zombieTypeToSpawn = (Math.random() < TANK_CHANCE) ? ZOMBIE_TYPE.TANK : ZOMBIE_TYPE.REGULAR;
        let spawnX, spawnY;
        let spawnLocationFound = false;
        let attempts = 0;
        const maxSpawnAttempts = 50;
        let useEntrance = level.entrances.length > 0 && (Math.random() * totalWeight < ENTRANCE_SPAWN_WEIGHT);

        if (useEntrance) {
            const entrance = getRandomElement(level.entrances);
            if (entrance) {
                spawnX = entrance.x * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * TILE_SIZE * 0.2;
                spawnY = entrance.y * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * TILE_SIZE * 0.2;
                if (player && distance(spawnX, spawnY, player.x, player.y) < ZOMBIE_MAX_SPAWN_DISTANCE) {
                    spawnLocationFound = true;
                } else { useEntrance = false; }
            } else { useEntrance = false; }
        }

        if (!useEntrance) {
            const viewMargin = TILE_SIZE * 2;
            const viewRect = {
                left: camera.x - viewMargin, top: camera.y - viewMargin,
                right: camera.x + canvas.width + viewMargin, bottom: camera.y + canvas.height + viewMargin
            };
            let tryRightEdgeFirst = (zombieTypeToSpawn === ZOMBIE_TYPE.REGULAR && Math.random() < ZOMBIE_RIGHT_EDGE_SPAWN_BIAS);

            while (!spawnLocationFound && attempts < maxSpawnAttempts) {
                attempts++;
                if (tryRightEdgeFirst) {
                    spawnX = viewRect.right + Math.random() * TILE_SIZE * 4;
                    spawnY = Math.random() * level.height * TILE_SIZE;
                    tryRightEdgeFirst = false;
                } else {
                    spawnX = Math.random() * level.width * TILE_SIZE;
                    spawnY = Math.random() * level.height * TILE_SIZE;
                }

                const outsideView = spawnX < viewRect.left || spawnX > viewRect.right || spawnY < viewRect.top || spawnY > viewRect.bottom;
                const gridX = Math.floor(spawnX / TILE_SIZE);
                const gridY = Math.floor(spawnY / TILE_SIZE);
                const onFloor = level.grid[gridY]?.[gridX] === TILE.FLOOR;
                const withinDist = player ? (distance(spawnX, spawnY, player.x, player.y) < ZOMBIE_MAX_SPAWN_DISTANCE) : false;

                if (outsideView && onFloor && withinDist) {
                    spawnLocationFound = true;
                }
            }
        }

        if (spawnLocationFound) {
            zombies.push(new Zombie(spawnX, spawnY, zombieTypeToSpawn));
            spawnedThisBatch++;
        }
    }
}

function trySpawnSpecialZombie(zombieType) {
    let spawnX, spawnY;
    let spawnLocationFound = false;
    let attempts = 0;
    const maxSpawnAttempts = 50;
    const validEntrances = (zombieType === ZOMBIE_TYPE.TYRANT) ? level.entrances.filter(e => e.x <= 1) : level.entrances;
    const potentialEntrances = validEntrances.length > 0 ? validEntrances : level.entrances;

    if (potentialEntrances.length > 0) {
        const entrance = getRandomElement(potentialEntrances);
        if (entrance) {
            spawnX = entrance.x * TILE_SIZE + TILE_SIZE / 2;
            spawnY = entrance.y * TILE_SIZE + TILE_SIZE / 2;
            if(player && distance(spawnX, spawnY, player.x, player.y) < ZOMBIE_MAX_SPAWN_DISTANCE) {
                 spawnLocationFound = true;
            }
        }
    }

    if (!spawnLocationFound) {
        const viewMargin = TILE_SIZE * 2;
        const viewRect = { left: camera.x - viewMargin, top: camera.y - viewMargin, right: camera.x + canvas.width + viewMargin, bottom: camera.y + canvas.height + viewMargin };
        while (!spawnLocationFound && attempts < maxSpawnAttempts) {
            attempts++;
            spawnX = Math.random() * level.width * TILE_SIZE;
            spawnY = Math.random() * level.height * TILE_SIZE;
            const outsideView = spawnX < viewRect.left || spawnX > viewRect.right || spawnY < viewRect.top || spawnY > viewRect.bottom;
            if (!outsideView) continue;

            const gridX = Math.floor(spawnX / TILE_SIZE);
            const gridY = Math.floor(spawnY / TILE_SIZE);
            const onFloor = level.grid[gridY]?.[gridX] === TILE.FLOOR;
            const withinDist = player ? (distance(spawnX, spawnY, player.x, player.y) < ZOMBIE_MAX_SPAWN_DISTANCE) : false;

            if (onFloor && withinDist) {
                spawnLocationFound = true;
            }
        }
    }

    if (spawnLocationFound) {
        const typeName = Object.keys(ZOMBIE_TYPE).find(key => ZOMBIE_TYPE[key] === zombieType) || 'Unknown';
        console.log(`%cSpawning Special: ${typeName} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`, 'color: yellow; font-weight: bold;');
        zombies.push(new Zombie(spawnX, spawnY, zombieType));
    } else {
        console.warn(`Failed to find valid spawn location for special zombie type ${zombieType}`);
    }
}


// --- Initialization & Game Start ---
function startGame(selectedClassIndex) {
    if (gameState === GameState.Initializing || gameState === GameState.Playing) return;
    gameState = GameState.Initializing;
    console.log("Initializing game...");

    const baseHeightTiles = Math.max(25, Math.floor(canvas.height / TILE_SIZE * 1.0));
    const levelHeightTiles = baseHeightTiles % 2 === 0 ? baseHeightTiles + 1 : baseHeightTiles;
    const targetWidthTiles = levelHeightTiles * MAP_ASPECT_RATIO;
    const levelWidthTiles = targetWidthTiles % 2 === 0 ? targetWidthTiles + 1 : targetWidthTiles;

    console.log(`Generating level (${levelWidthTiles}x${levelHeightTiles})...`);
    generateLevel(level, levelWidthTiles, levelHeightTiles);
    console.log(`Level generated. Start: (${level.startX.toFixed(0)}, ${level.startY.toFixed(0)}), End: (${level.endX.toFixed(0)}, ${level.endY.toFixed(0)})`);

    player = new Player(level.startX, level.startY, classes[selectedClassIndex]);
    console.log(`Player created as ${player.classData.name}`);

    // Spawn Mercenaries
    mercenaries = [];
    let mercCountToSpawn = 0;
    const playerClassId = player.classData.id;

    if (playerClassId === CLASS_ID.MARINE) {
        mercCountToSpawn = 3;
    } else if (playerClassId === CLASS_ID.DEMOLISHER || playerClassId === CLASS_ID.BRAWLER) {
        mercCountToSpawn = 2;
    }

    if (mercCountToSpawn > 0) {
        let mercSpawnedCount = 0;
        const maxSpawnAttemptsMerc = 50;
        let attemptsMerc = 0;
        const startGridX = Math.floor(player.x / TILE_SIZE);
        const startGridY = Math.floor(player.y / TILE_SIZE);
        while (mercSpawnedCount < mercCountToSpawn && attemptsMerc < maxSpawnAttemptsMerc) {
            attemptsMerc++;
            const offsetX = getRandomInt(-3, 3);
            const offsetY = getRandomInt(-3, 3);
            if (offsetX === 0 && offsetY === 0) continue;
            const gridX = startGridX + offsetX;
            const gridY = startGridY + offsetY;
            if (gridX > 0 && gridX < level.width - 1 && gridY > 0 && gridY < level.height - 1 && level.grid[gridY]?.[gridX] === TILE.FLOOR) {
                const spawnX = gridX * TILE_SIZE + TILE_SIZE / 2;
                const spawnY = gridY * TILE_SIZE + TILE_SIZE / 2;
                let tooClose = distance(spawnX, spawnY, player.x, player.y) < TILE_SIZE * 1.5;
                if (!tooClose) {
                    for(const merc of mercenaries){
                        if(distance(spawnX, spawnY, merc.x, merc.y) < MERC_SEPARATION_DISTANCE * 1.5) {
                            tooClose = true; break;
                        }
                    }
                }
                if (!tooClose) {
                     mercenaries.push(new Mercenary(spawnX, spawnY, mercSpawnedCount));
                     mercSpawnedCount++;
                }
            }
        }
        console.log(`Spawned ${mercSpawnedCount} mercenaries.`);
    } else {
        console.log("Recon/Psion selected or 0 mercs defined, skipping mercenary spawn.");
    }

     // Reset all game state arrays and variables
     zombies = []; projectiles = []; grenades = []; grenadeParticles = []; rpgProjectiles = []; explosionParticles = []; smokeParticles = []; railgunEffects = []; railgunParticles = [];
     flameParticles = [];
     wallSparkParticles = [];
     flashParticles = [];
     shockwaves = []; afterimages = [];
     psiBlastParticles = []; // Reset
     psiBladeEffects = []; // Reset
     gameOver = false; gameWon = false; kills = 0;
     gameStartTime = performance.now(); elapsedTime = 0; lastTime = gameStartTime; lastZombieSpawnTime = gameStartTime;
     gameTimeScale = NORMAL_TIME_SCALE;

     camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2;
     camera.x = Math.max(0, Math.min(level.width * TILE_SIZE - canvas.width, camera.x));
     camera.y = Math.max(0, Math.min(level.height * TILE_SIZE - canvas.height, camera.y));

     updateFogOfWar();
     gameState = GameState.Playing;
     console.log("Game Starting!");
 }
function initScreen() {
    if (!window.inputListenersAttached) {
         setupInputListeners();
         window.inputListenersAttached = true;
    }
    gameState = GameState.CharacterSelection;
    requestAnimationFrame(gameLoop);
}


// --- Start the process ---
initScreen();