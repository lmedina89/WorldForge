export const WORLDFORGE_VERSION = '0.3.0';
export const RECIPE_SCHEMA = 'worldforge.recipe.v1';
export const SCENE_SCHEMA = 'worldforge.scene.v1';
export const ASSET_SCHEMA = 'worldforge.asset.v1';

export const ENGINE_VERSIONS = Object.freeze({
  building: '1.0.0',
  landscape: '0.2.0',
  prop: '0.1.0',
  terrain: '0.1.0'
});

export const DEFAULT_BUILDING = Object.freeze({
  schema: RECIPE_SCHEMA,
  generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.building,
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
  features: { chimney: true, porch: true, sign: true, extension: true }
});

export const DEFAULT_LANDSCAPE = Object.freeze({
  schema: RECIPE_SCHEMA,
  generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.landscape,
  type: 'landscape',
  seed: 90211,
  feature: 'ridge',
  size: 30,
  relief: 7,
  roughness: 0.45,
  terracing: 0.35,
  path: true,
  rocks: true,
  gridResolution: 56
});

export const DEFAULT_PROP = Object.freeze({
  schema: RECIPE_SCHEMA,
  generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.prop,
  type: 'prop',
  seed: 31415,
  family: 'well',
  style: 'village',
  condition: 'clean',
  scale: 1,
  variant: 'auto'
});

export const DEFAULT_TERRAIN = Object.freeze({
  schema: RECIPE_SCHEMA,
  generatorVersion: WORLDFORGE_VERSION,
  engineVersion: ENGINE_VERSIONS.terrain,
  type: 'terrain',
  seed: 27182,
  patch: 'grass',
  size: 12,
  roughness: 0.18,
  pathWidth: 2.2,
  wear: 0.35,
  gridResolution: 32
});
