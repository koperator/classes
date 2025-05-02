// --- Utility Functions ---
function getRandomInt(min, max) { min = Math.ceil(min); max = Math.floor(max); return Math.floor(Math.random() * (max - min + 1)) + min; }
function getRandomElement(arr) { if (!arr || arr.length === 0) return undefined; return arr[Math.floor(Math.random() * arr.length)]; }
function distance(x1, y1, x2, y2) { const dx = x1 - x2; const dy = y1 - y2; return Math.sqrt(dx * dx + dy * dy); }
function normalizeVector(vx, vy) { const mag = Math.sqrt(vx * vx + vy * vy); if (mag === 0) return { x: 0, y: 0 }; return { x: vx / mag, y: vy / mag }; }
function dotProduct(vx1, vy1, vx2, vy2) { return vx1 * vx2 + vy1 * vy2; }
function angleDiff(angle1, angle2) { let diff = angle2 - angle1; while (diff <= -Math.PI) diff += 2 * Math.PI; while (diff > Math.PI) diff -= 2 * Math.PI; return diff; }
function wrapText(context, text, maxWidth) { if (!text) return []; const words = text.split(' '); const lines = []; let currentLine = words[0] || ''; for (let i = 1; i < words.length; i++) { const word = words[i]; const testLine = currentLine + " " + word; const metrics = context.measureText(testLine); const testWidth = metrics.width; if (testWidth < maxWidth) { currentLine = testLine; } else { lines.push(currentLine); currentLine = word; } } lines.push(currentLine); return lines; }
function hasLineOfSight(startX, startY, endX, endY, isWallCheckFunc, revealWallFunc = null, stepScale = 0.5) {
    const dist = distance(startX, startY, endX, endY);
    if (dist === 0) return true;
    const steps = Math.max(10, Math.floor(dist / (TILE_SIZE * stepScale)));
    const dx = endX - startX;
    const dy = endY - startY;
    for (let i = 1; i <= steps; i++) {
        const checkX = startX + (dx * i) / steps;
        const checkY = startY + (dy * i) / steps;
        const gridX = Math.floor(checkX / TILE_SIZE);
        const gridY = Math.floor(checkY / TILE_SIZE);
        if (gridX < 0 || gridX >= level.width || gridY < 0 || gridY >= level.height) { return false; }
        if (isWallCheckFunc(gridX, gridY)) {
            if (revealWallFunc) { revealWallFunc(gridX, gridY); }
            return false;
        }
    }
    return true;
}
// Linear interpolation
function lerp(a, b, t) {
    return a + (b - a) * t;
}