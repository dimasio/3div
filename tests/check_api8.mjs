import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wasmPath = join(__dirname, '..', 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
const wasmUrl = 'file://' + wasmPath;

const api = new IfcAPI();
await api.Init(() => wasmUrl);

console.log('Init OK');

// Открываем реальный файл
const ifcPath = join(__dirname, 'fixtures', 'minimal.ifc');
const buffer = readFileSync(ifcPath);
const modelId = api.OpenModel(new Uint8Array(buffer));
console.log('Model opened with ID:', modelId);

// Получаем все линии
const allLines = [...api.GetAllLines(modelId)];
console.log('Всего линий:', allLines.length);

// Для каждого элемента пытаемся получить геометрию
for (const expressId of allLines) {
  const elementData = api.GetLine(modelId, expressId);
  const typeName = api.GetNameFromTypeCode(elementData.type);
  
  console.log(`\n=== Элемент expressId=${expressId}, type=${typeName} ===`);
  
  // Пробуем GetGeometry
  try {
    const geometry = api.GetGeometry(modelId, expressId);
    console.log('GetGeometry:', geometry);
    if (geometry) {
      const vertexCount = geometry.GetVertexDataSize() / 4;
      const indexCount = geometry.GetIndexDataSize() / 4;
      console.log(`  Vertex data size: ${geometry.GetVertexDataSize()}`);
      console.log(`  Index data size: ${geometry.GetIndexDataSize()}`);
      console.log(`  Vertex count: ${vertexCount}`);
      console.log(`  Index count: ${indexCount}`);
    }
  } catch (e) {
    console.log('GetGeometry error:', e.message);
  }
  
  // Пробуем GetFlatMesh
  try {
    const flatMesh = api.GetFlatMesh(modelId, expressId);
    console.log('GetFlatMesh:', flatMesh);
    console.log('  geometries:', flatMesh.geometries);
  } catch (e) {
    console.log('GetFlatMesh error:', e.message);
  }
}