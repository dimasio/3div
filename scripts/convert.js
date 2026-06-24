import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { writeFileSync, readFileSync, existsSync, statSync } from 'fs';
import { initIfcAPI, buildPropertiesMap, extractPosition } from '../src/lib/ifcUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const CONFIG = {
  ifcPath: process.argv[2] || join(projectRoot, 'uploads', 'model_1781869108512.ifc'),
  fragOutput: join(projectRoot, 'public', 'model.frag'),
  jsonOutput: join(projectRoot, 'public', 'properties.json'),
  typesToExtract: ['IfcWall', 'IfcSlab', 'IfcBeam', 'IfcColumn', 'IfcWindow', 'IfcDoor', 'IfcCurtainWall', 'IfcMember', 'IfcPlate', 'IfcFoundation', 'IfcGrid']
};


function extractGeometryFromWasmHeap(ifcAPI, modelId, expressId) {
  try {
    const flatMesh = ifcAPI.GetFlatMesh(modelId, expressId);

    const placedGeom = flatMesh.geometries.get(0);
    if (!placedGeom || !placedGeom.geometryExpressID) {
      return null;
    }

    const geomId = placedGeom.geometryExpressID;
    const geometry = ifcAPI.GetGeometry(modelId, geomId);

    const vertexDataSize = geometry.GetVertexDataSize();
    const indexDataSize = geometry.GetIndexDataSize();

    if (vertexDataSize === 0 || indexDataSize === 0) {
      return null;
    }

    const vertexPtr = geometry.GetVertexData();
    const indexPtr = geometry.GetIndexData();

    const heapF32 = ifcAPI.wasmModule.HEAPF32;
    const heapU32 = ifcAPI.wasmModule.HEAPU32;

    // GetVertexDataSize() возвращает байты
    // Для stride 6 (x,y,z,nx,ny,nz) это: numVertices * 6 * 4 байта
    const vertexStart = Math.floor(vertexPtr / 4);
    const numVertices = Math.floor(vertexDataSize / (6 * 4));
    
    // GetIndexDataSize() возвращает байты для Uint32 индексов (4 байта на индекс)
    const indexStart = Math.floor(indexPtr / 4);
    const indexCount = Math.floor(indexDataSize / 4);

    const vertices = new Float32Array(numVertices * 3);
    for (let i = 0; i < numVertices; i++) {
      const srcIdx = vertexStart + i * 6;
      let x = heapF32[srcIdx];     // x
      let y = heapF32[srcIdx + 1]; // y
      let z = heapF32[srcIdx + 2]; // z
      
      // Получаем трансформацию из FlatMesh
      const transformation = placedGeom.flatTransformation || null;
      
      // Применяем трансформацию, если она есть
      if (transformation && transformation.length === 16) {
        // Матрица в column-major порядке
        // [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33]
        const m00 = transformation[0], m01 = transformation[1], m02 = transformation[2], m03 = transformation[3];
        const m10 = transformation[4], m11 = transformation[5], m12 = transformation[6], m13 = transformation[7];
        const m20 = transformation[8], m21 = transformation[9], m22 = transformation[10], m23 = transformation[11];
        const m30 = transformation[12], m31 = transformation[13], m32 = transformation[14], m33 = transformation[15];
        
        // Умножаем вершину на трансформационную матрицу
        const tx = m00 * x + m10 * y + m20 * z + m30;
        const ty = m01 * x + m11 * y + m21 * z + m31;
        const tz = m02 * x + m12 * y + m22 * z + m32;
        
        x = tx;
        y = ty;
        z = tz;
      }
      
      vertices[i * 3] = x;
      vertices[i * 3 + 1] = y;
      vertices[i * 3 + 2] = z;
    }

    const indices = new Uint32Array(indexCount);
    for (let i = 0; i < indexCount; i++) {
      indices[i] = heapU32[indexStart + i];
    }

    return {
      vertices: Array.from(vertices),
      faces: Array.from(indices)
    };
  } catch (e) {
    return null;
  }
}

function getAllElementsAllTypes(ifcAPI, modelId) {
  const elementsMap = new Map();
  const typeCounts = new Map();

  const allLines = [...ifcAPI.GetAllLines(modelId)];

  for (const expressId of allLines) {
    const elementData = ifcAPI.GetLine(modelId, expressId);

    if (elementData?.type !== -1) {
      const typeName = ifcAPI.GetNameFromTypeCode(elementData.type);

      typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);

      elementsMap.set(expressId, {
        id: expressId,
        type: typeName,
        typeId: elementData.type,
        name: elementData.Name?.value || '',
        data: elementData
      });
    }
  }

  return { elementsMap, typeCounts };
}

async function convertIfcToFragments() {
  if (!existsSync(CONFIG.ifcPath)) {
    throw new Error(`IFC файл не найден: ${CONFIG.ifcPath}`);
  }

  const fileBuffer = readFileSync(CONFIG.ifcPath);
  const ifcByteArray = new Uint8Array(fileBuffer);

  const ifcAPI = await initIfcAPI();

  const modelId = ifcAPI.OpenModel(ifcByteArray);

  // Получаем ВСЕ элементы из IFC (без фильтрации по типам)
  const { elementsMap, typeCounts } = getAllElementsAllTypes(ifcAPI, modelId);


  const propertiesMap = buildPropertiesMap(ifcAPI, modelId);

  const propertiesData = [];
  const geometryData = [];
  const processedSet = new Set();
  let geoCount = 0;
  let noGeoCount = 0;

  // Сначала пробуем получить геометрию для ВСЕХ элементов
  let checked = 0;
  for (const [expressId, element] of elementsMap) {
    checked++;
    
    try {
      const geometry = extractGeometryFromWasmHeap(ifcAPI, modelId, expressId);
      
      if (geometry) {
        const position = extractPosition(ifcAPI, modelId, expressId);
        const properties = propertiesMap.get(expressId) || {};
        
        propertiesData.push({
          id: expressId,
          type: element.type,
          name: element.name || 'Без имени',
          position: position,
          properties: properties,
          visible: true  // По умолчанию элементы видимы
        });
        
        geometryData.push({
          id: expressId,
          vertices: geometry.vertices,
          faces: geometry.faces
        });
        
        processedSet.add(expressId);
        geoCount++;
        
      } else {
        noGeoCount++;
      }
    } catch (e) {
      noGeoCount++;
    }
  }


  // Добавляем элементы без геометрии в properties.json (только если они есть)
  const elementsWithoutGeo = elementsMap.size - geoCount;
  if (elementsWithoutGeo > 0) {
    let added = 0;
    for (const [expressId, element] of elementsMap) {
      if (!processedSet.has(expressId)) {
        const position = extractPosition(ifcAPI, modelId, expressId);
        const properties = propertiesMap.get(expressId) || {};
        
        propertiesData.push({
          id: expressId,
          type: element.type,
          name: element.name || 'Без имени',
          position: position,
          properties: properties,
          visible: true
        });
        
        processedSet.add(expressId);
        added++;
        
      }
    }
  }


  writeFileSync(CONFIG.jsonOutput, JSON.stringify(propertiesData, null, 2));

  const buffer = new ArrayBuffer(4 + geometryData.reduce((acc, geo) => {
    return acc + 4 + 4 + geo.vertices.length * 4 + 4 + geo.faces.length * 4;
  }, 0));

  const view = new DataView(buffer);
  let offset = 0;

  view.setUint32(offset, geometryData.length, true);
  offset += 4;

  for (const geo of geometryData) {
    view.setUint32(offset, geo.id, true);
    offset += 4;

    view.setUint32(offset, geo.vertices.length, true);
    offset += 4;

    for (const v of geo.vertices) {
      view.setFloat32(offset, v, true);
      offset += 4;
    }

    view.setUint32(offset, geo.faces.length, true);
    offset += 4;

    for (const f of geo.faces) {
      view.setUint32(offset, f, true);
      offset += 4;
    }
  }

  writeFileSync(CONFIG.fragOutput, Buffer.from(buffer));

  ifcAPI.CloseModel(modelId);

}

convertIfcToFragments().catch((err) => {
  process.exit(1);
});