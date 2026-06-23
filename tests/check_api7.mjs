import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wasmPath = join(__dirname, '..', 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
const wasmUrl = 'file://' + wasmPath;

const api = new IfcAPI();
await api.Init(() => wasmUrl);

console.log('Init OK');

// Открываем реальный файл
const ifcPath = join(__dirname, 'fixtures', 'minimal.ifc');
const buffer = readFileSync(ifcPath);
const modelId = api.OpenModel(new Uint8Array(buffer));
console.log('Model opened with ID:', modelId);

// Попробуем GetAllTypesOfModel
try {
  const allTypes = api.GetAllTypesOfModel(modelId);
  console.log('GetAllTypesOfModel:', allTypes);
  console.log('GetAllTypesOfModel length:', allTypes.length);
} catch (e) {
  console.log('GetAllTypesOfModel error:', e.message);
}

// Попробуем GetLines с массивом
try {
  const lines = api.GetLines(modelId, [2391406946]); // IfcWall typeCode
  console.log('GetLines([IfcWall]) length:', lines.length);
} catch (e) {
  console.log('GetLines error:', e.message);
}

// Попробуем GetLines с пустым массивом
try {
  const lines = api.GetLines(modelId, []);
  console.log('GetLines([]) length:', lines.length);
} catch (e) {
  console.log('GetLines([]) error:', e.message);
}

// Попробуем GetLines без аргументов
try {
  const lines = api.GetLines(modelId);
  console.log('GetLines() length:', lines.length);
} catch (e) {
  console.log('GetLines() error:', e.message);
}