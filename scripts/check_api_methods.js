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

// Выводим все методы API
console.log('=== Методы IfcAPI ===');
const methods = [];
for (const key in api) {
  if (typeof api[key] === 'function') {
    methods.push(key);
  }
}
console.log(methods.sort().join(', '));

// Проверяем наличие LoadIfcGeometry
console.log('\n=== Проверка LoadIfcGeometry ===');
console.log('LoadIfcGeometry:', typeof api.LoadIfcGeometry);

// Открываем модель
const fileBuffer = readFileSync('test.ifc');
const modelId = api.OpenModel(fileBuffer, true, false);
console.log('modelId:', modelId);

// Получаем IfcWall
const allLines = api.GetAllLines(modelId);

let elementId = -1;
for (let i = 0; i < allLines.size(); i++) {
  const expressId = allLines.get(i);
  const line = api.GetLine(modelId, expressId);
  if (line?.type !== -1) {
    const typeName = api.GetNameFromTypeCode(line.type);
    if (typeName === 'IfcWall') {
      elementId = expressId;
      break;
    }
  }
}

console.log('IfcWall ID:', elementId);

// Попробуем LoadIfcGeometry
if (typeof api.LoadIfcGeometry === 'function') {
  console.log('\n=== Попытка LoadIfcGeometry ===');
  try {
    api.LoadIfcGeometry(modelId, elementId);
    console.log('LoadIfcGeometry вызван успешно');
    
    // Проверяем GetGeometry после LoadIfcGeometry
    const geometry = api.GetGeometry(modelId, elementId);
    console.log('GetGeometry после LoadIfcGeometry:', geometry);
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
    console.log('  LoadIfcGeometry error:', e.message);
  }
}

api.CloseModel(modelId);
console.log('\nDone');