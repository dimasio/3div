import * as THREE from 'three';
import { Components, Worlds, SimpleScene, SimpleRenderer, SimpleCamera, FragmentsManager } from '@thatopen/components';

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
    // pagination отключен - отображаем все элементы сразу
    pagination: false,
    paginationPageSize: 1000000,
    paginationPageSizeSelector: [1000000],
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
    // Запрашиваем все элементы без пагинации
    const response = await fetch('/api/model/data?page=1&pageSize=0');
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
  const originalError = console.error;
  
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('WebGL context') || message.includes('Could not create')) {
      return;
    }
    originalError.apply(console, args);
  };
  
  try {
    // === НОВЫЙ КОД ИНИЦИАЛИЗАЦИИ ===
    const container = document.getElementById('viewer-container');
    if (!container) {
      console.error("❌ Контейнер #viewer-container не найден!");
      return;
    }

    // Очищаем контейнер от текста "3D-вьювер загружается..."
    container.innerHTML = '';

    components = new Components();
    worlds = components.get(Worlds);

    world = worlds.create();
    world.scene = new SimpleScene(components);
    world.renderer = new SimpleRenderer(components, container);
    world.camera = new SimpleCamera(components);

    // 1. Инициализация (запуск render loop)
    components.init();

    // 2. Включаем дефолтную настройку
    world.scene.setup();

    // 3. ПРИНУДИТЕЛЬНО создаём базовый свет и сетку (если setup() не сработал)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    world.scene.three.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    world.scene.three.add(directionalLight);

    const gridHelper = new THREE.GridHelper(50, 50);
    world.scene.three.add(gridHelper);

    // Делаем этот мир активным (ОБЯЗАТЕЛЬНО ДЛЯ V3.X)
    world.scene.three.background = new THREE.Color(0xf3f4f6); // Светло-серый фон
    world.camera.controls.setLookAt(15, 15, 15, 0, 0, 0);

    console.log('3D-вьювер успешно инициализирован');

    // Загружаем модель
    await loadIFCModel();
    
  } catch (error) {
    console.error = originalError;
    throw error;
  }
  
  console.error = originalError;
}

async function loadIFCModel() {
  try {
    console.log("Скачиваем бинарный файл .frag с сервера...");
    const response = await fetch('/api/model/fragments');
    
    if (!response.ok) throw new Error(`Файл не найден (статус ${response.status})`);
    
    const data = await response.arrayBuffer();
    const buffer = new Uint8Array(data);
    
    console.log("Загружаем геометрию...");
    const fragments = components.get(FragmentsManager);
    const model = await fragments.load(buffer);
    
    // В v3.x model - это FragmentsGroup (наследник THREE.Group)
    world.scene.three.add(model);

    // Для верности добавляем все дочерние меши в сцену напрямую
    if (model.children && model.children.length > 0) {
      model.children.forEach(child => world.scene.three.add(child));
    }

    // Принудительно обновляем матрицы для правильного расчета Bounding Box
    world.scene.three.updateMatrixWorld(true);

    // Вычисляем реальные границы модели и фокусируем камеру
    if (world.camera && world.camera.controls) {
      setTimeout(() => {
        try {
          const box = new THREE.Box3().setFromObject(model);
          
          // Если коробка валидная (не бесконечная), фокусируемся на ней
          if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Отодвигаем камеру на расстояние, чтобы модель влезла в экран
            world.camera.controls.setLookAt(
              center.x + maxDim, center.y + maxDim, center.z + maxDim, // Позиция камеры
              center.x, center.y, center.z, // Куда смотреть
              true // Анимация
            );
          } else {
            world.camera.controls.fitToSphere(model, true);
          }
          console.log("✅ Камера сфокусирована на модели!");
        } catch (e) {
          console.log("⚠️ Не удалось сфокусировать камеру:", e.message);
        }
      }, 100); // Небольшая пауза для отрисовки
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки 3D модели:", error);
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