import { IfcAPI, IFCWALL, IFCSLAB, IFCBEAM, IFCCOLUMN, IFCGRID } from 'web-ifc';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initIfcAPI, buildPropertiesMap, extractPosition } from './ifcUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllElements(ifcAPI, modelId, maxElements = 0) {
  const elementsMap = new Map();
  const typeCounts = new Map();

  try {
    const allLines = [...ifcAPI.GetAllLines(modelId)];

    let count = 0;
    for (const expressId of allLines) {
      const elementData = ifcAPI.GetLine(modelId, expressId);

      if (elementData && elementData.type !== -1) {
        const typeName = ifcAPI.GetNameFromTypeCode(elementData.type);

        typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);

        elementsMap.set(expressId, {
          id: expressId,
          type: typeName,
          typeId: elementData.type,
          data: elementData
        });

        count++;

        if (maxElements > 0 && count >= maxElements) {
          break;
        }

        if (count % 5000 === 0) {
        }
      }
    }
  } catch (e) {
  }

  return elementsMap;
}

function extractElementData(ifcAPI, element, modelId, propertiesMap) {
  try {
    const properties = propertiesMap.get(element.id) || {};
    const position = extractPosition(ifcAPI, modelId, element.id);

    return {
      id: element.id,
      type: element.type,
      name: element.data.Name?.value || '',
      position: position,
      properties: properties,
      typeCode: element.typeId
    };
  } catch (e) {
    return null;
  }
}

function getProperties(ifcAPI, expressId, modelId) {
  const properties = {};

  try {
    const defines = ifcAPI.GetByType(modelId, 23);

    for (let i = 0; i < defines.size(); i++) {
      const relationId = defines.get(i);
      const relation = ifcAPI.GetLine(modelId, relationId);

      if (!relation || !relation.RelatedObjects) continue;

      let isRelated = false;
      for (let j = 0; j < relation.RelatedObjects.length; j++) {
        if (relation.RelatedObjects[j].oid === expressId) {
          isRelated = true;
          break;
        }
      }

      if (!isRelated) continue;

      const propertySet = relation.RelatingPropertyDefinition;
      if (!propertySet || !propertySet.HasProperties) continue;

      const setName = propertySet.Name?.value || 'Unnamed';

      for (let j = 0; j < propertySet.HasProperties.length; j++) {
        const prop = propertySet.HasProperties[j];
        const propName = prop.Name?.value || 'Unnamed';
        const propNameFull = `${setName}.${propName}`;

        if (prop.NominalValue) {
          properties[propNameFull] = prop.NominalValue.value;
        }
      }
    }
  } catch (e) {
  }

  return properties;
}

async function extractIfc(filePath) {
  const ifcAPI = await initIfcAPI();

  const fileBuffer = fs.readFileSync(filePath);
  const ifcByteArray = new Uint8Array(fileBuffer);

  const modelId = ifcAPI.OpenModel(ifcByteArray);

  const structuralElements = [];
  const underlays = [];

  const elementsMap = getAllElements(ifcAPI, modelId, 10000);

  const propertiesMap = buildPropertiesMap(ifcAPI, modelId);

  let count = 0;
  for (const [expressId, element] of elementsMap) {
    const elementData = extractElementData(ifcAPI, element, modelId, propertiesMap);

    if (!elementData) {
      continue;
    }

    structuralElements.push(elementData);

    count++;
  }

  ifcAPI.CloseModel(modelId);

  return {
    structuralElements,
    underlays
  };
}

export { extractIfc, getAllElements, extractElementData, getProperties };
