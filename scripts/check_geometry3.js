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

// Получаем все линии
const allLines = api.GetAllLines(modelId);
console.log('Всего линий:', allLines.size());

// Ищем IfcBuildingElement (IfcWall, IfcSlab, IfcBeam, IfcColumn)
const elementTypes = ['IfcWall', 'IfcSlab', 'IfcBeam', 'IfcColumn', 'IfcPlate', 'IfcFurniture'];
let elementId = -1;
let elementName = '';

for (const type of elementTypes) {
  for (let i = 0; i < allLines.size(); i++) {
    const expressId = allLines.get(i);
    const line = api.GetLine(modelId, expressId);
    if (line?.type !== -1) {
      const typeName = api.GetNameFromTypeCode(line.type);
      if (typeName === type) {
        elementId = expressId;
        elementName = typeName;
        break;
      }
    }
  }
  if (elementId !== -1) break;
}

console.log('Выбранный элемент:', elementName, 'ID:', elementId);

// Проверяем свойства элемента
if (elementId !== -1) {
  const line = api.GetLine(modelId, elementId);
  console.log('\n=== Свойства элемента ===');
  console.log('type:', line.type);
  console.log('arguments:', line.arguments?.slice(0, 5));
  
  // Проверяем HasOpenings
  if (line.HasOpenings) {
    console.log('HasOpenings:', line.HasOpenings);
  }
}

// Пробуем GetGeometry
console.log('\n=== Метод: GetGeometry ===');
try {
  const geometry = api.GetGeometry(modelId, elementId);
  console.log('GetGeometry вернул:', geometry);
  if (geometry) {
    console.log('  GetVertexData():', geometry.GetVertexData());
    console.log('  GetIndexData():', geometry.GetIndexData());
    console.log('  GetVertexDataSize():', geometry.GetVertexDataSize());
    console.log('  GetIndexDataSize():', geometry.GetIndexDataSize());
    
    // Проверяем, что это за объект
    console.log('  constructor:', geometry.constructor.name);
    console.log('  __proto__:', Object.getPrototypeOf(geometry));
  }
} catch (e) {
  console.log('  GetGeometry error:', e.message);
}

// Попробуем GetRawLineData
console.log('\n=== Метод: GetRawLineData ===');
try {
  const rawLine = api.GetRawLineData(modelId, elementId);
  console.log('GetRawLineData:', JSON.stringify(rawLine, null, 2));
} catch (e) {
  console.log('  GetRawLineData error:', e.message);
}

api.CloseModel(modelId);
console.log('\nDone');