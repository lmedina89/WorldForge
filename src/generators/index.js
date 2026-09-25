import { normalizeRecipe } from '../core/recipe.js';
import { attachAssetMetadata } from '../core/asset-schema.js';
import { attachProductionMetadata } from '../core/production-metadata.js';
import { generateBuilding } from './building.js';
import { generateBuildingV11 } from './building-v1.1.js';
import { generateBuildingV12 } from './building-v1.2.js';
import { generateBuildingV13 } from './building-v1.3.js';
import { generateLandscape } from './landscape.js';
import { generateProp } from './prop.js';
import { generateTerrain } from './terrain.js';
import { generateSurface } from './surface.js';
import { generateFoliage } from './foliage.js';
import { generateTraversal } from './traversal.js';
import { generateField as generateFieldV01 } from './field.js';
import { generateField as generateFieldV02 } from './field-v0.2.js';
import { generateField as generateFieldV03 } from './field-v0.3.js';
import { generateSettlement } from './settlement.js';

export function generateScene(input){
  const recipe=normalizeRecipe(input);
  let spec;
  if(recipe.type==='landscape') spec=generateLandscape(recipe);
  else if(recipe.type==='prop') spec=generateProp(recipe);
  else if(recipe.type==='terrain') spec=generateTerrain(recipe);
  else if(recipe.type==='surface') spec=generateSurface(recipe);
  else if(recipe.type==='foliage') spec=generateFoliage(recipe);
  else if(recipe.type==='traversal') spec=generateTraversal(recipe);
  else if(recipe.type==='field') spec=recipe.engineVersion==='0.1.0'?generateFieldV01(recipe):recipe.engineVersion==='0.2.0'?generateFieldV02(recipe):generateFieldV03(recipe);
  else if(recipe.type==='settlement') spec=generateSettlement(recipe);
  else if(recipe.engineVersion==='1.3.0') spec=generateBuildingV13(recipe);
  else if(recipe.engineVersion==='1.2.0') spec=generateBuildingV12(recipe);
  else if(recipe.engineVersion==='1.1.0') spec=generateBuildingV11(recipe);
  else spec=generateBuilding(recipe);
  attachAssetMetadata(spec);
  return attachProductionMetadata(spec);
}
