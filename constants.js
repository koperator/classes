// --- Constants ---
const TILE_SIZE = 32;
const PLAYER_SIZE = TILE_SIZE * 0.6;
const ZOMBIE_SIZE = TILE_SIZE * 0.5; // Base size
const MERC_SIZE = TILE_SIZE * 0.6;
const GUN_BARREL_OFFSET = PLAYER_SIZE * 0.6;

// --- Time Scaling ---
const NORMAL_TIME_SCALE = 1.0;
const BULLET_TIME_SCALE = 0.3;
const BULLET_TIME_DURATION = 2000; // ms
const BULLET_TIME_COOLDOWN = 10000; // ms

// --- Weapon Definitions ---
const WEAPON_ID = { RAILGUN: 0, MACHINEGUN: 1, FLAMETHROWER: 2, AUTOSHOTGUN: 3, PSI_BLADES: 99 };

// --- Flamethrower Specific Constants ---
const FLAME_PARTICLE_DAMAGE = 0.5;

// --- Machinegun Wall Hit Particle Constants ---
const MG_WALL_SPARK_COUNT = 3;
const MG_WALL_SPARK_SPEED_MIN = 200;
const MG_WALL_SPARK_SPEED_MAX = 500;
const MG_WALL_SPARK_LIFESPAN = 150; // ms
const MG_WALL_SPARK_RADIUS = 2.5;
const MG_WALL_SPARK_BOUNCES = 1;
const MG_WALL_SPARK_DAMPING = 0.3;

// --- Psion Constants ---
const PSION_SHIELD_HP = 77;
const PSION_SHIELD_REGEN_RATE = (7 * 3) * 0.75; // <<< 3x Faster base, then 25% slower
const PSION_SHIELD_REGEN_DELAY = 2000 / 4; // 500ms base delay
const PSION_SHIELD_REGEN_DELAY_ZERO = 50; // <<< Extra delay when shield hits 0 (ms)
const PSI_BLADE_RANGE = 69;
const PSI_BLADE_DAMAGE = 44;
const PSI_BLADE_ARC_ANGLE = (Math.PI / 2) * 0.6; // <<< 40% Narrower Cone
const PSI_BLADE_MIN_ATTACK_INTERVAL = 100;
const PSI_BLADE_EFFECT_DURATION = 100; // ms
const PSION_XRAY_RANGE = 100; // Range for passive vision
// --- Psi Blast Changes ---
const PSI_BLAST_COOLDOWN = 369; // <<< Cooldown set (ms)
const PSI_BLAST_CAST_DELAY = 150; // ms
const PSI_BLAST_MIN_SHIELD_COST = 5; // <<< Minimum shield required
const PSI_BLAST_MAX_PARTICLES = Math.round(90 * 1.25); // Max particles increased by 25%
const PSI_BLAST_MIN_PARTICLES = 15;
const PSI_BLAST_PARTICLE_SPEED = 369 * 2.6;
const PSI_BLAST_MAX_STUN_DURATION = 400; // Max stun duration (ms)
const PSI_BLAST_MAX_LIFESPAN = 0.45 * 1.22; // Max Lifespan (seconds)
const PSI_BLAST_MAX_BASE_RADIUS = 8; // Max Base Radius
const PSI_BLAST_PARTICLE_COLOR_START = [255, 150, 255];
const PSI_BLAST_PARTICLE_COLOR_END = [100, 0, 150];
const PSI_BLAST_PARTICLE_DAMPING = 1.5;

// --- Recon Constants ---
const RECON_DASH_CHARGES = 3;
const RECON_DASH_RECHARGE_TIME = 1500; // ms
const RECON_DASH_DURATION = 88; // Duration of the dash effect itself (ms)


const weapons = [
    { id: WEAPON_ID.RAILGUN, name: "Railgun", rpm: 122, damageMin: 89, damageMax: 169, magSize: 5, reloadTime: 1500, spreadStand: 0.1*(Math.PI/180), spreadWalk: 0.5*(Math.PI/180), spreadRun: 1.5*(Math.PI/180), projectileSpeed: Infinity, penetration: Infinity, ricochets: 0, pellets: 1, auto: false, isRaycast: true },
    { id: WEAPON_ID.MACHINEGUN, name: "Machinegun", rpm: 750, damageMin: 8, damageMax: 15, magSize: 80, reloadTime: 1250, spreadStand: 2.5*(Math.PI/180), spreadWalk: 6*(Math.PI/180), spreadRun: 14*(Math.PI/180), projectileSpeed: 1350, penetration: 2, ricochets: 2, pellets: 1, auto: true, isRaycast: false },
    {
        id: WEAPON_ID.FLAMETHROWER,
        name: "Flamethrower",
        rpm: 1000,
        magSize: 100,
        reloadTime: 2300,
        spreadStand: 7.2 * (Math.PI / 180), spreadWalk: 10.8 * (Math.PI / 180), spreadRun: 14.4 * (Math.PI / 180),
        particleSpeed: 910, particleLifespan: 669, particleDamping: 3.09,
        particleBaseRadius: TILE_SIZE * 0.08, particleSizeGrowFactor: 4.8, particleCountPerShot: 10,
        wallHitParticleCount: 3, wallHitAOELifespan: 170,
        pellets: 1, auto: true, isRaycast: false,
        damageMin: 0, damageMax: 0, penetration: 0, ricochets: 0
    },
    { id: WEAPON_ID.AUTOSHOTGUN, name: "Autoshotgun", rpm: Math.round(269 * 1.10), damageMin: Math.round(4 * 0.90), damageMax: Math.round(7 * 0.90), magSize: 12, reloadTime: 1400, spreadStand: 13*(Math.PI/180)*1.2, spreadWalk: 17*(Math.PI/180)*1.2, spreadRun: 23*(Math.PI/180)*1.2, projectileSpeed: 1190, penetration: 0, ricochets: 0, pellets: 11, auto: true, isRaycast: false },
    { id: WEAPON_ID.PSI_BLADES, name: "Psi Blades", rpm: Infinity, damageMin: PSI_BLADE_DAMAGE, damageMax: PSI_BLADE_DAMAGE, magSize: Infinity, reloadTime: 0, spreadStand: 0, spreadWalk: 0, spreadRun: 0, projectileSpeed: 0, penetration: Infinity, ricochets: 0, pellets: 0, auto: false, isRaycast: false },
];

const AUTOSHOTGUN_STUN_DURATION = 100; // ms

// --- Mercenary Weapon Definition ---
const MERC_WEAPON = { name: "Merc SMG", rpm: 600, damageMin: 3, damageMax: 6, magSize: 20, reloadTime: 1600, spread: 8 * (Math.PI / 180), projectileSpeed: 950, penetration: 0, ricochets: 0, range: 500 };

// Player Base Settings
const BASE_PLAYER_SPEED_WALK = 170; const BASE_PLAYER_SPEED_RUN = 250; const PLAYER_DASH_SPEED_FACTOR = 4.0;
const PLAYER_DASH_AFTERIMAGE_INTERVAL = 40; // ms

// Grenade Settings
const GRENADE_COOLDOWN = 500; // ms
const GRENADE_SPEED = 400;
const GRENADE_FUSE_TIME = 1500; // ms
const GRENADE_PARTICLE_COUNT = 77; const GRENADE_PARTICLE_SPEED = 750;
const GRENADE_PARTICLE_LIFESPAN = 0.22 * 0.85; // seconds
const GRENADE_PARTICLE_DAMAGE = 6; const GRENADE_PARTICLE_LENGTH = 8;
const GRENADE_PARTICLE_WIDTH = 4;
const GRENADE_BOUNCE_CHANCE = 0.99; const GRENADE_BOUNCE_DAMPING = 0.5; const GRENADE_COUNT_START = 17;
const GRENADE_EXPLOSION_RADIUS_FACTOR = 0.4;

// --- Class Definitions ---
const CLASS_ID = { RECON: 0, MARINE: 1, DEMOLISHER: 2, BRAWLER: 3, PSION: 4 };
const classes = [
    { id: CLASS_ID.RECON, name: "Recon", hp: 20, speedMultiplier: 1.20, weaponId: WEAPON_ID.RAILGUN, ability: { type: 'dash', uses: RECON_DASH_CHARGES, maxUses: RECON_DASH_CHARGES, rechargeTime: RECON_DASH_RECHARGE_TIME, duration: RECON_DASH_DURATION }, passive: { type: 'drone' }, description: "Very fast scout with Railgun, speed dash (3 charges, fast recharge), and 3 attack drones. No mercenaries.", color: 'cyan' }, // <<< Updated Recon Ability/Desc
    { id: CLASS_ID.MARINE, name: "Marine", hp: 30, speedMultiplier: 1.00, weaponId: WEAPON_ID.MACHINEGUN, ability: { type: 'grenade', uses: GRENADE_COUNT_START, cooldown: GRENADE_COOLDOWN }, passive: null, description: "Standard soldier with a reliable Machinegun, frag grenades, and a squad of 3 mercenaries. Average speed.", color: 'green' },
    { id: CLASS_ID.DEMOLISHER, name: "Demolisher", hp: 35, speedMultiplier: 0.9, weaponId: WEAPON_ID.FLAMETHROWER, ability: { type: 'rpg', uses: 10, cooldown: 1000 }, passive: { type: 'explosion_resistance'}, description: "Area denial expert with a Flamethrower and RPG launcher. Takes reduced explosion damage. Squad of 2 mercenaries.", color: 'orange' },
    { id: CLASS_ID.BRAWLER, name: "Brawler", hp: 75, speedMultiplier: 0.8, weaponId: WEAPON_ID.AUTOSHOTGUN, ability: { type: 'bullet_time', uses: Infinity, cooldown: BULLET_TIME_COOLDOWN, duration: BULLET_TIME_DURATION }, passive: null, description: "Durable close-combat specialist with Autoshotgun. Can briefly slow down time around them. Squad of 2 mercenaries.", color: 'red' },
    { id: CLASS_ID.PSION, name: "Psion", hp: 25, speedMultiplier: 1.25, weaponId: WEAPON_ID.PSI_BLADES, ability: { type: 'psi_blast', cooldown: PSI_BLAST_COOLDOWN }, passive: { type: 'shield_regen_xray' }, description: `Agile warrior (25HP) with fast shield regen (${PSION_SHIELD_HP}HP). Sees enemies through walls nearby. Manual Psi Blades. Psi Blast consumes shield (>5) for AoE damage (DMG based on shield+) & scaled effects. Short cooldown. No mercenaries.`, color: '#b742f5' } // <<< Updated Psion HP/Desc
];

// RPG Settings
const RPG_SPEED = 650; const RPG_EXPLOSION_RADIUS = TILE_SIZE * 3.5;
const RPG_DAMAGE_CENTER = 90; const RPG_DAMAGE_EDGE = 25;
const RPG_EXPLOSION_PARTICLE_COUNT = 90;
const RPG_EXPLOSION_PARTICLE_SPEED = 400;
const RPG_EXPLOSION_PARTICLE_LIFESPAN = 0.25; // seconds
const RPG_PARTICLE_LENGTH = 10;
const RPG_PARTICLE_WIDTH = 7;
const RPG_PARTICLE_CONE_ANGLE = Math.PI * 1.8;
const RPG_PARTICLE_SPEED_BIAS_FACTOR = 1.7;
const RPG_SMOKE_INTERVAL = 30; // ms
const RPG_SMOKE_LIFESPAN = 500; // ms
const RPG_SMOKE_SIZE = 6;
const RPG_FLASH_PARTICLE_COUNT = 100;
const RPG_FLASH_PARTICLE_SPEED_MIN = 1200;
const RPG_FLASH_PARTICLE_SPEED_MAX = 1800;
const RPG_FLASH_PARTICLE_LIFESPAN_MIN = 100; // ms (0.1s)
const RPG_FLASH_PARTICLE_LIFESPAN_MAX = 200; // ms (0.2s)
const RPG_STUN_DURATION = 800; // ms
const RPG_SHOCKWAVE_MAX_RADIUS = TILE_SIZE * 5;
const RPG_SHOCKWAVE_LIFESPAN = 300; // ms

// Drone Settings
const DRONE_TARGETING_RANGE = 600; const DRONE_PROJECTILE_LENGTH = 12;
const DRONE_PROJECTILE_WIDTH = 3;
const DRONE_FIRE_RATE = 6;
const DRONE_PROJECTILE_SPEED = 850; const DRONE_PROJECTILE_DAMAGE = 3; const DRONE_SWITCH_TARGET_COOLDOWN = 220; // ms
const DRONE_VISION_RADIUS = 10; // tiles
const DRONE_SIZE_MULTIPLIER = 0.3;
const DRONE_FOLLOW_DISTANCE = TILE_SIZE * 1.5;
const DRONE_SEPARATION_DISTANCE = TILE_SIZE * 1.0;
const DRONE_SPEED = BASE_PLAYER_SPEED_RUN * 1.1 * 3.69;
const DRONE_ACCELERATION_FACTOR = 2.5;
const DRONE_NOISE_AMPLITUDE = TILE_SIZE * 0.4;
const DRONE_NOISE_FREQUENCY_X = 0.25;
const DRONE_NOISE_FREQUENCY_Y = 0.35;
const DRONE_LEAD_FACTOR = 0.6;

// Zombie Settings
const ZOMBIE_TYPE = { REGULAR: 0, TANK: 1, TYRANT: 2 };
const ZOMBIE_SPEED_TIERS = [45, 50, 55, 60, 65, 75]; const ZOMBIE_HP_TIERS = [4, 7, 11, 17];
const TANK_CHANCE = 0.03; const TANK_SPEED = 55; const TANK_HP = 169; const TANK_DMG = 7; const TANK_COLOR = '#236713';
const TYRANT_SPAWN_CHANCE = 0.001; const TYRANT_SPEED = 37; const TYRANT_HP = 777; const TYRANT_DMG = 20; const TYRANT_COLOR = '#003b19';

const ZOMBIE_SPAWN_INTERVAL_START = 1100; // ms
const ZOMBIE_SPAWN_INTERVAL_MIN = 100; // ms
const ZOMBIE_SPAWN_INTERVAL_SCALE_TIME = 240; // seconds
const ZOMBIE_SPAWN_BATCH_SIZE_START = 3; const ZOMBIE_SPAWN_BATCH_SIZE_MAX = 25; const ZOMBIE_SPAWN_BATCH_SCALE_TIME = 300; // seconds
const ZOMBIE_SPAWN_CAP_INTERVAL = 50; // ms
const ZOMBIE_SPAWN_CAP_BATCH = 40;
const MAX_ZOMBIES = 1500;
const ZOMBIE_ATTACK_DAMAGE_MIN = 1; const ZOMBIE_ATTACK_DAMAGE_MAX = 1; const ZOMBIE_ATTACK_COOLDOWN = 650; // ms
const ENTRANCE_SPAWN_WEIGHT = 8; const OFFSCREEN_SPAWN_WEIGHT = 1;
const ZOMBIE_MAX_SPAWN_DISTANCE = 2500;
const ZOMBIE_RIGHT_EDGE_SPAWN_BIAS = 0.3;

// Mercenary Settings
const MERC_HP = 20; const MERC_SPEED = 140; const MERC_FOLLOW_DISTANCE_MIN = TILE_SIZE * 1.2; const MERC_FOLLOW_DISTANCE_MAX = TILE_SIZE * 2.2; const MERC_SEPARATION_DISTANCE = TILE_SIZE * 0.8; const MERC_PATHFINDING_COOLDOWN = 1.0; // seconds
const MERC_VISION_RADIUS = 12; // tiles

// Map Settings
const MAP_ASPECT_RATIO = 7;
const OBSTACLE_DENSITY_FACTOR = 280; const OBSTACLE_MIN_SIZE = 1; const OBSTACLE_MAX_SIZE = 3; const CARVING_DENSITY_FACTOR = 49; const CARVING_MIN_SIZE = 2; const CARVING_MAX_SIZE = 5; const NUM_ENTRANCES_PER_SIDE = 9; const START_AREA_RADIUS = 4; const LOOP_CREATION_PROBABILITY = 0.11;
const BLOCK_CARVE_DENSITIES = [13, 77, 177, 369, 777, 696, 777];
const BLOCK_CARVE_MIN_SIZE = 2; const BLOCK_CARVE_MAX_SIZE = 4;
const MIN_ENTRANCE_EXIT_DISTANCE_FACTOR = 0.15;

// Fog of War Settings
const PLAYER_VISION_RADIUS = 15; // tiles
const FOG_STATE = { HIDDEN: 0, REVEALED: 1 };
const FOG_COLOR_HIDDEN = 'rgba(0, 0, 0, 1)';
const FOG_LOS_STEP_SCALE = 0.4;

// Tile Types Enum & Colors
const TILE = { FLOOR: 0, WALL: 1, OBSTACLE: 2, ENTRANCE: 3 };
const COLOR_FLOOR = '#444'; const COLOR_WALL = '#777'; const COLOR_OBSTACLE = '#606070'; const COLOR_ENTRANCE = '#8B0000'; const COLOR_WALL_STROKE = '#555';
const ZOMBIE_REGULAR_COLOR = '#68a92f'; const MERC_COLOR = '#2d47cf';

// Railgun Effect
const RAILGUN_EFFECT_DURATION = 100; // ms
const RAILGUN_COLOR = 'rgba(0, 180, 255, 0.8)'; const RAILGUN_WIDTH = 5;
const RAILGUN_PARTICLE_LIFESPAN = 330; // ms
const RAILGUN_PARTICLE_RADIUS = 3;
const RAILGUN_PARTICLE_COLOR = 'rgba(80, 180, 220, 0.6)';
const RAILGUN_PARTICLE_SPAWN_DELAY = 50; // ms

// General Projectile Settings
const PROJECTILE_LIFESPAN_DEFAULT = 1.0; // seconds
const PROJECTILE_LENGTH_DEFAULT = 15; const PROJECTILE_WIDTH_DEFAULT = 3; const MG_PROJECTILE_LENGTH = PROJECTILE_LENGTH_DEFAULT * 1.2;
const PARTICLE_BOUNCE_DAMPING = 0.5;
const SHOTGUN_PELLET_SPEED_VARIATION = 0.45;

// Player general constants
// GUN_BARREL_OFFSET already defined at top