import { normalizeRecipe } from '../core/recipe.js';
import { attachAssetMetadata } from '../core/asset-schema.js';
import { generateBuilding } from './building.js';
import { generateLandscape } from './landscape.js';
import { generateProp } from './prop.js';
import { generateTerrain } from './terrain.js';

export function generateScene(input){
  const recipe=normalizeRecipe(input);
  let spec;
  if(recipe.type==='landscape') spec=generateLandscape(recipe);
  else if(recipe.type==='prop') spec=generateProp(recipe);
  else if(recipe.type==='terrain') spec=generateTerrain(recipe);
  else spec=generateBuilding(recipe);
  return attachAssetMetadata(spec);
}
