import { Components, SimpleWorld, SimpleScene, SimpleCamera, SimpleRenderer, OrbitMode } from '@thatopen/components';

// Создаем экземпляр компонентов
const components = new Components();

// Создаем мир
const world = new SimpleWorld();

// Создаем сцену
const scene = new SimpleScene(components);
world.scene = scene;

// Создаем рендерер
const renderer = new SimpleRenderer(components, document.createElement('div'));
world.renderer = renderer;

// Инициализируем компоненты
components.init();

// Создаем камеру
const camera = new SimpleCamera(components);
world.camera = camera;

// Настраиваем камеру
console.log('camera.position:', camera.position);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// Включаем OrbitMode
const orbitMode = new OrbitMode(camera);
orbitMode.enabled = true;

console.log('✅ Инициализация завершена успешно!');