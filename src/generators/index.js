import { normalizeRecipe } from '../core/recipe.js';
import { generateBuilding } from './building.js';
import { generateLandscape } from './landscape.js';

export function generateScene(input){
  const recipe=normalizeRecipe(input);
  return recipe.type==='landscape'?generateLandscape(recipe):generateBuilding(recipe);
}
