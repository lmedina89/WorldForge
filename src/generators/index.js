import { normalizeRecipe } from '../core/recipe.js';
import { attachAssetMetadata } from '../core/asset-schema.js';
import { generateBuilding } from './building.js';
import { generateBuildingV11 } from './building-v1.1.js';
import { generateBuildingV12 } from './building-v1.2.js';
import { generateBuildingV13 } from './building-v1.3.js';
import { generateLandscape } from './landscape.js';
import { generateProp } from './prop.js';
import { generateTerrain } from './terrain.js';

export function generateScene(input){
  const recipe=normalizeRecipe(input);
  let spec;
  if(recipe.type==='landscape') spec=generateLandscape(recipe);
  else if(recipe.type==='prop') spec=generateProp(recipe);
  else if(recipe.type==='terrain') spec=generateTerrain(recipe);
  else if(recipe.engineVersion==='1.3.0') spec=generateBuildingV13(recipe);
  else if(recipe.engineVersion==='1.2.0') spec=generateBuildingV12(recipe);
  else if(recipe.engineVersion==='1.1.0') spec=generateBuildingV11(recipe);
  else spec=generateBuilding(recipe);
  return attachAssetMetadata(spec);
}
