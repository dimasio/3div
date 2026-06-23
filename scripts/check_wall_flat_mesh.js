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
const wallId = 1304951;

console.log('IfcWall ID:', wallId);

// Попытка получить геометрию через GetFlatMesh для всего элемента
console.log('\n=== GetFlatMesh для IfcWall ===');
const flatMesh = api.GetFlatMesh(modelId, wallId, false);
console.log('flatMesh:', flatMesh);
console.log('  constructor:', flatMesh.constructor.name);
console.log('  keys:', Object.keys(flatMesh));

// Проверяем geometries
console.log('\n=== Проверка geometries ===');
if (flatMesh.geometries) {
  console.log('geometries:', flatMesh.geometries);
  console.log('  constructor:', flatMesh.geometries.constructor.name);
  console.log('  size:', flatMesh.geometries.size());
  
  for (let i = 0; i < flatMesh.geometries.size(); i++) {
    const geom = flatMesh.geometries.get(i);
    console.log(`  Geometry ${i}:`);
    console.log('    constructor:', geom.constructor.name);
    console.log('    keys:', Object.keys(geom));
    
    // Проверяем GetVertexData и GetIndexData
    if (geom.GetVertexData) {
      console.log('    GetVertexData():', geom.GetVertexData());
    }
    if (geom.GetIndexData) {
      console.log('    GetIndexData():', geom.GetIndexData());
    }
  }
}

api.CloseModel(modelId);
console.log('\nDone');