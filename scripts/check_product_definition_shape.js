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

// Получаем IfcWall и его IfcProductDefinitionShape
const wallId = 1304951;
const rawData = api.GetRawLineData(modelId, wallId);
const shapeId = rawData.arguments[6].value;

console.log('IfcProductDefinitionShape ID:', shapeId);

const shapeData = api.GetRawLineData(modelId, shapeId);
console.log('\n=== IfcProductDefinitionShape ===');
console.log(JSON.stringify(shapeData, null, 2));

// Анализируем аргументы
if (shapeData.arguments) {
  console.log('\n=== Аргументы ===');
  for (let i = 0; i < shapeData.arguments.length; i++) {
    const arg = shapeData.arguments[i];
    console.log(`Аргумент ${i}:`, arg);
    if (arg && arg.type === 5) {
      const refData = api.GetRawLineData(modelId, arg.value);
      console.log(`  Ссылка на ID ${arg.value}:`);
      console.log(`    type: ${refData.type}`);
      const typeName = refData.type ? api.GetNameFromTypeCode(refData.type) : 'unknown';
      console.log(`    typeName: ${typeName}`);
    }
  }
}

api.CloseModel(modelId);
console.log('\nDone');