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
  let totalRelations = 0;
  let skippedRelations = 0;

  try {
    const allLines = [...ifcAPI.GetAllLines(modelId)];

    for (const expressId of allLines) {
      const line = ifcAPI.GetLine(modelId, expressId);

      // Ищем по наличию GlobalId и RelatedObjects (特指 IfcRelDefinesByProperties)
      // IFC4 types may have non-standard type codes
      if (!line || !line.GlobalId || !line.RelatedObjects || !line.RelatingPropertyDefinition) {
        continue;
      }

      // Проверяем, что это именно IfcRelDefinesByProperties
      // (у других типов с GlobalId обычно нет RelatedObjects + RelatingPropertyDefinition)
      if (!line.RelatedObjects || !line.RelatingPropertyDefinition) {
        continue;
      }

      totalRelations++;

      // line.RelatingPropertyDefinition это Handle, нужно получить реальный объект
      const propSetHandle = line.RelatingPropertyDefinition;
      const propSetLine = ifcAPI.GetLine(modelId, propSetHandle.value);

      if (!propSetLine || !propSetLine.HasProperties) {
        skippedRelations++;
        continue;
      }

      const setName = propSetLine.Name?.value || 'Unnamed';

      for (let j = 0; j < line.RelatedObjects.length; j++) {
        const relatedObject = line.RelatedObjects[j];
        // relatedObject это Handle с value (expressId)
        const relatedExpressId = relatedObject.value;

        if (!relatedExpressId) continue;

        let elementProps = propertiesMap.get(relatedExpressId);
        if (!elementProps) {
          elementProps = {};
          propertiesMap.set(relatedExpressId, elementProps);
        }

        // propSetLine.HasProperties это массив Handle
        for (let k = 0; k < propSetLine.HasProperties.length; k++) {
          const propHandle = propSetLine.HasProperties[k];
          const propLine = ifcAPI.GetLine(modelId, propHandle.value);

          const propName = propLine.Name?.value || 'Unnamed';
          const propNameFull = `${setName}.${propName}`;

          if (propLine.NominalValue && propLine.NominalValue.value !== undefined) {
            elementProps[propNameFull] = propLine.NominalValue.value;
          }
        }
      }
    }

    } catch (e) {
    }

  return propertiesMap;
}

export function extractPosition(ifcAPI, modelId, expressId) {
  try {
    const element = ifcAPI.GetLine(modelId, expressId);
    if (!element || !element.ObjectPlacement) {
      return { x: 0, y: 0, z: 0 };
    }

    // Get the ObjectPlacement expressId
    const placementId = element.ObjectPlacement.value;
    if (!placementId) {
      return { x: 0, y: 0, z: 0 };
    }

    // Recursively traverse the placement hierarchy to sum up coordinates
    let totalX = 0;
    let totalY = 0;
    let totalZ = 0;

    let currentPlacementId = placementId;
    const MAX_DEPTH = 10; // Prevent infinite loops
    let depth = 0;

    while (currentPlacementId && depth < MAX_DEPTH) {
      const placement = ifcAPI.GetLine(modelId, currentPlacementId);
      if (!placement) {
        break;
      }

      // Look for Location.Coordinates
      // For IfcLocalPlacement, we need to go through:
      // Placement -> RelativePlacement -> Location -> Coordinates
      let coords = null;

      if (placement.RelativePlacement) {
        // This is IfcLocalPlacement - need to get the RelativePlacement object
        const relPlacement = ifcAPI.GetLine(modelId, placement.RelativePlacement.value);
        
        // Then get the Location object
        if (relPlacement?.Location) {
          const location = ifcAPI.GetLine(modelId, relPlacement.Location.value);
          if (location?.Coordinates) {
            coords = location.Coordinates;
          }
        }
      } else if (placement.Location?.Coordinates) {
        // This is IfcAxis2Placement3D or similar - coordinates are directly in Location
        coords = placement.Location.Coordinates;
      }

      if (coords) {
        totalX += Number(coords[0].value) || 0;
        totalY += Number(coords[1].value) || 0;
        totalZ += Number(coords[2].value) || 0;
      }

      // For IfcLocalPlacement, follow PlacementRelTo to parent
      if (placement.PlacementRelTo) {
        currentPlacementId = placement.PlacementRelTo.value;
      } else {
        // No parent placement, stop traversing
        break;
      }

      depth++;
    }

    return { x: totalX, y: totalY, z: totalZ };
  } catch (e) {
      return { x: 0, y: 0, z: 0 };
  }
}
