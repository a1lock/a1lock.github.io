// ВАШ КЛЮЧ (вставьте тот же, что и в checkout.js)
const API_KEY = '430d9b8c-31a5-4b71-a7aa-ed8ab980daba'; 
const API_URL_ORDERS = `https://edu.std-900.ist.mospolytech.ru/labs/api/orders?api_key=${API_KEY}`;
const API_URL_DISHES = `https://edu.std-900.ist.mospolytech.ru/labs/api/dishes?api_key=${API_KEY}`;

let allDishes = [];
let allOrders = [];

// переменные для хранения текущего редактируемого/удаляемого заказа
let currentOrderId = null;
let currentOrderData = null; 

// инициализация страницы
async function initOrdersPage() {
    // 1. Сначала загружаем блюда (чтобы знать их названия)
    await loadDishes();
    // 2. Потом загружаем заказы
    await loadOrders();
}

async function loadDishes() {
    try {
        const response = await fetch(API_URL_DISHES);
        allDishes = await response.json();
    } catch (error) {
        console.error('ошибка загрузки блюд:', error);
    }
}

async function loadOrders() {
    try {
        const response = await fetch(API_URL_ORDERS);
        allOrders = await response.json();
        
        // сортировка: новые сверху (по убыванию created_at)
        allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        renderTable();
    } catch (error) {
        console.error('ошибка загрузки заказов:', error);
        showNotification('Ошибка загрузки истории заказов');
    }
}

// отрисовка таблицы
function renderTable() {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '';

    if (allOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">История заказов пуста</td></tr>';
        return;
    }

    allOrders.forEach((order, index) => {
        const tr = document.createElement('tr');
        
        // собираем названия блюд
        const dishesNames = getDishesNames(order);
        
        // форматируем дату и время
        const dateStr = formatDate(order.created_at);
        const timeStr = formatDeliveryTime(order);

        // считаем цену (если сервер не присылает total_price, считаем сами)
        const price = order.total_price || calculatePrice(order);

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${dateStr}</td>
            <td>${dishesNames}</td>
            <td>${price}₽</td>
            <td>${timeStr}</td>
            <td>
                <span class="action-btn" title="Подробнее" onclick="openViewModal(${order.id})">👁️</span>
                <span class="action-btn" title="Редактировать" onclick="openEditModal(${order.id})">✎</span>
                <span class="action-btn" title="Удалить" onclick="openDeleteModal(${order.id})">🗑️</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// помощник: получить строку с названиями блюд
function getDishesNames(order) {
    // собираем id всех блюд заказа
    const ids = [order.soup_id, order.main_course_id, order.salad_id, order.drink_id, order.dessert_id];
    let names = [];
    
    ids.forEach(id => {
        if (id) {
            const dish = allDishes.find(d => d.id === id);
            if (dish) names.push(dish.name);
        }
    });
    
    return names.join(', ');
}

// помощник: цена
function calculatePrice(order) {
    const ids = [order.soup_id, order.main_course_id, order.salad_id, order.drink_id, order.dessert_id];
    let sum = 0;
    ids.forEach(id => {
        if (id) {
            const dish = allDishes.find(d => d.id === id);
            if (dish) sum += dish.price;
        }
    });
    return sum;
}

// помощник: дата создания (DD.MM.YYYY HH:MM)
function formatDate(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    // добавляем ведущий ноль если нужно
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    const hours = ('0' + d.getHours()).slice(-2);
    const minutes = ('0' + d.getMinutes()).slice(-2);
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// помощник: время доставки
function formatDeliveryTime(order) {
    if (order.delivery_type === 'now') {
        return 'Как можно скорее (с 7:00 до 23:00)';
    } else {
        return order.delivery_time || '';
    }
}

// --- МОДАЛЬНЫЕ ОКНА ---

// общее закрытие по кнопкам
document.querySelectorAll('.close-btn, .modal-footer button').forEach(btn => {
    // если кнопка имеет атрибут data-modal, она закрывает это окно
    if (btn.hasAttribute('data-modal')) {
        btn.addEventListener('click', function() {
            // если это кнопка "Да, удалить" или "Сохранить", мы их обработаем отдельно
            // поэтому здесь обрабатываем только "Закрыть/Отмена"
            if (this.classList.contains('delete_action_btn') || this.type === 'submit') return;
            
            const modalId = this.getAttribute('data-modal');
            document.getElementById(modalId).classList.remove('open');
        });
    }
});

// закрытие по клику вне окна
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('open');
    }
};

// 1. ПРОСМОТР
function openViewModal(id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;

    const content = document.getElementById('view-modal-content');
    
    // формируем список блюд с ценами
    const dishIds = [order.soup_id, order.main_course_id, order.salad_id, order.drink_id, order.dessert_id];
    let dishesHtml = '';
    dishIds.forEach(did => {
        if (did) {
            const d = allDishes.find(x => x.id === did);
            if (d) dishesHtml += `<p>${d.name} (${d.price}₽)</p>`;
        }
    });

    const price = calculatePrice(order);

    content.innerHTML = `
        <div class="modal-row"><strong>Дата оформления:</strong> ${formatDate(order.created_at)}</div>
        <div class="modal-row"><strong>Имя:</strong> ${order.full_name}</div>
        <div class="modal-row"><strong>Адрес:</strong> ${order.delivery_address}</div>
        <div class="modal-row"><strong>Телефон:</strong> ${order.phone}</div>
        <div class="modal-row"><strong>Email:</strong> ${order.email}</div>
        <div class="modal-row"><strong>Время доставки:</strong> ${formatDeliveryTime(order)}</div>
        <div class="modal-row"><strong>Комментарий:</strong> ${order.comment || '-'}</div>
        <hr>
        <h4>Состав заказа:</h4>
        ${dishesHtml}
        <div class="modal-row" style="margin-top:10px;"><strong>Итого:</strong> ${price}₽</div>
    `;

    document.getElementById('view-modal').classList.add('open');
}

// 2. УДАЛЕНИЕ
function openDeleteModal(id) {
    currentOrderId = id;
    document.getElementById('delete-modal').classList.add('open');
}

document.getElementById('confirm-delete-btn').addEventListener('click', async function() {
    if (!currentOrderId) return;
    
    try {
        const url = `https://edu.std-900.ist.mospolytech.ru/labs/api/orders/${currentOrderId}?api_key=${API_KEY}`;
        const response = await fetch(url, { method: 'DELETE' });
        
        if (response.ok) {
            showNotification('Заказ успешно удален');
            document.getElementById('delete-modal').classList.remove('open');
            // перезагружаем таблицу
            loadOrders();
        } else {
            showNotification('Ошибка удаления');
        }
    } catch (e) {
        console.error(e);
        showNotification('Ошибка сети');
    }
});

// 3. РЕДАКТИРОВАНИЕ
function openEditModal(id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;
    
    currentOrderId = id;
    currentOrderData = order; // запоминаем весь объект, чтобы не потерять блюда

    const form = document.getElementById('edit-form');
    form.full_name.value = order.full_name;
    form.email.value = order.email;
    form.phone.value = order.phone;
    form.delivery_address.value = order.delivery_address;
    form.comment.value = order.comment || '';
    
    if (order.delivery_type === 'now') {
        document.getElementById('edit_now').checked = true;
    } else {
        document.getElementById('edit_by_time').checked = true;
    }
    
    form.delivery_time.value = order.delivery_time || '';

    document.getElementById('edit-modal').classList.add('open');
}

document.getElementById('edit-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const formData = new FormData(this);
    
    // Мы должны отправить ВСЕ данные заказа, включая блюда,
    // иначе сервер может их стереть, если API так устроен.
    // Поэтому берем старые данные из currentOrderData и обновляем поля из формы.
    
    const sendData = {
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        delivery_address: formData.get('delivery_address'),
        delivery_type: formData.get('delivery_type'),
        delivery_time: formData.get('delivery_time'),
        comment: formData.get('comment'),
        subscribe: currentOrderData.subscribe, // оставляем как было
        
        // ВАЖНО: передаем ID блюд, чтобы они не пропали
        soup_id: currentOrderData.soup_id,
        main_course_id: currentOrderData.main_course_id,
        salad_id: currentOrderData.salad_id,
        drink_id: currentOrderData.drink_id,
        dessert_id: currentOrderData.dessert_id
    };

    try {
        const url = `https://edu.std-900.ist.mospolytech.ru/labs/api/orders/${currentOrderId}?api_key=${API_KEY}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sendData)
        });

        if (response.ok) {
            showNotification('Заказ успешно обновлен');
            document.getElementById('edit-modal').classList.remove('open');
            loadOrders();
        } else {
            showNotification('Ошибка обновления');
        }
    } catch (e) {
        console.error(e);
        showNotification('Ошибка сети');
    }
});

// Уведомления (копия из прошлых лаб)
function showNotification(message) {
    let box = document.createElement('div');
    box.style.position = 'fixed';
    box.style.top = '10%';
    box.style.left = '50%';
    box.style.transform = 'translate(-50%, 0)';
    box.style.background = 'white';
    box.style.padding = '20px';
    box.style.border = '2px solid tomato';
    box.style.borderRadius = '10px';
    box.style.zIndex = '3000';
    box.innerHTML = `<p>${message}</p>`;
    document.body.appendChild(box);
    
    setTimeout(() => box.remove(), 3000);
}

// Запуск
initOrdersPage();