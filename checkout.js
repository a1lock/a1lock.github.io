
const API_KEY = '430d9b8c-31a5-4b71-a7aa-ed8ab980daba'; 
const API_URL = `https://edu.std-900.ist.mospolytech.ru/labs/api/dishes?api_key=${API_KEY}`;
const ORDER_URL = `https://edu.std-900.ist.mospolytech.ru/labs/api/orders?api_key=${API_KEY}`;

let currentOrder = {};
let allDishes = [];

async function initCheckout() {
    // 1. Грузим данные из localStorage
    const stored = localStorage.getItem('myOrder');
    if (stored) {
        currentOrder = JSON.parse(stored);
    }

    // 2. Грузим список блюд с сервера, чтобы отобразить карточки
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        allDishes = data.map(item => {
            if (item.category === 'main-course') item.category = 'main';
            return item;
        });

        renderOrder();
        renderSummary();

    } catch (error) {
        console.error('Ошибка загрузки меню:', error);
    }
}

// Отрисовка карточек выбранных блюд
function renderOrder() {
    const grid = document.getElementById('order_grid');
    const emptyMsg = document.getElementById('empty_cart_msg');
    
    grid.innerHTML = '';
    
    // Проверяем, есть ли хоть что-то
    const hasItems = Object.values(currentOrder).some(id => id !== null);

    if (!hasItems) {
        emptyMsg.style.display = 'block';
        return; // Нечего рисовать
    } else {
        emptyMsg.style.display = 'none';
    }

    // Пробегаемся по категориям в порядке
    const categories = ['soup', 'main', 'salad', 'drink', 'dessert'];

    categories.forEach(cat => {
        const dishId = currentOrder[cat];
        if (dishId) {
            const dish = allDishes.find(d => d.id === dishId);
            if (dish) {
                const card = createDishCard(dish);
                grid.appendChild(card);
            }
        }
    });
}

function createDishCard(item) {
    let elem = document.createElement('div');
    elem.className = 'dish';
    
    elem.innerHTML = `
        <img class="dish_image" src="${item.image}" alt="">
        <p class="dish_price">${item.price}₽</p>
        <p class="dish_name">${item.name}</p>
        <p class="dish_weight">${item.count}</p>
        <button class="dish_button delete_btn">Удалить</button>
    `;

    // Обработчик удаления
    elem.querySelector('.delete_btn').addEventListener('click', function() {
        // Удаляем из объекта заказа
        currentOrder[item.category] = null;
        // Обновляем localStorage
        localStorage.setItem('myOrder', JSON.stringify(currentOrder));
        // Перерисовываем
        renderOrder();
        renderSummary();
    });

    return elem;
}

// Отрисовка правой колонки (текстовый состав и цена)
function renderSummary() {
    let sum = 0;
    
    // Вспомогательная функция
    function updateRow(cat, labelId, labelText) {
        const id = currentOrder[cat];
        const el = document.getElementById(labelId);
        if (id) {
            const dish = allDishes.find(d => d.id === id);
            if (dish) {
                el.innerHTML = `<h4 class="order_item_title">${labelText}</h4><p>${dish.name} ${dish.price}₽</p>`;
                sum += dish.price;
                return;
            }
        }
        // Если блюдо удалено или не выбрано
        el.innerHTML = `<h4 class="order_item_title">${labelText}</h4><p>Ничего не выбрано</p>`;
    }

    updateRow('soup', 'summary_soup', 'Суп');
    updateRow('main', 'summary_main', 'Главное блюдо');
    updateRow('salad', 'summary_salad', 'Салат');
    updateRow('drink', 'summary_drink', 'Напиток');
    updateRow('dessert', 'summary_dessert', 'Десерт');

    document.getElementById('total_price').textContent = sum + '₽';
}

// Обработка отправки формы
document.getElementById('checkout-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Снова проверяем комбо перед отправкой (по заданию)
    if (!checkComboValidity()) {
        showNotification('Состав заказа неполный! Проверьте комбо.');
        return;
    }

    // Собираем данные формы
    const formData = new FormData(this);
    
    // Формируем объект для отправки
    const sendData = {
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        subscribe: formData.get('subscribe') ? true : false,
        phone: formData.get('phone'),
        delivery_address: formData.get('delivery_address'),
        delivery_type: formData.get('delivery_type'),
        delivery_time: formData.get('delivery_time'),
        comment: formData.get('comments'),
        
        // ID блюд
        soup_id: currentOrder.soup,
        main_course_id: currentOrder.main,
        salad_id: currentOrder.salad,
        drink_id: currentOrder.drink,
        dessert_id: currentOrder.dessert
    };

    try {
        const response = await fetch(ORDER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sendData)
        });

        if (response.ok) {
            const result = await response.json();
            showNotification('Заказ успешно оформлен!');
            
            // Очищаем заказ
            localStorage.removeItem('myOrder');
            currentOrder = { soup: null, main: null, salad: null, drink: null, dessert: null };
            
            // Перенаправляем на главную или обновляем страницу
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            const err = await response.json();
            showNotification('Ошибка: ' + (err.error || 'Неизвестная ошибка'));
        }

    } catch (e) {
        showNotification('Ошибка сети');
        console.error(e);
    }
});

// Проверка валидности комбо (копия логики из order.js)
function checkComboValidity() {
    let s = currentOrder.soup;
    let m = currentOrder.main;
    let sl = currentOrder.salad;
    let d = currentOrder.drink;

    if (s && m && sl && d) return true;
    if (s && m && d) return true;
    if (s && sl && d) return true;
    if (m && sl && d) return true;
    if (m && d) return true;
    
    return false;
}

function showNotification(message) {
    // Простая реализация уведомления (можно взять из order.js)
    let box = document.createElement('div');
    box.style.position = 'fixed';
    box.style.top = '50%';
    box.style.left = '50%';
    box.style.transform = 'translate(-50%, -50%)';
    box.style.background = 'white';
    box.style.padding = '20px';
    box.style.border = '2px solid tomato';
    box.style.zIndex = '2000';
    box.innerHTML = `<p>${message}</p><button onclick="this.parentElement.remove()">ОК</button>`;
    document.body.appendChild(box);
}

// Запуск
initCheckout();