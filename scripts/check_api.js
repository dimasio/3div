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

console.log('\nДоступные методы API:');
const methods = Object.getOwnPropertyNames(api.__proto__).sort();
console.log(methods.filter(m => !m.startsWith('_') && typeof api[m] === 'function').join(', '));

// Проверим GetGeometry и GetFlatMesh
const modelId = api.OpenModel(new Uint8Array(readFileSync('test.ifc')));
console.log('\nПроверка GetGeometry:');
try {
  const geometry = api.GetGeometry(modelId, 1);
  console.log('  GetGeometry:', geometry ? 'exists' : 'null');
} catch (e) {
  console.log('  GetGeometry error:', e.message);
}

console.log('\nПроверка GetFlatMesh:');
try {
  const flatMesh = api.GetFlatMesh(modelId, 1);
  console.log('  GetFlatMesh:', flatMesh ? 'exists' : 'null');
  if (flatMesh) {
    console.log('  GetFlatMesh keys:', Object.keys(flatMesh));
    flatMesh.delete();
  }
} catch (e) {
  console.log('  GetFlatMesh error:', e.message);
}

console.log('\nПроверка GetGeometricGeometry:');
try {
  const geom = api.GetGeometricGeometry(modelId, 1);
  console.log('  GetGeometricGeometry:', geom ? 'exists' : 'null');
} catch (e) {
  console.log('  GetGeometricGeometry error:', e.message);
}

api.CloseModel(modelId);
console.log('\nDone');