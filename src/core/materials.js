import { defineMaterial } from './scene-spec.js';

export const MATERIAL_PALETTES = {
  wood: { wall:'#8a6646', wallDark:'#674a35', timber:'#4d3426', trim:'#a77a52', roof:'#76523b', roofDark:'#533a2f' },
  timberPlaster: { wall:'#c9bda3', wallDark:'#a69982', timber:'#684633', trim:'#8a5d3d', roof:'#99423b', roofDark:'#6e302f' },
  stone: { wall:'#85898d', wallDark:'#686c70', timber:'#554338', trim:'#a7adb5', roof:'#565d62', roofDark:'#3f4549' },
  brick: { wall:'#9a5f4f', wallDark:'#73493f', timber:'#4b3830', trim:'#b88b75', roof:'#5e4740', roofDark:'#44332f' },
  metal: { wall:'#777c7c', wallDark:'#5c6061', timber:'#4e5354', trim:'#979d9d', roof:'#565d60', roofDark:'#414749' }
};

export function resolveBuildingMaterial(recipe) {
  if (recipe.material !== 'auto') return recipe.material;
  if (recipe.style === 'smallWoodTown' || recipe.style === 'rusticVillage' || recipe.style === 'frontierTown' || recipe.family === 'shack' || recipe.family === 'barn' || recipe.family === 'peasantHouse' || recipe.family === 'stable') return 'wood';
  if (recipe.style === 'stoneTown' || recipe.style === 'fortifiedStone' || recipe.style === 'castleKeep' || recipe.style === 'monastery') return 'stone';
  if (recipe.style === 'industrial') return 'metal';
  if (recipe.style === 'abandonedEdge') return recipe.seed % 2 ? 'wood' : 'brick';
  if (recipe.style === 'oldRpgVillage') return 'timberPlaster';
  return 'timberPlaster';
}

export function installBuildingMaterials(spec, recipe) {
  const key = resolveBuildingMaterial(recipe);
  const p = MATERIAL_PALETTES[key] || MATERIAL_PALETTES.timberPlaster;
  defineMaterial(spec,'wall',{color:p.wall});
  defineMaterial(spec,'wallDark',{color:p.wallDark});
  defineMaterial(spec,'timber',{color:p.timber});
  defineMaterial(spec,'trim',{color:p.trim});
  defineMaterial(spec,'roof',{color:p.roof});
  defineMaterial(spec,'roofDark',{color:p.roofDark});
  defineMaterial(spec,'stone',{color:'#777d83'});
  defineMaterial(spec,'stoneLight',{color:'#a7adb5'});
  defineMaterial(spec,'glass',{color:'#4a7896',roughness:0.2,metalness:0.05});
  defineMaterial(spec,'board',{color:'#705036'});
  defineMaterial(spec,'deadGreen',{color:'#667052'});
  defineMaterial(spec,'rust',{color:'#784c3a',roughness:0.95});
  defineMaterial(spec,'dark',{color:'#35393b'});
  return key;
}

export function installLandscapeMaterials(spec, feature) {
  defineMaterial(spec,'terrain',{color:feature==='ravine'?'#73624d':'#657356'});
  defineMaterial(spec,'rock',{color:'#62666a'});
  defineMaterial(spec,'path',{color:'#826d53'});
}

export function installPropMaterials(spec, style='village') {
  const wood = style==='rough' ? '#6a4a31' : '#7c5839';
  const woodDark = style==='rough' ? '#4d3528' : '#50382a';
  const stone = style==='stone' ? '#7f8589' : '#8a8577';
  defineMaterial(spec,'propWood',{color:wood});
  defineMaterial(spec,'propWoodDark',{color:woodDark});
  defineMaterial(spec,'propStone',{color:stone});
  defineMaterial(spec,'propStoneLight',{color:'#a9aa9e'});
  defineMaterial(spec,'propMetal',{color:'#555b5d',metalness:.25});
  defineMaterial(spec,'propRope',{color:'#9c7a4f'});
  defineMaterial(spec,'propCloth',{color:'#9d5b45'});
  defineMaterial(spec,'propGreen',{color:'#6d8657'});
  defineMaterial(spec,'propDirt',{color:'#765f47'});
  defineMaterial(spec,'propDark',{color:'#333637'});
}

export function installTerrainPatchMaterials(spec, patch='grass') {
  defineMaterial(spec,'groundGrass',{color:'#748d58'});
  defineMaterial(spec,'groundGrassDark',{color:'#61764b'});
  defineMaterial(spec,'groundDirt',{color:'#8b7456'});
  defineMaterial(spec,'groundDirtDark',{color:'#6e5942'});
  defineMaterial(spec,'groundStone',{color:'#88877b'});
  defineMaterial(spec,'groundWear',{color:'#9b8768'});
}

export function installSurfaceMaterials(spec, surface='grass', pathMaterial='dirt') {
  const base = {
    grass:['#748d58','#819962','#61764b'],
    dirt:['#8b7456','#9a8262','#6e5942'],
    wornVillage:['#7f825e','#93836a','#666a4e'],
    stone:['#85867f','#99998f','#6e706b'],
    cobblestone:['#797b76','#8c8d86','#646761'],
    mud:['#665540','#735f46','#514334'],
    sand:['#b89a66','#c7aa76','#967b50'],
    rocky:['#72746d','#82847c','#5c5f59']
  }[surface] || ['#748d58','#819962','#61764b'];
  const path = {
    dirt:['#8b7456','#6e5942'],
    stone:['#898a84','#6c6e69'],
    cobblestone:['#7b7d78','#62645f'],
    sand:['#b89a66','#967b50']
  }[pathMaterial] || ['#8b7456','#6e5942'];
  defineMaterial(spec,'surfaceBase',{color:base[0]});
  defineMaterial(spec,'surfaceLight',{color:base[1]});
  defineMaterial(spec,'surfaceDark',{color:base[2]});
  defineMaterial(spec,'surfacePath',{color:path[0]});
  defineMaterial(spec,'surfacePathDark',{color:path[1]});
  defineMaterial(spec,'surfaceStone',{color:'#777a74'});
  defineMaterial(spec,'surfaceStoneLight',{color:'#97998f'});
  defineMaterial(spec,'surfaceGreen',{color:'#5f7c4c'});
  defineMaterial(spec,'surfaceFlower',{color:'#d7c56f'});
  defineMaterial(spec,'surfaceFlower2',{color:'#b58b9b'});
  defineMaterial(spec,'surfaceWater',{color:'#547d86',roughness:.35,metalness:.02});
}
