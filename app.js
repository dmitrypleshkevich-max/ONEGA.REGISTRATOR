const APP = { goodsFile: "goods.csv" };
const STATE = { waitSSCC: false, currentContainer: null };
const GOODS = new Map();
const PALLETS = new Map();

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    e.innerText = text; e.style.color = color;
}

// Управление видимостью по ID
function toggleSSCCField(show) {
    const el = document.getElementById("ssccFieldWrapper");
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
}

document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const code = e.target.value.trim();
        const good = GOODS.get(code);

        if (good) {
            STATE.currentContainer = code;

            if (good.askSSCC === "1") {
                STATE.waitSSCC = true;
                toggleSSCCField(true);
                setStatus(`Товар: ${good.name}. Введите SSCC.`);
                document.getElementById("ssccInput").focus();
                // НЕ ОЧИЩАЕМ контейнер здесь, чтобы код остался виден!
            } else {
                registerPallet(code, null);
                e.target.value = ""; // Очищаем только если сразу зарегистрировали
            }
        } else {
            setStatus("Товар не найден!", "#c53929");
            e.target.value = ""; // Очищаем, если товара нет
        }
    }
});

document.getElementById("ssccInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && STATE.waitSSCC) {
        registerPallet(STATE.currentContainer, e.target.value.trim());
        STATE.waitSSCC = false;
        toggleSSCCField(false);
        e.target.value = "";
        document.getElementById("containerInput").focus();
    }
});

function registerPallet(container, sscc) {
    PALLETS.set(container, { container, sscc });
    document.getElementById("palletCount").innerText = PALLETS.size;
    setStatus(`Паллета ${container} сохранена`);
    
    // Теперь очищаем поле контейнера после регистрации
    document.getElementById("containerInput").value = "";
    document.getElementById("containerInput").focus();
}

async function loadGoods() {
    const resp = await fetch(APP.goodsFile);
    const text = await resp.text();
    text.split("\n").forEach(row => {
        const [id, name, askSSCC] = row.split(";");
        if(id) GOODS.set(id.trim(), { name, askSSCC: askSSCC ? askSSCC.trim() : "0" });
    });
}
loadGoods();

async function init() {
    await loadGoods();
    updateCounters();
    await loadMasks();
    // Принудительно скрываем поле при старте
    document.getElementById("ssccFieldWrapper").classList.add("hidden");
    
    document.getElementById("containerInput").focus();
}

// Добавляем переменную для масок
let MASKS = null;

// Загрузка файла масок
async function loadMasks() {
    try {
        const resp = await fetch("masks.json");
        MASKS = await resp.json();
    } catch (e) {
        console.error("Не удалось загрузить masks.json", e);
    }
}

// Функция проверки по маске
function validateInput(value, type) {
    if (!MASKS || !MASKS[type] || !MASKS[type].masks) return true;

    // Проверяем, подходит ли значение хоть под одну маску из массива
    const isMatch = MASKS[type].masks.some(item => {
        const regex = new RegExp(item.regex);
        return regex.test(value);
    });

    return isMatch;
}


function getParsedData(value) {
    // Проходим по маскам контейнера и возвращаем результат первой подошедшей
    for (let item of MASKS.container.masks) {
        const match = value.match(new RegExp(item.regex));
        if (match) {
            // Если это формат 11100234 (с группами захвата)
            if (match.length > 3) {
                return { goodId: match[1], quantity: parseInt(match[3], 10) };
            }
            return { raw: value };
        }
    }
    return null;
}
// Пример использования в слушателе контейнера
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const code = e.target.value.trim();

        // Проверка по маске из JSON
        if (!validateInput(code, "container")) {
            setStatus(MASKS.container.errorMessage, "#c53929");
            return; // Прерываем выполнение, если формат неверный
        }

        const good = GOODS.get(code);
        // ... (твоя логика дальше)
    }
});
