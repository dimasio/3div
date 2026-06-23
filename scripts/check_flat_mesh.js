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

const modelId = api.OpenModel(new Uint8Array(readFileSync('test.ifc')));
console.log('Модель открыта, ID:', modelId);

// Получаем все линии
const allLines = api.GetAllLines(modelId);
console.log('Всего линий:', allLines.size());

// Ищем IfcBuildingElement (IfcWall, IfcSlab, IfcBeam, IfcColumn)
const elementTypes = ['IfcWall', 'IfcSlab', 'IfcBeam', 'IfcColumn'];
let elementId = -1;
let elementName = '';

for (const type of elementTypes) {
  for (let i = 0; i < allLines.size(); i++) {
    const expressId = allLines.get(i);
    const line = api.GetLine(modelId, expressId);
    if (line?.type !== -1) {
      const typeName = api.GetNameFromTypeCode(line.type);
      if (typeName === type) {
        elementId = expressId;
        elementName = typeName;
        break;
      }
    }
  }
  if (elementId !== -1) break;
}

console.log('Выбранный элемент:', elementName, 'ID:', elementId);

// Попробуем GetFlatMesh
console.log('\n=== Метод: GetFlatMesh ===');
try {
  const mesh = api.GetFlatMesh(modelId, elementId, 0);
  console.log('GetFlatMesh вернул:', mesh);
  console.log('  constructor:', mesh?.constructor?.name);
  console.log('  keys:', Object.keys(mesh || {}));
  
  if (mesh) {
    // Попробуем получить данные
    console.log('  GetVertexData:', typeof mesh.GetVertexData);
    console.log('  GetIndexData:', typeof mesh.GetIndexData);
    
    const vertices = mesh.GetVertexData?.();
    const indices = mesh.GetIndexData?.();
    
    console.log('  GetVertexData():', vertices);
    console.log('  GetIndexData():', indices);
    
    if (vertices && vertices.length > 0) {
      console.log('  vertices.length:', vertices.length);
      console.log('  vertices sample:', vertices.slice(0, 10));
    }
    
    if (indices && indices.length > 0) {
      console.log('  indices.length:', indices.length);
      console.log('  indices sample:', indices.slice(0, 10));
    }
  }
} catch (e) {
  console.log('  GetFlatMesh error:', e.message);
}

// Попробуем GetGeometry с GetVertexDataSize
console.log('\n=== Метод: GetGeometry с GetVertexDataSize ===');
try {
  const geometry = api.GetGeometry(modelId, elementId);
  const vertexSize = geometry.GetVertexDataSize();
  const indexSize = geometry.GetIndexDataSize();
  console.log('  GetVertexDataSize():', vertexSize);
  console.log('  GetIndexDataSize():', indexSize);
  
  if (vertexSize > 0) {
    const vertices = geometry.GetVertexData();
    const indices = geometry.GetIndexData();
    console.log('  vertices:', vertices);
    console.log('  indices:', indices);
  }
} catch (e) {
  console.log('  GetGeometry error:', e.message);
}

api.CloseModel(modelId);
console.log('\nDone');