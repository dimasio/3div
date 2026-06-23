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

console.log('IfcWall ID:', wallId);

// Попытка получить геометрию через GetFlatMesh для всего элемента
console.log('\n=== GetFlatMesh для IfcWall ===');
const flatMesh = api.GetFlatMesh(modelId, wallId, false);
console.log('flatMesh:', flatMesh);

// Получаем geometries
const geometries = flatMesh.geometries;
console.log('\n=== geometries.size():', geometries.size());

// Попытка получить IfcPlacedGeometry через get()
const placedGeom = geometries.get(0);
console.log('\n=== placedGeom (get(0)):');
console.log('  placedGeom:', placedGeom);
console.log('  type:', typeof placedGeom);
console.log('  keys:', Object.keys(placedGeom));

// Получаем geometryExpressID
const geomId = placedGeom.geometryExpressID;
console.log('\n=== geometryExpressID:', geomId);

// Попытка получить геометрию через GetGeometry по этому ID
console.log('\n=== GetGeometry для geometryExpressID ===');
const geometry = api.GetGeometry(modelId, geomId);
console.log('geometry:', geometry);
console.log('  GetVertexDataSize():', geometry.GetVertexDataSize());
console.log('  GetIndexDataSize():', geometry.GetIndexDataSize());

// Проверяем GetVertexData и GetIndexData
if (geometry.GetVertexData) {
  const vertices = geometry.GetVertexData();
  console.log('  GetVertexData():', vertices);
  console.log('  vertices type:', typeof vertices);
  console.log('  vertices length:', vertices?.length);
}
if (geometry.GetIndexData) {
  const indices = geometry.GetIndexData();
  console.log('  GetIndexData():', indices);
  console.log('  indices type:', typeof indices);
  console.log('  indices length:', indices?.length);
}

api.CloseModel(modelId);
console.log('\nDone');