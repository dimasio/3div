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
    // Ищем IfcElement (не IfcAxis2Placement3d, не IfcCartesianPoint, не IfcDirection)
    if (typeName.startsWith('Ifc') && !typeName.includes('Axis') && !typeName.includes('Point') && !typeName.includes('Direction') && !typeName.includes('Profile')) {
      elementId = expressId;
      elementName = typeName;
      break;
    }
  }
}

console.log('Выбранный элемент:', elementName, 'ID:', elementId);

// Пробуем разные методы получения геометрии
console.log('\n=== Метод 1: GetGeometry ===');
try {
  const geometry = api.GetGeometry(modelId, elementId);
  console.log('GetGeometry вернул:', geometry);
  if (geometry) {
    console.log('  GetVertexData():', geometry.GetVertexData());
    console.log('  GetIndexData():', geometry.GetIndexData());
    console.log('  GetVertexDataSize():', geometry.GetVertexDataSize());
    console.log('  GetIndexDataSize():', geometry.GetIndexDataSize());
  }
} catch (e) {
  console.log('  GetGeometry error:', e.message);
}

// Попробуем GetGeometry без LoadAllGeometry, но с GetIndexArray
console.log('\n=== Метод 2: GetIndexArray + GetVertexArray ===');
try {
  const indexArray = api.GetIndexArray(modelId, elementId);
  const vertexArray = api.GetVertexArray(modelId, elementId);
  console.log('GetIndexArray:', indexArray);
  console.log('GetVertexArray:', vertexArray);
  console.log('  indexArray.length:', indexArray?.length);
  console.log('  vertexArray.length:', vertexArray?.length);
} catch (e) {
  console.log('  GetIndexArray error:', e.message);
}

// Попробуем GetGeometry сGetRawLineData
console.log('\n=== Метод 3: Проверка через GetRawLineData ===');
try {
  const rawLine = api.GetRawLineData(modelId, elementId);
  console.log('GetRawLineData:', rawLine);
} catch (e) {
  console.log('  GetRawLineData error:', e.message);
}

api.CloseModel(modelId);
console.log('\nDone');