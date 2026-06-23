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
console.log('Размер файла:', fileBuffer.length, 'байт');

// Пробуем разные флаги для OpenModel
// OpenModel(model, throwIfOpen = true, useMetaWeights = false)
console.log('\n=== Открытие с флагами ===');

// Попробуем открыть без метаданных
const modelId1 = api.OpenModel(fileBuffer, true, false);
console.log('modelId1 (without meta):', modelId1);

// Получаем IfcWall
const allLines = api.GetAllLines(modelId1);
console.log('Всего линий:', allLines.size());

let elementId = -1;
let elementName = '';

for (let i = 0; i < allLines.size(); i++) {
  const expressId = allLines.get(i);
  const line = api.GetLine(modelId1, expressId);
  if (line?.type !== -1) {
    const typeName = api.GetNameFromTypeCode(line.type);
    if (typeName === 'IfcWall') {
      elementId = expressId;
      elementName = typeName;
      break;
    }
  }
}

console.log('Выбранный элемент:', elementName, 'ID:', elementId);

// Проверяем GetGeometry
console.log('\n=== Проверка GetGeometry ===');
try {
  const geometry = api.GetGeometry(modelId1, elementId);
  console.log('GetGeometry:', geometry);
  console.log('  GetVertexDataSize():', geometry.GetVertexDataSize());
  console.log('  GetIndexDataSize():', geometry.GetIndexDataSize());
  
  const vertices = geometry.GetVertexData();
  const indices = geometry.GetIndexData();
  console.log('  vertices:', vertices);
  console.log('  indices:', indices);
  
  if (vertices && vertices.length > 0) {
    console.log('  vertices.length:', vertices.length);
    console.log('  vertices sample:', vertices.slice(0, 10));
  }
  
  if (indices && indices.length > 0) {
    console.log('  indices.length:', indices.length);
    console.log('  indices sample:', indices.slice(0, 10));
  }
} catch (e) {
  console.log('  GetGeometry error:', e.message);
}

api.CloseModel(modelId1);
console.log('\nDone');