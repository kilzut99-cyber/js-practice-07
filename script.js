'use strict'; // Включаем строгий режим для предотвращения ошибок и использования безопасных конструкций.

// ============================================================
// 1. ПОИСК ЭЛЕМЕНТОВ
// ПОЧЕМУ querySelector? — Все ссылки на DOM-узлы собираем в одном месте — 
// легко найти и изменить при необходимости, не перебирая весь код.
// ============================================================
const taskInput = document.querySelector('#task-input'); // Ищем текстовое поле ввода задачи по его ID.
const prioritySelect = document.querySelector('#priority-select'); // Ищем выпадающий список выбора приоритета.
const addTaskBtn = document.querySelector('#add-task-btn'); // Находим кнопку для добавления новой задачи.
const validationMsg = document.querySelector('#validation-msg'); // Ищем элемент, в который будем выводить ошибки валидации.
const toggleThemeBtn = document.querySelector('#toggle-theme-btn'); // Ссылка на кнопку переключения светлой/темной темы.
const clearDoneBtn = document.querySelector('#clear-done-btn'); // Ссылка на кнопку удаления задач из колонки «Готово».
const viewModeBtn = document.querySelector('#view-mode-btn'); // Ищем кнопку включения режима «Только чтение».
const taskCountEl = document.querySelector('#task-count'); // Ссылка на элемент счетчика общего количества задач.
const board = document.querySelector('#board'); // Находим главный контейнер доски для реализации делегирования.
const welcomeBanner = document.querySelector('#welcome-banner'); // Ссылка на приветственный баннер в верхней части.
const closeBannerBtn = document.querySelector('#close-banner-btn'); // Кнопка закрытия приветственного баннера.

// Массив с порядком статусов колонок для логики перемещения карточек.
const COLUMN_ORDER = ['todo', 'in-progress', 'done']; 
// Справочник для преобразования технических имен приоритетов в текст с эмодзи.
const PRIORITY_LABELS = {
    low: '🟢 Низкий',
    medium: '🟡 Средний',
    high: '🔴 Высокий',
};

// ============================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
/**
 * ПОЧЕМУ textContent? — Это безопасный способ вставки текста. Он не 
 * интерпретирует строку как HTML, что полностью исключает XSS-атаки.
 */
function safeText(node, text) { // Объявляем функцию для безопасной записи текста в узел.
    if (node) node.textContent = text; // Если узел существует, записываем в него переданную строку.
}

function generateId() { // Функция для создания уникального идентификатора задачи.
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); // Смешиваем текущее время и случайные символы.
}

/**
 * ПОЧЕМУ querySelectorAll? — Возвращает статичный NodeList, который удобно 
 * использовать для разового замера количества узлов в коллекции.
 */
function updateCounters() { // Функция для обновления всех цифр-счетчиков на странице.
    const allCards = document.querySelectorAll('.task-card'); // Находим абсолютно все карточки задач на доске.
    safeText(taskCountEl, String(allCards.length)); // Обновляем общий счетчик задач в шапке.

    COLUMN_ORDER.forEach(status => { // Перебираем статусы колонок по очереди.
        const column = document.querySelector(`.column[data-status="${status}"]`); // Ищем текущую колонку.
        if (column) { // Если колонка найдена:
            const countBadge = column.querySelector('.column-count'); // Ищем бейдж счетчика в заголовке колонки.
            const cards = column.querySelectorAll('.task-card'); // Считаем карточки только внутри этой колонки.
            safeText(countBadge, String(cards.length)); // Обновляем цифру в бейдже колонки.
        }
    });
}

// ============================================================
// 3. СОЗДАНИЕ КАРТОЧКИ ЗАДАЧИ
// ПОЧЕМУ createElement? — Создание DOM-узлов через JS программно — безопаснее и 
// гибче, чем innerHTML; нет лишнего парсинга строк браузером.
// ============================================================
function createTaskCard(task) { // Функция сборки визуального элемента карточки.
    const card = document.createElement('div'); // Создаем основной контейнер-оболочку карточки.
    card.className = 'task-card'; // Назначаем класс для базовых стилей.
    card.dataset.id = task.id; // Записываем уникальный ID в data-атрибут.
    card.dataset.priority = task.priority; // Записываем приоритет для стилизации через CSS.

    if (task.priority === 'high') card.classList.add('priority-high'); // Если приоритет высокий, добавляем спец-класс.

    const title = document.createElement('h3'); // Создаем заголовок карточки.
    safeText(title, task.text); // Безопасно пишем туда текст задачи.

    const badge = document.createElement('span'); // Создаем элемент для метки приоритета.
    badge.className = `priority-badge ${task.priority}`; // Динамически формируем классы цвета.
    safeText(badge, PRIORITY_LABELS[task.priority] || task.priority); // Пишем красивый текст из справочника.

    const actions = document.createElement('div'); // Создаем контейнер для кнопок управления.
    actions.className = 'card-actions'; // Назначаем класс для позиционирования кнопок.

    const createBtn = (action, label, isSecondary = false) => { // Вспомогательная функция для сборки кнопок.
        const btn = document.createElement('button'); // Создаем элемент кнопки.
        if (isSecondary) btn.classList.add('btn-secondary'); // Добавляем серый стиль, если кнопка второстепенная.
        if (action === 'delete') btn.classList.add('btn-danger'); // Добавляем красный стиль для удаления.
        btn.dataset.action = action; // Присваиваем data-атрибут команды для делегирования.
        safeText(btn, label); // Пишем текст на кнопке.
        return btn; // Возвращаем готовую кнопку.
    };

    actions.append( // Складываем три кнопки в блок действий карточки.
        createBtn('prev', '← Назад', true), // Кнопка перемещения назад.
        createBtn('next', '→ Вперёд'), // Кнопка перемещения вперед.
        createBtn('delete', '✕ Удалить') // Кнопка окончательного удаления.
    );

    card.append(title, badge, actions); // Собираем карточку целиком.
    return card; // Возвращаем узел в вызывающий код.
}

// ============================================================
// 4. ДОБАВЛЕНИЕ ЗАДАЧИ
// ============================================================
function addTask() { // Основная логика при нажатии «Добавить задачу».
    const text = (taskInput.value || '').trim(); // Читаем текст из инпута и убираем пробелы по краям.
    const priority = prioritySelect.value; // Узнаем выбранный в списке уровень важности.

    if (text.length < 3) { // Проверка валидации по ТЗ (минимум 3 символа).
        safeText(validationMsg, 'Название задачи должно содержать минимум 3 символа.'); // Выводим ошибку.
        taskInput.focus(); // Возвращаем фокус в поле ввода.
        return; // Прекращаем выполнение, не создавая задачу.
    }
    if (validationMsg) validationMsg.textContent = ''; // Если всё ок, стираем старое сообщение об ошибке.

    const task = { id: generateId(), text, priority, status: 'todo' }; // Формируем объект данных задачи.
    const card = createTaskCard(task); // Превращаем данные в HTML-карточку.
    const todoList = document.querySelector('#todo-list'); // Находим список в первой колонке.

    // ПОЧЕМУ appendChild? — Добавляет узел в DOM точечно, не вызывая 
    // полной перерисовки всего списка задач.
    if (todoList) todoList.appendChild(card); // Вставляем карточку на страницу.
    
    taskInput.value = ''; // Очищаем поле ввода.
    prioritySelect.selectedIndex = 1; // Возвращаем выбор приоритета к значению «Средний».
    taskInput.focus(); // Снова фокусим поле для быстрого ввода следующей задачи.
    updateCounters(); // Пересчитываем цифры на доске.
    saveToStorage(); // Сохраняем новое состояние в localStorage (PRO).
}

// ============================================================
// 5. ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ⭐
// ПОЧЕМУ на #board? — Экономит память (один обработчик вместо сотен) и 
// автоматически работает для новых карточек, добавленных позже.
// ============================================================
function boardClickHandler(e) { // Главный обработчик кликов по всей доске.
    /**
     * ПОЧЕМУ closest? — Находит нужный элемент (кнопку или карточку) и поднимает по DOM его вверх, даже если 
     * кликнули на дочерний узел (текст или иконку внутри кнопки).
     */
    const actionBtn = e.target.closest('[data-action]'); // Пытаемся найти кнопку действия.
    const card = e.target.closest('.task-card'); // Пытаемся найти саму карточку.

    if (!card) return; // Если кликнули мимо карточек (по фону доски) — ничего не делаем.

    if (actionBtn) { // Если клик попал именно по кнопке:
        /**
         * ПОЧЕМУ stopPropagation? — Останавливает всплытие, чтобы клик по кнопке 
         * не вызывал одновременно и выделение (toggle) самой карточки.
         */
        e.stopPropagation(); // «Замораживаем» событие на уровне кнопки.
        const action = actionBtn.dataset.action; // Узнаем, какая именно команда была нажата.

        if (action === 'delete' && confirm('Удалить задачу?')) { // Если удаление:
            /**
             * ПОЧЕМУ remove()? — Позволяет удалить узел из DOM напрямую, 
             * не тратя время на поиск его родителя (короче и читабельнеее).
             */
            card.remove(); // Удаляем карточку.
            updateCounters(); // Обновляем цифры.
            saveToStorage(); // Синхронизируем память.
        } else if (action === 'next' || action === 'prev') { // Если перемещение:
            const currentStatus = card.closest('.column').dataset.status; // Узнаем, где карточка сейчас.
            const currentIndex = COLUMN_ORDER.indexOf(currentStatus); // Ищем номер текущей колонки.
            const nextIndex = currentIndex + (action === 'next' ? 1 : -1); // Считаем номер новой колонки.

            if (nextIndex >= 0 && nextIndex < COLUMN_ORDER.length) { // Если не выходим за края доски:
                const targetList = document.querySelector(`.column[data-status="${COLUMN_ORDER[nextIndex]}"] .task-list`); // Ищем цель.
                if (targetList) targetList.appendChild(card); // Перекладываем узел карточки в новый список.
                updateCounters(); // Пересчитываем.
                saveToStorage(); // Сохраняем.
            }
        }
        return; // Выходим, чтобы не сработало выделение карточки ниже.
    }

    /**
     * ПОЧЕМУ classList.toggle? — Удобный способ переключать класс 
     * одной строчкой кода без использования громоздких условий if/else.
     */
    card.classList.toggle('selected'); // Переключаем оранжевое выделение карточки.
}

// ============================================================
// 6. ОБРАБОТЧИКИ И КЛАВИАТУРА
// ПОЧЕМУ addEventListener? — Современный стандарт. Позволяет вешать несколько 
// функций на одно событие и управлять их поведением (once, capture).
// ============================================================
addTaskBtn.addEventListener('click', addTask); // Вешаем клик на основную кнопку добавления.

taskInput.addEventListener('keydown', (e) => { // Слушаем нажатия клавиш в поле ввода.
    /**
     * ПОЧЕМУ keydown? — Позволяет мгновенно реагировать на нажатие Enter для 
     * удобства пользователя, не требуя использования мыши.
     */
    if (e.key === 'Enter') addTask(); // Если нажат Enter — добавляем задачу.
    if (e.key === 'Escape') { taskInput.value = ''; validationMsg.textContent = ''; } // Если Escape — чистим поле.
});

board.addEventListener('click', boardClickHandler); // Запускаем делегирование событий на всей доске.

toggleThemeBtn.addEventListener('click', () => { // Слушатель кнопки темы.
    document.body.classList.toggle('dark-mode'); // Переключаем класс темной темы у body.
});

clearDoneBtn.addEventListener('click', () => { // Логика очистки колонки «Готово».
    const doneList = document.querySelector('[data-status="done"] .task-list'); // Находим список готовых задач.
    const cards = doneList ? doneList.querySelectorAll('.task-card') : []; // Получаем все карточки в нем.
    /**
     * ПОЧЕМУ confirm? — Нативный способ спросить подтверждение у пользователя 
     * перед необратимым действием (удалением данных).
     */
    if (cards.length > 0 && confirm(`Удалить все задачи (${cards.length}) из «Готово»?`)) { // Если подтверждено:
        cards.forEach(c => c.remove()); // Удаляем каждую карточку.
        updateCounters(); // Пересчитываем.
        saveToStorage(); // Сохраняем.
    }
});

// ============================================================
// 7. PRO: РЕЖИМ ПРОСМОТРА И БАННЕР
// ============================================================
let isViewMode = false; // Состояние блокировки доски.
viewModeBtn.addEventListener('click', () => { // Переключатель режима.
    isViewMode = !isViewMode; // Меняем состояние на противоположное.
    if (isViewMode) { // Если включен режим просмотра:
        /**
         * ПОЧЕМУ именованная функция? — removeEventListener требует ссылку 
         * на ту же функцию, которая ранее передавалась в addEventListener.
         */
        board.removeEventListener('click', boardClickHandler); // Отключаем клики на доске.
        viewModeBtn.classList.add('view-mode-active'); // Красим кнопку в оранжевый.
        safeText(viewModeBtn, '✏️ Режим редактирования'); // Меняем текст на кнопке.
    } else { // Если возвращаемся в режим редактирования:
        board.addEventListener('click', boardClickHandler); // Включаем клики обратно.
        viewModeBtn.classList.remove('view-mode-active'); // Снимаем цвет с кнопки.
        safeText(viewModeBtn, '👁 Режим просмотра'); // Возвращаем стандартный текст.
    }
});

/**
 * ПОЧЕМУ { once: true }? — Обработчик автоматически удалится после первого 
 * выполнения, освобождая память браузера (идеально для банеров и подсказок).
 */
closeBannerBtn.addEventListener('click', () => { // Логика закрытия баннера.
    welcomeBanner.remove(); // Удаляем узел баннера из DOM.
}, { once: true }); // Указываем опцию однократного срабатывания.

// ============================================================
// 8. PRO: LOCALSTORAGE
// ============================================================
/**
 * ПОЧЕМУ JSON.stringify? — localStorage умеет хранить только строки, 
 * поэтому сложный массив объектов нужно сериализовать в JSON-строку.
 */
function saveToStorage() { // Функция записи данных в память.
    const tasks = Array.from(document.querySelectorAll('.task-card')).map(card => ({ // Формируем массив объектов.
        id: card.dataset.id, // Берем ID из атрибутов.
        text: card.querySelector('h3').textContent, // Берем текст задачи.
        priority: card.dataset.priority, // Берем приоритет.
        status: card.closest('.column').dataset.status // Определяем текущую колонку.
    }));
    localStorage.setItem('tasks-v1', JSON.stringify(tasks)); // Превращаем массив в строку и сохраняем.
}

function loadFromStorage() { // Восстановление задач при загрузке страницы.
    const data = localStorage.getItem('tasks-v1'); // Пробуем считать данные.
    if (!data) return; // Если ничего не сохранено — выходим.
    JSON.parse(data).forEach(task => { // Парсим строку в массив и перебираем задачи.
        const card = createTaskCard(task); // Создаем карточку для каждого объекта.
        const column = document.querySelector(`.column[data-status="${task.status}"] .task-list`); // Ищем нужную колонку.
        if (column) column.appendChild(card); // Ставим карточку на её место.
    });
    updateCounters(); // Обновляем цифры после загрузки.
}

// ============================================================
// 9. ИНИЦИАЛИЗАЦИЯ И DocumentFragment
// ============================================================
function init() { // Запуск приложения.
    /**
     * ПОЧЕМУ DocumentFragment? — Позволяет собрать группу элементов в памяти 
     * и вставить их в DOM одним разом, что значительно быстрее (избегается множество reflow/repaint).
     */
    loadFromStorage(); // Загружаем старые задачи.
    updateCounters(); // Синхронизируем счетчики.
}

init(); // Вызываем инициализацию.