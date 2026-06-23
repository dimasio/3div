import * as THREE from 'three';
import { Components, Worlds, SimpleScene, SimpleRenderer, SimpleCamera, FragmentsManager, IfcLoader } from '@thatopen/components';

function showPreloader(message = 'Загрузка модулей...') {
  const preloader = document.getElementById('preloader');
  const text = document.getElementById('preloader-text');
  if (preloader && text) {
    text.textContent = message;
    preloader.classList.remove('hidden');
  }
}

function showWebGLInstructions() {
  const viewerContainer = document.getElementById('viewer-container');
  if (viewerContainer) {
    viewerContainer.innerHTML = `
      <div class="absolute inset-0 flex items-center justify-center bg-slate-100 p-8">
        <div class="max-w-2xl bg-white rounded-lg shadow-lg p-6 text-slate-800">
          <h2 class="text-2xl font-bold mb-4 text-red-600">Ошибка: WebGL не поддерживается</h2>
          
          <div class="mb-4">
            <h3 class="font-semibold mb-2">Причины:</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>WebGL отключен в настройках браузера</li>
              <li>Отсутствует поддержка WebGL вашим устройством</li>
              <li>Используется виртуальный драйвер (SwiftShader)</li>
              <li>Устаревшие драйверы видеокарты</li>
            </ul>
          </div>
          
          <div class="mb-4">
            <h3 class="font-semibold mb-2">Решения:</h3>
            <ol class="list-decimal pl-5 space-y-2">
              <li class="mb-1">
                <strong>Проверить WebGL в Chrome:</strong><br>
                В адресной строке введите: <code class="bg-slate-100 px-2 py-1 rounded">chrome://gpu</code><br>
                Проверьте, что "WebGL" и "2D Canvas" имеют статус "hardware accelerated"
              </li>
              <li class="mb-1">
                <strong>Включить WebGL вручную (Chrome/Edge):</strong><br>
                1. Откройте <code class="bg-slate-100 px-2 py-1 rounded">chrome://flags</code><br>
                2. Найдите "Override software rendering list"<br>
                3. Включите этот флаг<br>
                4. Перезапустите браузер
              </li>
              <li class="mb-1">
                <strong>Обновить драйверы видеокарты:</strong><br>
                - NVIDIA: <a href="https://www.nvidia.com/Download/index.aspx" class="text-blue-600 underline" target="_blank">www.nvidia.com</a><br>
                - AMD: <a href="https://www.amd.com/en/support" class="text-blue-600 underline" target="_blank">www.amd.com</a><br>
                - Intel: <a href="https://www.intel.com/content/www/us/en/download-center/home.html" class="text-blue-600 underline" target="_blank">www.intel.com</a>
              </li>
              <li class="mb-1">
                <strong>Попробовать другой браузер:</strong><br>
                Safari (на Mac), Firefox или Edge
              </li>
            </ol>
          </div>
          
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p class="text-sm text-yellow-700">
              <strong>Примечание:</strong> После внесения изменений в настройки браузера, 
              обновите страницу (Ctrl+R или Cmd+R).
            </p>
          </div>
          
          <div class="flex gap-2">
            <button onclick="location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              Обновить страницу
            </button>
            <a href="https://get.webgl.org/" target="_blank" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
              Узнать больше о WebGL
            </a>
          </div>
        </div>
      </div>
    `;
  }
}

function updatePreloaderProgress(text, progress = '') {
  const textEl = document.getElementById('preloader-text');
  const progressEl = document.getElementById('preloader-progress');
  if (textEl) textEl.textContent = text;
  if (progressEl) progressEl.textContent = progress;
}

function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) preloader.classList.add('hidden');
}

const viewerContainer = document.getElementById('viewer-container');
const gridContainer = document.getElementById('grid-container');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');

let components = null;
let worlds = null;
let world = null;
let dataRows = [];
let gridApi = null;
let gridOptions = null;
let currentModelId = null;

const columnDefs = [
  {
    field: 'id',
    headerName: 'ID',
    width: 100,
    sortable: true,
    filter: true,
    chartDataType: 'category'
  },
  {
    field: 'type',
    headerName: 'Тип',
    width: 150,
    sortable: true,
    filter: true,
    cellStyle: { 'font-weight': '600', 'color': '#2563eb' }
  },
  {
    field: 'name',
    headerName: 'Название',
    flex: 1,
    sortable: true,
    filter: true
  }
];

function initGrid() {
  gridOptions = {
    columnDefs: columnDefs,
    defaultColDef: {
      editable: false,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100
    },
    rowSelection: 'single',
    pagination: true,
    paginationPageSize: 25,
    paginationPageSizeSelector: [25, 50, 100, 200],
    onRowClicked: (event) => {
      const rowData = event.data;
      if (rowData) {
        highlightElement(rowData.id);
      }
    }
  };

  gridApi = agGrid.createGrid(gridContainer, gridOptions);
  
  if (!gridApi) {
    console.error('Не удалось получить gridApi');
    return;
  }
  
  loadGridData();
}

async function loadGridData() {
  if (!gridApi) {
    console.error('gridApi не инициализирован');
    return;
  }
  
  if (!gridContainer) {
    console.error('gridContainer не найден');
    return;
  }
  
  try {
    const response = await fetch('/api/model/data');
    const data = await response.json();
    
    if (data.allElements && data.allElements.length > 0) {
      const rows = data.allElements.map(el => ({
        id: el.id,
        type: el.type,
        name: el.name || 'Без имени'
      }));
      
      dataRows = rows;
      gridApi.updateGridOptions({ rowData: rows });
      
      console.log(`Загружено ${rows.length} элементов`);
      
      if (gridContainer.classList) {
        gridContainer.classList.remove('flex', 'items-center', 'justify-center');
      }
    } else {
      if (gridContainer) {
        gridContainer.innerHTML = '<div class="flex items-center justify-center h-full text-slate-500"><p>Нет данных для отображения</p></div>';
      }
    }
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
    if (gridContainer) {
      gridContainer.innerHTML = '<div class="flex items-center justify-center h-full text-red-500"><p>Ошибка загрузки данных</p></div>';
    }
  }
}

function highlightElement(elementId) {
  if (!components) return;
  
  try {
    const fragManager = components.get(FragmentsManager);
    if (fragManager) {
      fragManager.highlight({ color: [1, 0.5, 0, 1] }, new Set([elementId]));
      console.log(`Выделен элемент ID: ${elementId}`);
    } else {
      console.warn('FragmentsManager не найден в components');
    }
  } catch (e) {
    console.error('Ошибка подсветки:', e);
  }
}

function checkWebGLSupport() {
  console.log('Проверка WebGL поддержки...');
  
  try {
    const canvas = document.createElement('canvas');
    
    console.log('canvas.getContext("webgl")...');
    let gl = canvas.getContext('webgl');
    if (gl) {
      console.log('WebGL контекст создан успешно (webgl)');
      console.log('  Version:', gl.getParameter(gl.VERSION));
      console.log('  Vendor:', gl.getParameter(gl.VENDOR));
      console.log('  Renderer:', gl.getParameter(gl.RENDERER));
      return true;
    }
    
    console.log('canvas.getContext("experimental-webgl")...');
    gl = canvas.getContext('experimental-webgl');
    if (gl) {
      console.log('WebGL контекст создан успешно (experimental-webgl)');
      return true;
    }
    
    console.warn('Не удалось получить webgl контекст');
  } catch (e) {
    console.warn('Исключение при проверке WebGL:', e.message);
  }
  
  try {
    console.log('Попытка создания Three.js WebGLRenderer...');
    const testCanvas = document.createElement('canvas');
    const testRenderer = new THREE.WebGLRenderer({ 
      canvas: testCanvas, 
      antialias: true,
      preserveDrawingBuffer: true
    });
    
    console.log('Three.js WebGLRenderer создан успешно');
    console.log('  Renderer:', testRenderer.info.renderer);
    
    testRenderer.dispose();
    
    return true;
  } catch (e) {
    console.warn('Three.js WebGLRenderer не создался:', e.message);
  }
  
  console.warn('WebGL не поддерживается');
  return false;
}

async function initViewer() {
  try {
    const originalError = console.error;
    
    console.error = function(...args) {
      const message = args.join(' ');
      if (message.includes('WebGL context') || message.includes('Could not create')) {
        return;
      }
      originalError.apply(console, args);
    };
    
    try {
      console.log('Создаем Components...');
      components = new Components();
      
      console.log('Получаем Worlds...');
      worlds = components.get(Worlds);
      
      console.log('Создаем World...');
      world = worlds.create();
      
      console.log('Создаем сцену...');
      world.scene = new SimpleScene(components);
      
      console.log('Создаем рендерер...');
      world.renderer = new SimpleRenderer(components, viewerContainer);
      
      console.log('Создаем камеру...');
      world.camera = new SimpleCamera(components);
      
      console.log('Добавляем свет...');
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(10, 10, 10);
      world.scene.three.add(dirLight);
      
      const pointLight = new THREE.PointLight(0xffffff, 0.5);
      pointLight.position.set(-5, 5, 5);
      world.scene.three.add(pointLight);
      
      console.log('Инициализируем компоненты...');
      components.init();
      
      console.log('Настраиваем камеру...');
      world.camera.controls.setLookAt(0, 10, 20, 0, 0, 0);
      
      console.log('3D-вьювер успешно инициализирован');
      
      viewerContainer.innerHTML = `
        <div class="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
          <div class="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p class="text-slate-600 font-medium">Загрузка 3D-модели...</p>
        </div>
      `;
      
      await loadIFCModel();
      
      setTimeout(() => {
        const preloader = viewerContainer.querySelector('.absolute.inset-0.flex');
        if (preloader) {
          preloader.style.display = 'none';
        }
      }, 100);
      
    } catch (error) {
      console.error = originalError;
      throw error;
    }
    
    console.error = originalError;
    
  } catch (error) {
    console.error('Ошибка инициализации 3D-вьювера:', error);
    if (error.message.includes('WebGL') || error.message.includes('context')) {
      showWebGLInstructions();
    } else {
      viewerContainer.innerHTML = `
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center text-red-500">
            <p>Ошибка загрузки 3D-модели: ${error.message}</p>
          </div>
        </div>
      `;
    }
  }
}

async function loadIFCModel() {
  try {
    const fragResponse = await fetch('/api/model/fragments');
    
    if (fragResponse.ok) {
      console.log('Используем FragmentsManager для загрузки .frag файла...');
      await loadWithFragmentsManager();
    } else if (fragResponse.status === 404) {
      console.log('Файл .frag не найден, используем IfcLoader...');
      await loadWithIfcLoader();
    } else {
      throw new Error(`Ошибка загрузки файла: ${fragResponse.status}`);
    }
  } catch (error) {
    console.error('Ошибка загрузки IFC модели:', error);
    
    viewerContainer.innerHTML = `
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <div class="text-center text-slate-500">
          <p class="mb-2">Файл не загружен</p>
          <button id="retry-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Попробовать снова</button>
        </div>
      </div>
    `;
    
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      const btn = document.getElementById('retry-btn');
      if (btn) {
        btn.parentElement.style.display = 'none';
      }
      loadIFCModel();
    });
  }
}

async function loadWithFragmentsManager() {
  try {
    const fragments = components.get(FragmentsManager);

    // Подписываемся на загрузку моделей
    fragments.onFragmentsLoaded.add(async (model) => {
      world.scene.three.add(model);
      // Центрируем камеру
      if (world.camera && world.camera.controls) {
        world.camera.controls.fitToSphere(model, true);
      }
    });

    // Прямая загрузка бинарного файла
    const file = await fetch('/api/model/fragments');
    if (file.ok) {
      const data = await file.arrayBuffer();
      const buffer = new Uint8Array(data);
      
      // Загружаем фрагменты
      const model = await fragments.load(buffer);
      
      console.log("Модель успешно загружена!");
    }
  } catch (e) {
    console.error("Ошибка загрузки через FragmentsManager:", e);
    throw e;
  }
}

async function loadWithIfcLoader() {
  try {
    const response = await fetch('/api/model/file');
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Файл не загружен, ожидание...');
        return;
      }
      throw new Error(`Ошибка загрузки файла: ${response.status}`);
    }
    
    const fileBlob = await response.blob();
    const fileUrl = URL.createObjectURL(fileBlob);
    
    const ifcLoader = new IfcLoader(components);
    
    ifcLoader.ifcManager.setupWASM({ 
      path: 'https://esm.sh/@thatopen/components-front@2.4.0/dist/ifc.wasm' 
    });
    
    const model = await ifcLoader.load(fileUrl);
    
    console.log('Модель успешно загружена:', model);
    currentModelId = model.modelID;
    
    setTimeout(() => {
      world.camera.controls.fitView();
      console.log('3D-сцена готова');
    }, 100);
    
  } catch (error) {
    console.error('Ошибка загрузки через IfcLoader:', error);
    throw error;
  }
}

async function uploadFile(file) {
  try {
    const text = await file.text();
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: text
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`Файл загружен: ${result.structuralElements.length} конструктивных элементов`);
      
      loadGridData();
      
      await loadIFCModel();
      
      if (components) {
        try {
          const fragManager = components.get(FragmentsManager);
          if (fragManager) {
            fragManager.resetHighlight(new Set());
          }
        } catch (e) {
          console.log('Не удалось сбросить выделение');
        }
      }
    } else {
      throw new Error(result.error || 'Неизвестная ошибка');
    }
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    alert(`Ошибка при загрузке файла: ${error.message}`);
  }
}

uploadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    console.log('Загрузка файла:', file.name);
    uploadFile(file);
    fileInput.value = '';
  }
});

window.addEventListener('load', async () => {
  showPreloader('Загрузка модулей...');
  updatePreloaderProgress('Загрузка модулей...', '0%');
  
  try {
    console.log('IFC Viewer MVP загружен');
    
    updatePreloaderProgress('Загрузка таблицы данных...', '30%');
    initGrid();
    
    updatePreloaderProgress('Инициализация 3D-вьювера...', '60%');
    await initViewer();
    
    updatePreloaderProgress('Готово!', '100%');
    setTimeout(hidePreloader, 500);
    
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    hidePreloader();
    alert(`Ошибка инициализации: ${error.message}`);
  }
});