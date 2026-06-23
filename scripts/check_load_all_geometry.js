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
console.log('=== Проверка LoadAllGeometry ===');
console.log('LoadAllGeometry:', api.LoadAllGeometry ? 'exist' : 'not found');

// Если есть - вызываем
if (api.LoadAllGeometry) {
  console.log('Вызываем LoadAllGeometry...');
  try {
    api.LoadAllGeometry(modelId);
    console.log('LoadAllGeometry выполнен');
  } catch (e) {
    console.log('Ошибка LoadAllGeometry:', e.message);
  }
}

// Получаем IfcWall
const wallId = 1304951;
console.log('\n=== Проверка геометрии для wallId:', wallId, '===');

// Проверяем, есть ли такой элемент
const wall = api.GetLine(modelId, wallId);
console.log('wall:', wall ? 'exist' : 'not found');

if (wall?.Representation) {
  console.log('Representation:', wall.Representation);
  
  // Пробуем GetGeometry
  try {
    const geometry = api.GetGeometry(modelId, wallId);
    console.log('\n=== GetGeometry ===');
    console.log('geometry:', geometry ? 'exist' : 'not found');
    console.log('vertexCount:', geometry.GetVertexDataSize() / 4);
    console.log('indexCount:', geometry.GetIndexDataSize() / 4);
  } catch (e) {
    console.log('Ошибка GetGeometry:', e.message);
  }
}

// Проверяем GetFlatMesh
try {
  console.log('\n=== GetFlatMesh ===');
  const flatMesh = api.GetFlatMesh(modelId, wallId, false);
  console.log('flatMesh:', flatMesh);
  console.log('geometries:', flatMesh.geometries);
  console.log('geometries.size():', flatMesh.geometries.size());
  
  if (flatMesh.geometries.size() > 0) {
    const placedGeom = flatMesh.geometries.get(0);
    console.log('placedGeom:', placedGeom);
  }
} catch (e) {
  console.log('Ошибка GetFlatMesh:', e.message);
}

api.CloseModel(modelId);
console.log('\nDone');