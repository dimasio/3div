import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
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

    const vertexCount = vertexDataSize / 4;
    const indexCount = indexDataSize / 4;

    const heapF32 = ifcAPI.wasmModule.HEAPF32;
    const heapU32 = ifcAPI.wasmModule.HEAPU32;

    const vertexStart = Math.floor(vertexPtr / 4);
    const indexStart = Math.floor(indexPtr / 4);

    const vertices = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      vertices[i] = heapF32[vertexStart + i];
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

function getAllElementsFiltered(ifcAPI, modelId, typesFilter) {
  const elementsMap = new Map();
  const typeCounts = new Map();
  const meshData = [];

  const allLines = [...ifcAPI.GetAllLines(modelId)];

  let count = 0;
  for (const expressId of allLines) {
    const elementData = ifcAPI.GetLine(modelId, expressId);

    if (elementData?.type !== -1) {
      const typeName = ifcAPI.GetNameFromTypeCode(elementData.type);

      if (typesFilter.includes(typeName)) {
        typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);

        elementsMap.set(expressId, {
          id: expressId,
          type: typeName,
          typeId: elementData.type,
          name: elementData.Name?.value || '',
          data: elementData
        });
      }

      count++;

      if (count % 10000 === 0) {
      }
    }
  }

  let geoCount = 0;
  let notFoundCount = 0;

  for (const [expressId, element] of elementsMap) {
    try {
      const geometry = extractGeometryFromWasmHeap(ifcAPI, modelId, expressId);

      if (geometry) {
        meshData.push({
          expressID: expressId,
          vertices: geometry.vertices,
          faces: geometry.faces
        });
        geoCount++;

        if (geoCount % 1000 === 0) {
        }
      } else {
        notFoundCount++;
      }
    } catch (e) {
    }
  }

  return { elementsMap, meshData };
}

async function convertIfcToFragments() {
  if (!existsSync(CONFIG.ifcPath)) {
    throw new Error(`IFC файл не найден: ${CONFIG.ifcPath}`);
  }

  const fileBuffer = readFileSync(CONFIG.ifcPath);
  const ifcByteArray = new Uint8Array(fileBuffer);

  const ifcAPI = await initIfcAPI();

  const modelId = ifcAPI.OpenModel(ifcByteArray);

  const { elementsMap, meshData } = getAllElementsFiltered(ifcAPI, modelId, CONFIG.typesToExtract);

  const propertiesMap = buildPropertiesMap(ifcAPI, modelId);

  const propertiesData = [];
  const geometryData = [];
  let processed = 0;
  let elementsWithGeometry = 0;

  for (const mesh of meshData) {
    const element = elementsMap.get(mesh.expressID) || {
      id: mesh.expressID,
      type: 'Unknown',
      typeId: 0,
      name: 'Без имени'
    };

    const position = extractPosition(ifcAPI, modelId, mesh.expressID);
    const properties = propertiesMap.get(mesh.expressID) || {};

    propertiesData.push({
      id: mesh.expressID,
      type: element.type,
      name: element.name || 'Без имени',
      position: position,
      properties: properties
    });

    geometryData.push({
      id: mesh.expressID,
      vertices: mesh.vertices,
      faces: mesh.faces
    });
    elementsWithGeometry++;

    processed++;
    if (processed % 1000 === 0) {
    }
  }

  for (const [expressId, element] of elementsMap) {
    if (!meshData.some(m => m.expressID === expressId)) {
      const position = extractPosition(ifcAPI, modelId, expressId);
      const properties = propertiesMap.get(expressId) || {};

      propertiesData.push({
        id: expressId,
        type: element.type,
        name: element.name || 'Без имени',
        position: position,
        properties: properties
      });
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
  console.error('Ошибка конвертации:', err);
  process.exit(1);
});