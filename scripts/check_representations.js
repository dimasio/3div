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

// Получаем IfcWall -> IfcProductDefinitionShape -> IfcShapeRepresentation
const wallId = 1304951;
const rawData = api.GetRawLineData(modelId, wallId);
const shapeId = rawData.arguments[6].value;

console.log('IfcProductDefinitionShape ID:', shapeId);

const shapeData = api.GetRawLineData(modelId, shapeId);
const representations = shapeData.arguments[2];

console.log('\n=== IfcShapeRepresentation IDs ===');
for (let i = 0; i < representations.length; i++) {
  const repId = representations[i].value;
  console.log(`\nRepresentation ${i}: ID ${repId}`);
  
  const repData = api.GetRawLineData(modelId, repId);
  console.log('  Data:', JSON.stringify(repData, null, 2));
  
  // Проверяем тип
  const typeName = repData.type ? api.GetNameFromTypeCode(repData.type) : 'unknown';
  console.log('  typeName:', typeName);
}

api.CloseModel(modelId);
console.log('\nDone');