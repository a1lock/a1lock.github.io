// Переменные для хранения выбранных ID (а не объектов блюд)
// Мы храним ID, так как это требует задание для localStorage
let currentOrder = {
    soup: null,
    main: null,
    salad: null,
    drink: null,
    dessert: null
};

// Все загруженные блюда (для отрисовки и подсчета цены)
let allDishes = [];

const API_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api/dishes';

// Загрузка блюд
async function loadDishes() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        // Исправление категории main-course
        allDishes = data.map(item => {
            if (item.category === 'main-course') item.category = 'main';
            return item;
        }).sort((a, b) => a.name.localeCompare(b.name));

        renderAllCategories();
        
        // Восстановление состояния из localStorage при перезагрузке
        restoreOrderFromStorage();
        
        setupFilters();
        updateStickyBar();

    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function renderAllCategories() {
    renderCategory('soup', 'soup_container');
    renderCategory('main', 'main_container');
    renderCategory('salad', 'salad_container');
    renderCategory('drink', 'drink_container');
    renderCategory('dessert', 'dessert_container');
}

function renderCategory(category, containerId, filterKind = null) {
    let container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    for (let item of allDishes) {
        if (item.category !== category) continue;
        if (filterKind && item.kind !== filterKind) continue;

        let elem = document.createElement('div');
        elem.className = 'dish';
        elem.setAttribute('data-dish', item.keyword);
        
        elem.innerHTML = `
            <img class="dish_image" src="${item.image}" alt="">
            <p class="dish_price">${item.price}₽</p>
            <p class="dish_name">${item.name}</p>
            <p class="dish_weight">${item.count}</p>
            <button class="dish_button">Добавить</button>
        `;

        elem.addEventListener('click', function() {
            // Сохраняем ID выбранного блюда в нашу структуру
            // Если item.category == 'soup', пишем в currentOrder.soup
            currentOrder[item.category] = item.id;
            
            // Сохраняем в localStorage
            localStorage.setItem('myOrder', JSON.stringify(currentOrder));
            
            updateStickyBar();
        });

        container.appendChild(elem);
    }
}

// Восстановление выбора
function restoreOrderFromStorage() {
    const stored = localStorage.getItem('myOrder');
    if (stored) {
        currentOrder = JSON.parse(stored);
    }
}

// Обновление нижней панели
function updateStickyBar() {
    let bar = document.getElementById('bottom_bar');
    let priceEl = document.getElementById('total_price_bar');
    let linkBtn = document.getElementById('order_link');

    // Проверяем, пусто ли (есть ли хоть один ID)
    let isEmpty = !Object.values(currentOrder).some(id => id !== null);

    if (isEmpty) {
        bar.classList.remove('visible');
    } else {
        bar.classList.add('visible');
        
        // Считаем сумму
        let sum = 0;
        for (let key in currentOrder) {
            let id = currentOrder[key];
            if (id) {
                let dish = allDishes.find(d => d.id === id);
                if (dish) sum += dish.price;
            }
        }
        priceEl.textContent = sum;

        // Валидация комбо (как в ЛР 6)
        // Для удобства найдем сами объекты
        let s = currentOrder.soup;
        let m = currentOrder.main;
        let sl = currentOrder.salad;
        let d = currentOrder.drink;

        let isValid = false;
        // Логика:
        // 1. Суп + Главное + Салат + Напиток
        if (s && m && sl && d) isValid = true;
        // 2. Суп + Главное + Напиток
        else if (s && m && d) isValid = true;
        // 3. Суп + Салат + Напиток
        else if (s && sl && d) isValid = true;
        // 4. Главное + Салат + Напиток
        else if (m && sl && d) isValid = true;
        // 5. Главное + Напиток
        else if (m && d) isValid = true;

        if (isValid) {
            linkBtn.classList.remove('disabled');
            linkBtn.removeAttribute('disabled'); // для семантики
        } else {
            linkBtn.classList.add('disabled');
            linkBtn.setAttribute('disabled', 'true');
        }
    }
}

// Фильтры (такие же как были)
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            let section = btn.closest('section');
            let container = section.querySelector('.dishes_div');
            let category = '';
            
            if (container.id === 'soup_container') category = 'soup';
            if (container.id === 'main_container') category = 'main';
            if (container.id === 'salad_container') category = 'salad';
            if (container.id === 'drink_container') category = 'drink';
            if (container.id === 'dessert_container') category = 'dessert';

            let kind = btn.getAttribute('data-kind');

            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                renderCategory(category, container.id, null);
            } else {
                section.querySelectorAll('.filter-btn').forEach(s => s.classList.remove('active'));
                btn.classList.add('active');
                renderCategory(category, container.id, kind);
            }
        });
    });
}

loadDishes();