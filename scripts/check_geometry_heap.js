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

// Проверяем размеры
const vertexDataSize = geometry.GetVertexDataSize();
const indexDataSize = geometry.GetIndexDataSize();

console.log('vertexDataSize:', vertexDataSize);
console.log('indexDataSize:', indexDataSize);

// Попытаемся получить данные через WASM HEAP
const vertexPtr = geometry.GetVertexData();
const indexPtr = geometry.GetIndexData();

console.log('vertexPtr:', vertexPtr);
console.log('indexPtr:', indexPtr);

// Получаем размер одного float (4 байта)
const floatSize = 4;
const vertexCount = vertexDataSize / floatSize;
const indexCount = indexDataSize / floatSize;

console.log('vertexCount:', vertexCount);
console.log('indexCount:', indexCount);

// Используем HEAPF32 для чтения данных
console.log('\n=== Использование HEAPF32 ===');
const heapF32 = api.wasmModule.HEAPF32;
console.log('heapF32.length:', heapF32.length);

// Читаем vertices (начинаются с vertexPtr/4)
const vertexStart = Math.floor(vertexPtr / floatSize);
console.log('vertexStart:', vertexStart);

if (vertexStart < heapF32.length) {
  const vertices = heapF32.subarray(vertexStart, vertexStart + vertexCount);
  console.log('vertices:', vertices);
  console.log('vertices.length:', vertices.length);
}

// Читаем indices через HEAPU32
console.log('\n=== Использование HEAPU32 ===');
const heapU32 = api.wasmModule.HEAPU32;
console.log('heapU32.length:', heapU32.length);

// Индексы - это Uint32, но GetIndexData возвращает Float32 pointer
// Предполагаем, что индексы идут после вершин
const indexStart = Math.floor(indexPtr / floatSize);
console.log('indexStart:', indexStart);

if (indexStart < heapU32.length) {
  const indices = heapU32.subarray(indexStart, indexStart + indexCount);
  console.log('indices:', indices);
  console.log('indices.length:', indices.length);
}

api.CloseModel(modelId);
console.log('\nDone');