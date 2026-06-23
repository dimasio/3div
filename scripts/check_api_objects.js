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

// Пробуем GetGeometry
console.log('\n=== Попытка GetGeometry ===');
const geometry = api.GetGeometry(modelId, elementId);
console.log('geometry:', geometry);
console.log('geometry type:', typeof geometry);
console.log('geometry constructor:', geometry?.constructor?.name);
console.log('geometry __proto__:', Object.getPrototypeOf(geometry));

// Проверяем методы у прототипа
const proto = Object.getPrototypeOf(geometry);
console.log('proto keys:', Object.keys(proto));

// Проверяем __proto__.__proto__
const proto2 = Object.getPrototypeOf(proto);
console.log('proto2:', proto2);
console.log('proto2 keys:', Object.keys(proto2));

// Проверяем свойства
console.log('\n=== Проверка свойств geometry ===');
for (const key in geometry) {
  console.log(key + ':', geometry[key]);
}

api.CloseModel(modelId);
console.log('\nDone');