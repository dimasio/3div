import { IfcAPI } from 'web-ifc';
import { join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

export async function initIfcAPI() {
  const projectRoot = join(__dirname, '../..');
  const wasmPath = join(projectRoot, 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
  const wasmUrl = 'file://' + wasmPath;

  if (!existsSync(wasmPath)) {
    throw new Error(`WASM файл не найден: ${wasmPath}`);
  }

  const ifcAPI = new IfcAPI();
  await ifcAPI.Init(() => wasmUrl);

  return ifcAPI;
}

export function buildPropertiesMap(ifcAPI, modelId) {
  const propertiesMap = new Map();

  try {
    const allLines = [...ifcAPI.GetAllLines(modelId)];

    for (const expressId of allLines) {
      const element = ifcAPI.GetLine(modelId, expressId);

      const typeName = ifcAPI.GetNameFromTypeCode(element.type);
      if (typeName !== 'IfcRelDefinesByProperties') {
        continue;
      }

      if (!element.RelatedObjects || !element.RelatingPropertyDefinition) {
        continue;
      }

      const propertySet = element.RelatingPropertyDefinition;
      if (!propertySet.HasProperties) {
        continue;
      }

      const setName = propertySet.Name?.value || 'Unnamed';

      for (let j = 0; j < element.RelatedObjects.length; j++) {
        const relatedObject = element.RelatedObjects[j];
        const relatedExpressId = relatedObject.oid;

        if (!relatedExpressId) continue;

        let elementProps = propertiesMap.get(relatedExpressId);
        if (!elementProps) {
          elementProps = {};
          propertiesMap.set(relatedExpressId, elementProps);
        }

        for (let k = 0; k < propertySet.HasProperties.length; k++) {
          const prop = propertySet.HasProperties[k];
          const propName = prop.Name?.value || 'Unnamed';
          const propNameFull = `${setName}.${propName}`;

          if (prop.NominalValue && prop.NominalValue.value !== undefined) {
            elementProps[propNameFull] = prop.NominalValue.value;
          }
        }
      }
    }
  } catch (e) {
    console.error('Ошибка при построении карты свойств:', e);
  }

  return propertiesMap;
}

export function extractPosition(ifcAPI, modelId, expressId) {
  try {
    const element = ifcAPI.GetLine(modelId, expressId);
    if (!element?.ObjectPlacement?.PlacementToReference?.Location?.Coordinates) {
      return { x: 0, y: 0, z: 0 };
    }

    const coords = element.ObjectPlacement.PlacementToReference.Location.Coordinates;
    return {
      x: Number(coords[0]) || 0,
      y: Number(coords[1]) || 0,
      z: Number(coords[2]) || 0
    };
  } catch (e) {
    return { x: 0, y: 0, z: 0 };
  }
}