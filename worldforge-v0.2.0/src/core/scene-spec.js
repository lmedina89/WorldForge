import { SCENE_SCHEMA, WORLDFORGE_VERSION } from './schema.js';

export function createSceneSpec(recipe) {
  return {
    schema: SCENE_SCHEMA,
    generatorVersion: WORLDFORGE_VERSION,
    recipe,
    materials: {},
    nodes: [],
    metadata: {},
    validation: { errors: [], warnings: [], stats: {} }
  };
}

export function defineMaterial(spec, id, data) {
  spec.materials[id] = { id, roughness: 0.85, metalness: 0, flatShading: true, ...data };
  return id;
}

export function addBox(spec, name, size, position, material, rotation = [0,0,0], tags = []) {
  spec.nodes.push({ kind: 'box', name, size, position, rotation, material, tags });
}

export function addMesh(spec, name, vertices, faces, material, position = [0,0,0], rotation = [0,0,0], tags = []) {
  spec.nodes.push({ kind: 'mesh', name, vertices, faces, position, rotation, material, tags });
}

export function addDodecahedron(spec, name, radius, position, scale, rotation, material, tags = []) {
  spec.nodes.push({ kind: 'dodecahedron', name, radius, position, scale, rotation, material, tags });
}

export function validateSceneSpec(spec) {
  const errors = [];
  const warnings = [];
  let vertexCount = 0;
  let triangleCount = 0;
  for (const node of spec.nodes) {
    const allNums = JSON.stringify(node).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || [];
    if (allNums.some(v => !Number.isFinite(Number(v)))) errors.push(`${node.name}: non-finite numeric value`);
    if (!spec.materials[node.material]) errors.push(`${node.name}: missing material ${node.material}`);
    if (node.kind === 'mesh') {
      vertexCount += node.vertices.length;
      triangleCount += node.faces.length;
      for (const f of node.faces) {
        if (f.length !== 3) errors.push(`${node.name}: non-triangle face`);
        if (f.some(i => i < 0 || i >= node.vertices.length)) errors.push(`${node.name}: invalid face index`);
      }
    } else if (node.kind === 'box') {
      vertexCount += 8; triangleCount += 12;
      if (node.size.some(v => v <= 0)) errors.push(`${node.name}: non-positive box dimension`);
    } else if (node.kind === 'dodecahedron') {
      vertexCount += 20; triangleCount += 36;
    }
  }
  spec.validation = {
    errors,
    warnings,
    stats: { nodeCount: spec.nodes.length, materialCount: Object.keys(spec.materials).length, approxVertexCount: vertexCount, approxTriangleCount: triangleCount }
  };
  return spec.validation;
}
