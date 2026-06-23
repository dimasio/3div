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

// Получаем IfcWall и его геометрическое представление
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

if (wallId !== -1) {
  const wall = api.GetLine(modelId, wallId);
  console.log('\n=== IfcWall properties ===');
  console.log('type:', wall.type);
  console.log('HasObjectPlacement:', wall.HasObjectPlacement);
  console.log('HasGeometry:', wall.HasGeometry);
  
  // GetGeometryRepresentation
  if (wall.HasGeometry) {
    const geometryId = wall.HasGeometry;
    console.log('\n=== Геометрическое представление ID ===');
    console.log('geometryId:', geometryId);
    
    const geomRep = api.GetLine(modelId, geometryId);
    console.log('type:', geomRep?.type);
    console.log('Name:', geomRep?.Name);
    console.log('Representations:', geomRep?.Representations);
    console.log('Items:', geomRep?.Items);
    
    // Проверяем Items
    if (geomRep?.Items) {
      console.log('\n=== Items ===');
      for (let i = 0; i < geomRep.Items.length; i++) {
        const item = geomRep.Items[i];
        console.log(`Item ${i}:`);
        console.log('  type:', item?.type);
        const typeName = item?.type ? api.GetNameFromTypeCode(item.type) : 'unknown';
        console.log('  typeName:', typeName);
        console.log('  value:', item);
      }
    }
  }
  
  // Пробуем GetGeometry
  console.log('\n=== Попытка GetGeometry для IfcWall ===');
  try {
    const geometry = api.GetGeometry(modelId, wallId);
    console.log('GetGeometry:', geometry);
    console.log('  GetVertexDataSize():', geometry.GetVertexDataSize());
    console.log('  GetIndexDataSize():', geometry.GetIndexDataSize());
    
    const vertices = geometry.GetVertexData();
    const indices = geometry.GetIndexData();
    console.log('  vertices:', vertices);
    console.log('  indices:', indices);
    
    if (vertices && vertices.length > 0) {
      console.log('  vertices.length:', vertices.length);
      console.log('  vertices sample:', vertices.slice(0, 10));
    }
    
    if (indices && indices.length > 0) {
      console.log('  indices.length:', indices.length);
      console.log('  indices sample:', indices.slice(0, 10));
    }
  } catch (e) {
    console.log('  GetGeometry error:', e.message);
  }
}

api.CloseModel(modelId);
console.log('\nDone');