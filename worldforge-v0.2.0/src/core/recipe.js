import { DEFAULT_BUILDING, DEFAULT_LANDSCAPE, RECIPE_SCHEMA, WORLDFORGE_VERSION } from './schema.js';
import { clamp } from './rng.js';

const BUILDING_FAMILIES = new Set(['cottage','house','shop','inn','shack','barn','warehouse']);
const BUILDING_STYLES = new Set(['smallWoodTown','mountain','stoneTown','industrial','abandonedEdge']);
const MATERIALS = new Set(['auto','wood','timberPlaster','stone','brick','metal']);
const CONDITIONS = new Set(['clean','worn','abandoned']);
const ROOFS = new Set(['gable','hip','flat']);
const FEATURES = new Set(['ridge','mesa','ravine']);

function finiteNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeRecipe(input = {}) {
  const type = input.type === 'landscape' ? 'landscape' : 'building';
  if (type === 'landscape') {
    const d = DEFAULT_LANDSCAPE;
    return {
      schema: RECIPE_SCHEMA,
      generatorVersion: WORLDFORGE_VERSION,
      type,
      seed: Math.trunc(finiteNumber(input.seed, d.seed)),
      feature: FEATURES.has(input.feature) ? input.feature : d.feature,
      size: clamp(finiteNumber(input.size, d.size), 18, 80),
      relief: clamp(finiteNumber(input.relief, d.relief), 1, 24),
      roughness: clamp(finiteNumber(input.roughness, d.roughness), 0, 1),
      terracing: clamp(finiteNumber(input.terracing, d.terracing), 0, 1),
      path: input.path ?? d.path,
      rocks: input.rocks ?? d.rocks,
      gridResolution: Math.trunc(clamp(finiteNumber(input.gridResolution, d.gridResolution), 24, 128))
    };
  }

  const d = DEFAULT_BUILDING;
  const features = input.features || {};
  return {
    schema: RECIPE_SCHEMA,
    generatorVersion: WORLDFORGE_VERSION,
    type,
    seed: Math.trunc(finiteNumber(input.seed, d.seed)),
    family: BUILDING_FAMILIES.has(input.family) ? input.family : d.family,
    style: BUILDING_STYLES.has(input.style) ? input.style : d.style,
    material: MATERIALS.has(input.material) ? input.material : d.material,
    condition: CONDITIONS.has(input.condition) ? input.condition : d.condition,
    width: clamp(finiteNumber(input.width, d.width), 3.25, 14),
    depth: clamp(finiteNumber(input.depth, d.depth), 2.75, 11),
    floors: Math.trunc(clamp(finiteNumber(input.floors, d.floors), 1, 4)),
    roof: ROOFS.has(input.roof) ? input.roof : d.roof,
    pitch: clamp(finiteNumber(input.pitch, d.pitch), 15, 65),
    features: {
      chimney: features.chimney ?? d.features.chimney,
      porch: features.porch ?? d.features.porch,
      sign: features.sign ?? d.features.sign,
      extension: features.extension ?? d.features.extension
    }
  };
}

export function validateRecipe(recipe) {
  const r = normalizeRecipe(recipe);
  const warnings = [];
  if (r.type === 'building') {
    if (r.family === 'shack' && r.floors > 2) warnings.push('Shacks are normally one or two floors.');
    if (r.family === 'barn' && r.features.sign) warnings.push('Barn sign is unusual but allowed.');
    if (r.roof === 'flat' && r.pitch !== 15) warnings.push('Roof pitch is ignored for flat roofs.');
  }
  return { recipe: r, warnings };
}
