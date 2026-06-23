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

// Попробуем GetLines с массивом типов
try {
  const lines = api.GetLines(modelId, [23]); // IfcRelDefinesByProperties
  console.log('GetLines([23]) length:', lines.length);
  for (let i = 0; i < lines.length; i++) {
    console.log('  Line', i, ':', lines[i]);
  }
} catch (e) {
  console.log('GetLines([23]) error:', e.message);
}

// Попробуем получить все линии
try {
  const allLines = api.GetAllLines(modelId);
  console.log('GetAllLines length:', allLines.length);
  for (let i = 0; i < allLines.length; i++) {
    console.log('  Line', i, ':', allLines[i]);
  }
} catch (e) {
  console.log('GetAllLines error:', e.message);
}