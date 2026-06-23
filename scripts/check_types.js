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

// Получаем все типы элементов
const allLines = api.GetAllLines(modelId);
console.log('Всего линий:', allLines.size());

const typeCounts = new Map();
for (let i = 0; i < allLines.size(); i++) {
  const expressId = allLines.get(i);
  const line = api.GetLine(modelId, expressId);
  if (line?.type !== -1) {
    const typeName = api.GetNameFromTypeCode(line.type);
    typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);
  }
}

console.log('\n=== Все типы элементов ===');
let count = 0;
for (const [type, num] of typeCounts) {
  console.log(`${type}: ${num}`);
  count++;
  if (count >= 50) break;
}

// Проверяем, есть ли IfcElement (элементы с геометрией)
const elementTypes = ['IfcWall', 'IfcSlab', 'IfcBeam', 'IfcColumn', 'IfcPlate', 'IfcFurniture', 'IfcDoor', 'IfcWindow'];
console.log('\n=== Ищем элементы с геометрией ===');
for (const type of elementTypes) {
  const count = typeCounts.get(type) || 0;
  console.log(`${type}: ${count} шт.`);
}

api.CloseModel(modelId);
console.log('\nDone');