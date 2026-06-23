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

// Получаем IfcWall
const allLines = api.GetAllLines(modelId);

let wallId = -1;
for (let i = 0; i < allLines.size(); i++) {
  const expressId = allLines.get(i);
  const line = api.GetLine(modelId, expressId);
  if (line?.type !== -1) {
    const typeName = api.GetNameFromTypeCode(line.type);
    if (typeName === 'IfcWall') {
      wallId = expressId;
      break;
    }
  }
}

console.log('IfcWall ID:', wallId);

// Получаем сырые данные элемента
const rawData = api.GetRawLineData(modelId, wallId);
console.log('\n=== Raw Line Data ===');
console.log(JSON.stringify(rawData, null, 2));

// Пытаемся найти ссылки на геометрию
if (rawData.arguments) {
  console.log('\n=== Анализ аргументов ===');
  for (let i = 0; i < rawData.arguments.length; i++) {
    const arg = rawData.arguments[i];
    console.log(`Аргумент ${i}:`, arg);
    if (arg && arg.type === 5) {
      // Это ссылка на другой элемент
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