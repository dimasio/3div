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
// В web-ifc данные геометрии возвращаются как указатели в WASM memory
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

// Попытка прочитать данные из WASM memory через ifcApi.wasmModule
console.log('\n=== Попытка прочитать WASM memory ===');
console.log('api.wasmModule:', api.wasmModule);
console.log('api.wasmInstance:', api.wasmInstance);
console.log('api.memory:', api.memory);

// Если есть memory, читаем данные
if (api.memory?.buffer) {
  const memory = new Float32Array(api.memory.buffer);
  console.log('memory.length:', memory.length);
  
  // Читаем vertices (начинаются с vertexPtr/4)
  const vertexStart = Math.floor(vertexPtr / floatSize);
  console.log('vertexStart:', vertexStart);
  
  if (vertexStart < memory.length) {
    const vertices = memory.subarray(vertexStart, vertexStart + vertexCount);
    console.log('vertices:', vertices);
    console.log('vertices.length:', vertices.length);
  }
  
  // Читаем indices (начинаются с indexPtr/4)
  const indexStart = Math.floor(indexPtr / floatSize);
  console.log('indexStart:', indexStart);
  
  if (indexStart < memory.length) {
    const indices = new Uint32Array(memory.buffer, indexStart * floatSize, indexCount);
    console.log('indices:', indices);
    console.log('indices.length:', indices.length);
  }
}

api.CloseModel(modelId);
console.log('\nDone');