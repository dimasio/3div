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

// Проверяем, есть ли метод LoadAllGeometry
if (api.LoadAllGeometry) {
  console.log('Вызываем LoadAllGeometry...');
  api.LoadAllGeometry(modelId);
}

// Получаем IfcWall
const wallId = 1304951;
console.log('\n=== Получаем GetFlatMesh ===');
const flatMesh = api.GetFlatMesh(modelId, wallId, false);
const placedGeom = flatMesh.geometries.get(0);

console.log('geometryExpressID:', placedGeom.geometryExpressID);

// Пытаемся получить геометрию через GetGeometry по geometryExpressID
const geomId = placedGeom.geometryExpressID;
console.log('\n=== GetGeometry по geometryExpressID:', geomId, '===');
const geometry = api.GetGeometry(modelId, geomId);
console.log('geometry:', geometry ? 'exist' : 'not found');

if (geometry) {
  console.log('vertexDataSize:', geometry.GetVertexDataSize());
  console.log('indexDataSize:', geometry.GetIndexDataSize());
  
  // Пытаемся читать через WASM HEAP
  const vertexPtr = geometry.GetVertexData();
  const indexPtr = geometry.GetIndexData();
  console.log('vertexPtr:', vertexPtr);
  console.log('indexPtr:', indexPtr);
  
  const heapF32 = api.wasmModule.HEAPF32;
  const heapU32 = api.wasmModule.HEAPU32;
  
  // Проверяем размеры
  const vertexDataSize = geometry.GetVertexDataSize();
  const indexDataSize = geometry.GetIndexDataSize();
  const vertexCount = vertexDataSize / 4;
  const indexCount = indexDataSize / 4;
  
  console.log('vertexCount:', vertexCount);
  console.log('indexCount:', indexCount);
  
  // Копируем данные
  if (vertexCount > 0) {
    const vertices = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      vertices[i] = heapF32[vertexPtr / 4 + i];
    }
    console.log('vertices[:10]:', Array.from(vertices).slice(0, 10));
  }
  
  if (indexCount > 0) {
    const indices = new Uint32Array(indexCount);
    for (let i = 0; i < indexCount; i++) {
      indices[i] = heapU32[indexPtr / 4 + i];
    }
    console.log('indices[:20]:', Array.from(indices).slice(0, 20));
  }
}

api.CloseModel(modelId);
console.log('\nDone');