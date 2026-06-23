# 🖥️ Инструкция по включению WebGL

## Обнаружена проблема: WebGL не поддерживается

Ваш браузер не может отобразить 3D-модель, так как WebGL либо отключен, либо не поддерживается вашим устройством.

---

## 🔍 Причины проблемы

| Причина | Описание |
|---------|----------|
| WebGL отключен | Функция отключена в настройках браузера |
| SwiftShader | Используется программный рендеринг вместо GPU |
| Устаревшие драйверы | Нет поддержки WebGL в драйверах видеокарты |
| Виртуальная среда | VM без аппаратного ускорения |

---

## ✅ Решения для разных браузеров

### 🦊 Firefox

1. Откройте `about:config` в адресной строке
2. Поиск: `webgl.disabled`
3. Установите в `false`
4. Перезапустите браузер

### 🍏 Safari (Mac)

1. Откройте `Safari → Настройки → Дополнительно`
2. Включите "Показывать меню разработчика"
3. В меню разработчика выберите "Использовать GPU, когда это возможно"
4. Перезапустите браузер

### 🦊 Firefox

1. Откройте `about:config` в адресной строке
2. Поиск: `webgl.disabled`
3. Установите в `false`
4. Перезапустите браузер

### 🦊 Firefox

1. Откройте `about:config` в адресной строке
2. Поиск: `webgl.disabled`
3. Установите в `false`
4. Перезапустите браузер

---

## 🔧 Проверка WebGL

### Chrome / Edge / Opera

1. В адресной строке введите: `chrome://gpu`
2. Ищите раздел **"Graphics Feature Status"**
3. Проверьте статус:
   - ✅ **Hardware accelerated** - всё в порядке
   - ⚠️ **Software only** - WebGL отключен
   - ❌ **Disabled** - WebGL отключен

### Все браузеры

Перейдите на https://get.webgl.org/

Если вы видите рисунок "кофейной чашки" - WebGL работает!

---

## 📋 Быстрая диагностика

| Симптом | Возможная причина | Решение |
|---------|------------------|---------|
| Ошибка "WebGL not supported" | WebGL отключен | Включить в настройках |
| Ошибка "SwiftShader" | Программный рендеринг | Обновить драйверы |
| Пустой экран | Драйверы блокируют WebGL | Использовать флаги запуска |
| Работает в Firefox, но не в Chrome | Проблема конкретного браузера | Обновить драйверы |

---

## 🚀 Флаги запуска браузера

### Chrome (для тестирования)

```bash
# macOS
open -a Google\ Chrome --args --ignore-gpu-blacklist --use-gl=desktop

# Windows
chrome.exe --ignore-gpu-blacklist --use-gl=desktop

# Linux
google-chrome --ignore-gpu-blacklist --use-gl=desktop
```

### Firefox

```bash
# macOS
open -a Firefox --args -no-remote -safe-mode
```

---

## 📦 Обновление драйверов видеокарты

### NVIDIA

- macOS: Обновите macOS через System Settings
- Windows: https://www.nvidia.com/Download/index.aspx
- Linux: `sudo apt update && sudo apt upgrade`

### AMD

- macOS: Обновите macOS через System Settings
- Windows: https://www.amd.com/en/support
- Linux: `sudo apt update && sudo apt upgrade`

### Intel

- macOS: Обновите macOS через System Settings
- Windows: https://www.intel.com/content/www/us/en/download-center/home.html
- Linux: `sudo apt update && sudo apt upgrade`

---

## 🧪 Альтернативные браузеры

Если ни одно решение не помогло, попробуйте:

1. **Safari** (на Mac) - часто работает лучше с WebGL
2. **Firefox** - менее строгая политика WebGL
3. **Brave** - часто работает с "небезопасным" WebGL

---

## 💬 Поддержка

Если ни одно решение не помогло:

1. Уточните модель видеокарты: `About This Menu → System Report → Graphics/Displays`
2. Уточните версию ОС и браузера
3. Попробуйте другой компьютер с новым драйвером видеокарты

---

*После применения любого решения обновите страницу (Ctrl+R или Cmd+R)*