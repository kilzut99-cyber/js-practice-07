'use strict'; // Использование строгого режима для предотвращения ошибок

// ============================================================
// 1. ПОИСК ЭЛЕМЕНТОВ
// WHY? Все ссылки на DOM-узлы собираем в одном месте — легко
// найти и изменить при необходимости.
// ============================================================
const taskInput = document.querySelector('#task-input'); // Поле ввода названия задачи
const prioritySelect = document.querySelector('#priority-select'); // Список выбора приоритета
const addTaskBtn = document.querySelector('#add-task-btn'); // Кнопка подтверждения добавления
const validationMsg = document.querySelector('#validation-msg'); // Параграф для ошибок валидации
const toggleThemeBtn = document.querySelector('#toggle-theme-btn'); // Кнопка переключения тем
const clearDoneBtn = document.querySelector('#clear-done-btn'); // Кнопка очистки готовых задач
const viewModeBtn = document.querySelector('#view-mode-btn'); // Кнопка режима "Только просмотр"
const taskCountEl = document.querySelector('#task-count'); // Счетчик общего числа задач
const board = document.querySelector('#board'); // Основной контейнер доски для делегирования
const welcomeBanner = document.querySelector('#welcome-banner'); // Ссылка на приветственный блок
const closeBannerBtn = document.querySelector('#close-banner-btn'); // Кнопка закрытия баннера

const COLUMN_ORDER = ['todo', 'in-progress', 'done']; // Массив для определения порядка колонок
const PRIORITY_LABELS = { // Объект для текстового отображения приоритетов
    low: '🟢 Низкий',
    medium: '🟡 Средний',
    high: '🔴 Высокий',
};

// ============================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
/** 
* WHY textContent? — Это безопасный способ вставки текста. Он не 
* интерпретирует строку как HTML, что полностью исключает XSS-атаки.
*/
function safeText(node, text) {
    node.textContent = text; // Назначение текстового содержимого узлу
}

function generateId() {
    // Генерация уникального строкового идентификатора на основе времени и рандома
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function showError(msg) {
    safeText(validationMsg, msg); // Показ сообщения об ошибке через безопасную функцию
}

function clearError() {
    validationMsg.textContent = ''; // Мгновенная очистка текста ошибки
}

// ============================================================
// 3. СЧЁТЧИКИ
// ============================================================
/**
* WHY querySelectorAll? — Позволяет найти коллекцию всех элементов 
* по CSS-селектору и использовать свойство .length для подсчета.
*/
function updateCounters() {
    const allCards = document.querySelectorAll('.task-card'); // Поиск всех карточек на доске
    safeText(taskCountEl, String(allCards.length)); // Обновление глобального счетчика
    
    COLUMN_ORDER.forEach(status => {
        const column = document.querySelector(`.column[data-status="${status}"]`); // Поиск колонки по статусу
        const countBadge = column.querySelector('.column-count'); // Поиск бейджа счетчика в колонке
        const cards = column.querySelectorAll('.task-card'); // Поиск карточек только в этой колонке
        safeText(countBadge, String(cards.length)); // Запись количества в бейдж колонки
    });
}

// ============================================================
// 4. СОЗДАНИЕ КАРТОЧКИ ЗАДАЧИ
// ============================================================
/**
* WHY createElement? — Создание узлов через JS-объекты быстрее и 
* надежнее, чем парсинг огромных строк через innerHTML.
*/
function createTaskCard(task) {
    const card = document.createElement('div'); // Создание контейнера задачи
    card.className = 'task-card'; // Назначение базового класса карточки
    card.dataset.id = task.id; // Запись ID в дата-атрибут для идентификации
    card.dataset.priority = task.priority; // Запись приоритета для CSS-стилей

    if (task.priority === 'high') {
        card.classList.add('priority-high'); // WHY? PRO: добавление спец-класса для яркого выделения.
    }

    const title = document.createElement('h3'); // Создание заголовка карточки
    safeText(title, task.text); // Безопасная запись названия задачи

    const badge = document.createElement('span'); // Создание бейджа приоритета
    badge.className = `priority-badge ${task.priority}`; // Динамический класс цвета бейджа
    safeText(badge, PRIORITY_LABELS[task.priority] || task.priority); // Текст приоритета

    const actions = document.createElement('div'); // Контейнер для кнопок управления
    actions.className = 'card-actions'; // Назначение класса кнопок

    // Создание кнопки "Назад"
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-secondary'; // Стиль второстепенной кнопки
    prevBtn.dataset.action = 'prev'; // Атрибут для делегирования
    safeText(prevBtn, '← Назад'); // Текст кнопки

    // Создание кнопки "Вперед"
    const nextBtn = document.createElement('button');
    nextBtn.dataset.action = 'next'; // Атрибут действия перемещения
    safeText(nextBtn, '→ Вперёд'); // Текст кнопки

    // Создание кнопки "Удалить"
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; // Стиль опасной кнопки
    delBtn.dataset.action = 'delete'; // Атрибут действия удаления
    safeText(delBtn, '✕ Удалить'); // Текст удаления

    actions.append(prevBtn, nextBtn, delBtn); // Добавление всех кнопок в блок действий
    card.append(title, badge, actions); // Сборка финальной карточки
    return card; // Возврат готового DOM-узла
}

// ============================================================
// 5. ДОБАВЛЕНИЕ ЗАДАЧИ
// ============================================================
function addTask() {
    const text = (taskInput.value || '').trim(); // Получение текста без лишних пробелов
    const priority = prioritySelect.value; // Получение значения приоритета

    if (text.length < 3) {
        showError('Название задачи должно содержать минимум 3 символа.'); // Валидация по длине
        taskInput.focus(); // Возврат фокуса в поле ввода
        return; // Прерывание выполнения функции
    }
    clearError(); // Очистка ошибок при успешной валидации

    const task = { id: generateId(), text, priority, status: 'todo' }; // Объект данных задачи
    const card = createTaskCard(task); // Генерация визуального узла
    const todoList = document.querySelector('[data-status="todo"] .task-list'); // Поиск первой колонки
    
    todoList.appendChild(card); // WHY appendChild? — Добавляет элемент в DOM без перезагрузки списка.
    taskInput.value = ''; // Сброс поля ввода
    prioritySelect.selectedIndex = 1; // Возврат приоритета к "Среднему"
    taskInput.focus(); // Подготовка к вводу новой задачи
    updateCounters(); // Пересчет индикаторов на доске
    saveToStorage(); // WHY? PRO: автоматическая синхронизация с памятью браузера.
}

// ============================================================
// 6. ОБРАБОТЧИКИ ФОРМЫ
// ============================================================
// WHY addEventListener? — Это современный стандарт. Он позволяет вешать 
// несколько функций на событие и гибко удалять их при необходимости.
addTaskBtn.addEventListener('click', addTask); // Слушатель клика на кнопку "Добавить"

// WHY keydown? — Позволяет поймать нажатие клавиш (Enter/Escape) 
// в момент их возникновения, улучшая UX формы.
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask(); // Добавление по Enter
    if (e.key === 'Escape') { taskInput.value = ''; clearError(); } // Сброс по Escape
});

// ============================================================
// 7. ДЕЛЕГИРОВАНИЕ СОБЫТИЙ НА ДОСКЕ ⭐
// ============================================================
// WHY один обработчик на #board? — Это экономит память (не нужно 
// вешать события на каждую кнопку) и автоматически работает для новых карточек.
function boardClickHandler(e) {
    // WHY closest? — Позволяет найти нужный элемент (карточку или кнопку), 
    // даже если пользователь кликнул на иконку или текст внутри них.
    const actionBtn = e.target.closest('[data-action]'); // Поиск кнопки действия
    const card = e.target.closest('.task-card'); // Поиск самой карточки

    if (!card) return; // Игнорирование клика мимо карточки

    if (actionBtn) {
        // WHY stopPropagation? — Останавливает всплытие, чтобы клик по 
        // кнопке удаления не вызывал «выделение» самой карточки.
        e.stopPropagation(); 
        const action = actionBtn.dataset.action; // Определение типа действия

        if (action === 'delete') {
            if (confirm('Удалить задачу?')) {
                // WHY remove()? — Позволяет удалить элемент из DOM напрямую.
                card.remove(); // Физическое удаление узла
                updateCounters(); // Обновление счетчиков
                saveToStorage(); // Сохранение изменений
            }
        }

        if (action === 'next' || action === 'prev') {
            const currentStatus = card.closest('.column').dataset.status; // Текущий статус
            const currentIndex = COLUMN_ORDER.indexOf(currentStatus); // Индекс в массиве порядка
            const nextIndex = currentIndex + (action === 'next' ? 1 : -1); // Расчет нового индекса

            if (nextIndex >= 0 && nextIndex < COLUMN_ORDER.length) {
                const targetColumn = document.querySelector(`.column[data-status="${COLUMN_ORDER[nextIndex]}"]`); // Поиск целевой колонки
                targetColumn.querySelector('.task-list').appendChild(card); // WHY appendChild? — Переносит существующий узел.
                updateCounters(); // Пересчет
                saveToStorage(); // Синхронизация
            }
        }
        return; // Выход, так как кнопка обработана
    }

    // WHY classList.toggle? — Компактный способ добавить или убрать 
    // класс стиля (выделение) одним вызовом метода.
    card.classList.toggle('selected'); // Переключение визуального выделения карточки
}

board.addEventListener('click', boardClickHandler); // Установка главного слушателя доски

// ============================================================
// 8. УПРАВЛЕНИЕ ТЕМОЙ И ОЧИСТКА
// ============================================================
toggleThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode'); // Переключение глобальной темы оформления
});

clearDoneBtn.addEventListener('click', () => {
    const doneList = document.querySelector('[data-status="done"] .task-list'); // Поиск колонки "Готово"
    const cards = doneList.querySelectorAll('.task-card'); // Поиск всех карточек в ней
    if (!cards.length) {
        alert('Колонка «Готово» уже пуста.'); // Сообщение, если нечего удалять
        return;
    }
    // WHY confirm? — Предотвращает случайную потерю данных, требуя осознанного согласия.
    if (!confirm(`Удалить все ${cards.length} задач?`)) return; // Запрос подтверждения
    cards.forEach(card => card.remove()); // Удаление каждой карточки в цикле
    updateCounters(); // Массовое обновление счетчиков
    saveToStorage(); // Обновление памяти
});

// ============================================================
// 9. PRO: РЕЖИМ ПРОСМОТРА (removeEventListener)
// ============================================================
// WHY removeEventListener требует именованную функцию? — Браузеру 
// нужен точный адрес функции в памяти, чтобы знать, какой именно слушатель отключить.
let isViewMode = false; // Флаг текущего состояния доски
viewModeBtn.addEventListener('click', () => {
    isViewMode = !isViewMode; // Инверсия флага
    if (isViewMode) {
        board.removeEventListener('click', boardClickHandler); // Отключение интерактива доски
        viewModeBtn.classList.add('view-mode-active'); // Визуальный индикатор активного режима
        safeText(viewModeBtn, '✏️ Режим редактирования'); // Обновление текста кнопки
    } else {
        board.addEventListener('click', boardClickHandler); // Возврат обработчика на место
        viewModeBtn.classList.remove('view-mode-active'); // Возврат стиля кнопки
        safeText(viewModeBtn, '👁 Режим просмотра'); // Текст по умолчанию
    }
});

// ============================================================
// 10. PRO: ПРИВЕТСТВЕННЫЙ БАННЕР ({ once: true })
// ============================================================
// WHY { once: true }? — Позволяет автоматически удалить слушатель 
// после первого срабатывания, экономя системные ресурсы.
closeBannerBtn.addEventListener('click', () => {
    welcomeBanner.remove(); // Удаление баннера из DOM
}, { once: true }); // Удаление самого слушателя событий браузером

// ============================================================
// 11. PRO: localStorage
// ============================================================
function saveToStorage() {
    const tasks = Array.from(document.querySelectorAll('.task-card')).map(card => ({
        id: card.dataset.id, // Извлечение идентификатора
        text: card.querySelector('h3').textContent, // Извлечение текста
        priority: card.dataset.priority, // Извлечение важности
        status: card.closest('.column').dataset.status // Определение текущей колонки
    }));
    // Сохранение сериализованного массива задач под ключом "tasks-v1"
    localStorage.setItem('tasks-v1', JSON.stringify(tasks)); 
}

function loadFromStorage() {
    const data = localStorage.getItem('tasks-v1'); // Чтение строки из памяти
    if (!data) return; // Если данных нет — выход
    JSON.parse(data).forEach(task => { // Десериализация и перебор
        const card = createTaskCard(task); // Восстановление визуального узла
        // Поиск нужной колонки по сохраненному статусу и вставка карточки
        document.querySelector(`.column[data-status="${task.status}"] .task-list`).appendChild(card);
    });
    updateCounters(); // Пересчет всех цифр после загрузки
}

// ============================================================
// 12. ИНИЦИАЛИЗАЦИЯ
// ============================================================
updateCounters(); // Стартовый запуск для синхронизации заголовков
loadFromStorage(); // Попытка восстановления данных при загрузке страницы