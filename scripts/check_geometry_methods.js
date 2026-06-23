import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const wasmPath = join(projectRoot, 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
const wasmUrl = 'file://' + wasmPath;

console.log('Инициализация...');
const api = new IfcAPI();
await api.Init(() => wasmUrl);

const fileBuffer = readFileSync('test.ifc');
const modelId = api.OpenModel(fileBuffer, true, false);

// Получаем IfcWall
const wallId = 1304951;
const flatMesh = api.GetFlatMesh(modelId, wallId, false);
const placedGeom = flatMesh.geometries.get(0);
const geomId = placedGeom.geometryExpressID;

// Проверяем методы геометрии
const geometry = api.GetGeometry(modelId, geomId);
console.log('=== Методы IfcGeometry ===');
console.log('keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(geometry)));
console.log('constructor:', geometry.constructor);
console.log('constructor name:', geometry.constructor.name);
console.log('prototype:', Object.getPrototypeOf(geometry));

// Проверяем GetGeometryData
if (geometry.GetGeometryData) {
  console.log('\n=== GetGeometryData ===');
  const data = geometry.GetGeometryData();
  console.log('data:', data);
  console.log('keys:', Object.keys(data));
  console.log('  vertexCount:', data.vertexCount);
  console.log('  indexCount:', data.indexCount);
  console.log('  vertices:', data.vertices);
  console.log('  indices:', data.indices);
  console.log('  vertices type:', typeof data.vertices);
  console.log('  indices type:', typeof data.indices);
}

// Проверяем GetVertices
if (geometry.GetVertices) {
  console.log('\n=== GetVertices ===');
  const verts = geometry.GetVertices();
  console.log('vertices:', verts);
}

// Проверяем GetIndices
if (geometry.GetIndices) {
  console.log('\n=== GetIndices ===');
  const inds = geometry.GetIndices();
  console.log('indices:', inds);
}

api.CloseModel(modelId);
console.log('\nDone');