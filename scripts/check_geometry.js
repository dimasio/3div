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

const modelId = api.OpenModel(new Uint8Array(readFileSync('test.ifc')));
console.log('Модель открыта, ID:', modelId);

// Получаем первую линию
const allLines = api.GetAllLines(modelId);
console.log('Всего линий:', allLines.size());

// Ищем первый IfcElement
let firstElementId = -1;
for (let i = 0; i < Math.min(10000, allLines.size()); i++) {
  const expressId = allLines.get(i);
  const line = api.GetLine(modelId, expressId);
  if (line?.type !== -1) {
    const typeName = api.GetNameFromTypeCode(line.type);
    if (typeName.startsWith('Ifc')) {
      firstElementId = expressId;
      console.log('Первый элемент:', typeName, 'ID:', firstElementId);
      break;
    }
  }
}

if (firstElementId === -1) {
  console.log('Элементы не найдены');
  api.CloseModel(modelId);
  process.exit(1);
}

// Проверяем GetGeometry
console.log('\n=== Проверка GetGeometry ===');
const geometry = api.GetGeometry(modelId, firstElementId);
console.log('GetGeometry вернул:', geometry);
console.log('Тип:', typeof geometry);
console.log('Это null?', geometry === null);
console.log('Это undefined?', geometry === undefined);

if (geometry) {
  console.log('\n=== Свойства geometry ===');
  console.log('Keys:', Object.keys(geometry));
  console.log('Has GetVertexData?', typeof geometry.GetVertexData);
  console.log('Has GetIndexData?', typeof geometry.GetIndexData);
  console.log('Has GetVertexDataSize?', typeof geometry.GetVertexDataSize);
  console.log('Has GetIndexDataSize?', typeof geometry.GetIndexDataSize);
  
  try {
    const vertexData = geometry.GetVertexData();
    console.log('GetVertexData():', vertexData);
    console.log('Длина:', vertexData?.length);
  } catch (e) {
    console.log('GetVertexData error:', e.message);
  }
  
  try {
    const indexData = geometry.GetIndexData();
    console.log('GetIndexData():', indexData);
    console.log('Длина:', indexData?.length);
  } catch (e) {
    console.log('GetIndexData error:', e.message);
  }
  
  try {
    const vertexSize = geometry.GetVertexDataSize();
    console.log('GetVertexDataSize():', vertexSize);
  } catch (e) {
    console.log('GetVertexDataSize error:', e.message);
  }
  
  try {
    const indexSize = geometry.GetIndexDataSize();
    console.log('GetIndexDataSize():', indexSize);
  } catch (e) {
    console.log('GetIndexDataSize error:', e.message);
  }
}

api.CloseModel(modelId);
console.log('\nDone');