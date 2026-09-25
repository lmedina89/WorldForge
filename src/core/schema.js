export const WORLDFORGE_VERSION = '0.9.0';
export const RECIPE_SCHEMA = 'worldforge.recipe.v1';
export const SCENE_SCHEMA = 'worldforge.scene.v1';
export const ASSET_SCHEMA = 'worldforge.asset.v1';

export const ENGINE_VERSIONS = Object.freeze({
  building: '1.0.0',          // protected legacy baseline
  buildingLatest: '1.3.0',   // RPG Architecture Pack II / protected current building baseline
  landscape: '0.2.0',
  prop: '0.1.0',
  terrain: '0.1.0',
  surface: '0.1.0',
  field: '0.3.0',
  foliage: '0.1.0',
  traversal: '0.1.0'
});

export const DEFAULT_BUILDING = Object.freeze({
  schema: RECIPE_SCHEMA,
  generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.buildingLatest,
  type: 'building',
  seed: 48127,
  family: 'shop',
  style: 'smallWoodTown',
  material: 'auto',
  condition: 'clean',
  width: 6.5,
  depth: 4.75,
  floors: 2,
  roof: 'gable',
  pitch: 42,
  template: 'auto',
  facade: 'auto',
  wealth: 'modest',
  age: 'mature',
  construction: 'auto',
  features: { chimney: true, porch: true, sign: true, extension: true }
});

export const DEFAULT_LANDSCAPE = Object.freeze({
  schema: RECIPE_SCHEMA,
  generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.landscape,
  type: 'landscape', seed: 90211, feature: 'ridge', size: 30, relief: 7,
  roughness: 0.45, terracing: 0.35, path: true, rocks: true, gridResolution: 56
});

export const DEFAULT_PROP = Object.freeze({
  schema: RECIPE_SCHEMA, generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.prop, type: 'prop', seed: 31415,
  family: 'well', style: 'village', condition: 'clean', scale: 1, variant: 'auto'
});

export const DEFAULT_TERRAIN = Object.freeze({
  schema: RECIPE_SCHEMA, generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.terrain, type: 'terrain', seed: 27182,
  patch: 'grass', size: 12, roughness: 0.18, pathWidth: 2.2, wear: 0.35, gridResolution: 32
});

export const DEFAULT_SURFACE = Object.freeze({
  schema: RECIPE_SCHEMA, generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.surface, type: 'surface', seed: 16180,
  surface: 'grass', size: 24, variation: 0.55, wear: 0.22,
  pathPattern: 'none', pathWidth: 2.4, pathMaterial: 'dirt',
  detailDensity: 0.42, edgeBlend: true, gridResolution: 40
});




export const DEFAULT_TRAVERSAL = Object.freeze({
  schema: RECIPE_SCHEMA, generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.traversal, type: 'traversal', seed: 84512,
  family: 'bridge', style: 'stone', variant: 'straight',
  width: 3.2, length: 8, height: 2.4, rails: true
});

export const DEFAULT_FOLIAGE = Object.freeze({
  schema: RECIPE_SCHEMA, generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.foliage, type: 'foliage', seed: 61803,
  family: 'tree', biome: 'temperate', variant: 'oak', condition: 'healthy',
  scale: 1, density: 0.55, spread: 1.0
});

export const DEFAULT_FIELD = Object.freeze({
  schema: RECIPE_SCHEMA, generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.field, type: 'field', seed: 424242,
  preset: 'villageWellSquare', size: 34, density: 0.55,
  surface: 'auto', buildingEngine: ENGINE_VERSIONS.buildingLatest,
  dressing: 0.55, elevation: 0.65, placements: null
});
