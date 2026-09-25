export const WORLDFORGE_VERSION = '0.2.0';
export const RECIPE_SCHEMA = 'worldforge.recipe.v1';
export const SCENE_SCHEMA = 'worldforge.scene.v1';

export const DEFAULT_BUILDING = Object.freeze({
  schema: RECIPE_SCHEMA,
  generatorVersion: WORLDFORGE_VERSION,
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
