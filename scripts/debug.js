import { IfcAPI } from 'web-ifc';
import { readFileSync } from 'fs';

const api = new IfcAPI();
await api.Init(() => 'file://node_modules/web-ifc/web-ifc-node.wasm');
const modelId = api.OpenModel(new Uint8Array(readFileSync('test.ifc')));
console.log('Model ID:', modelId);
console.log('GetGeometricGeometry exists:', typeof api.GetGeometricGeometry);
console.log('GetFlatMesh exists:', typeof api.GetFlatMesh);
console.log('GetGeometry exists:', typeof api.GetGeometry);
console.log('GetAllLines exists:', typeof api.GetAllLines);

const lines = api.GetAllLines(modelId);
console.log('Total lines:', lines.size());

const firstLine = api.GetLine(modelId, lines.get(0));
console.log('First line type:', firstLine.type, api.GetNameFromTypeCode(firstLine.type));

// Попробуем GetGeometry для первого элемента
try {
  const geometry = api.GetGeometry(modelId, firstLine.oid);
  console.log('GetGeometry result:', geometry);
  if (geometry) {
    console.log('  Has vertex data:', geometry.GetVertexDataSize() > 0);
    console.log('  Has index data:', geometry.GetIndexDataSize() > 0);
    geometry.delete();
  }
} catch (e) {
  console.log('GetGeometry error:', e.message);
}

// Попробуем GetFlatMesh
try {
  const flatMesh = api.GetFlatMesh(modelId, firstLine.oid);
  console.log('GetFlatMesh result:', flatMesh);
  if (flatMesh) {
    console.log('  Has geometries:', flatMesh.geometries.size() > 0);
    flatMesh.delete();
  }
} catch (e) {
  console.log('GetFlatMesh error:', e.message);
}

api.CloseModel(modelId);
console.log('Done');