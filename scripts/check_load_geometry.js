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

// Загружаем всю геометрию
console.log('Загружаем всю геометрию...');
api.LoadAllGeometry(modelId);

// Получаем первую линию (IfcElement)
const allLines = api.GetAllLines(modelId);
console.log('Всего линий:', allLines.size());

let elementId = -1;
let elementName = '';
for (let i = 0; i < allLines.size(); i++) {
  const expressId = allLines.get(i);
  const line = api.GetLine(modelId, expressId);
  if (line?.type !== -1) {
    const typeName = api.GetNameFromTypeCode(line.type);
    if (typeName.startsWith('Ifc') && !typeName.includes('Point') && !typeName.includes('Axis')) {
      elementId = expressId;
      elementName = typeName;
      break;
    }
  }
}

console.log('Выбранный элемент:', elementName, 'ID:', elementId);

// Проверяем GetGeometry
console.log('\n=== Проверка GetGeometry после LoadAllGeometry ===');
const geometry = api.GetGeometry(modelId, elementId);
console.log('GetGeometry вернул:', geometry);
console.log('Тип:', typeof geometry);

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
  
  // Попробуем GetVertexArray
  try {
    const vertexArray = api.GetVertexArray(modelId, elementId);
    console.log('GetVertexArray():', vertexArray);
    console.log('Длина:', vertexArray?.length);
  } catch (e) {
    console.log('GetVertexArray error:', e.message);
  }
}

api.CloseModel(modelId);
console.log('\nDone');