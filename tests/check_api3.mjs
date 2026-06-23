import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wasmPath = join(__dirname, '..', 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
const wasmUrl = 'file://' + wasmPath;

const api = new IfcAPI();
await api.Init(() => wasmUrl);

console.log('Init OK');

// Попробуем GetLines
try {
  const lines = api.GetLines(0, 23); // IfcRelDefinesByProperties
  console.log('GetLines(23) size:', lines.size());
} catch (e) {
  console.log('GetLines(23) error:', e.message);
}

// Попробуем GetLines с пустым массивом
try {
  const lines2 = api.GetLines(0, []);
  console.log('GetLines([]) size:', lines2.size());
} catch (e) {
  console.log('GetLines([]) error:', e.message);
}

// Попробуем GetLines с типом
try {
  const lines3 = api.GetLines(0, [23]);
  console.log('GetLines([23]) size:', lines3.size());
} catch (e) {
  console.log('GetLines([23]) error:', e.message);
}