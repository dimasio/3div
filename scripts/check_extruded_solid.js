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

// Открываем модель
const fileBuffer = readFileSync('test.ifc');
const modelId = api.OpenModel(fileBuffer, true, false);
console.log('modelId:', modelId);

// Получаем IfcExtrudedAreaSolid (это геометрическое представление)
const allLines = api.GetAllLines(modelId);

let solidId = -1;
for (let i = 0; i < allLines.size(); i++) {
  const expressId = allLines.get(i);
  const line = api.GetLine(modelId, expressId);
  if (line?.type !== -1) {
    const typeName = api.GetNameFromTypeCode(line.type);
    if (typeName === 'IfcExtrudedAreaSolid') {
      solidId = expressId;
      break;
    }
  }
}

console.log('IfcExtrudedAreaSolid ID:', solidId);

if (solidId !== -1) {
  const solid = api.GetLine(modelId, solidId);
  console.log('\n=== IfcExtrudedAreaSolid ===');
  console.log('type:', solid.type);
  console.log('keys:', Object.keys(solid));
  console.log('arguments:', solid.arguments);
  
  // Проверяем свойства
  if (solid.Arguments) {
    console.log('\nArguments:');
    for (let i = 0; i < solid.Arguments.length; i++) {
      console.log(`  ${i}:`, solid.Arguments[i]);
    }
  }
  
  // Пробуем GetGeometry
  console.log('\n=== Попытка GetGeometry для IfcExtrudedAreaSolid ===');
  try {
    const geometry = api.GetGeometry(modelId, solidId);
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
}

api.CloseModel(modelId);
console.log('\nDone');