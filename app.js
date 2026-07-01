const APP = { version: "0.1", goodsFile: "goods.csv", masksFile: "masks.json" };
const STATE = { waitSSCC: false, currentContainer: null, currentGood: null };
const GOODS = new Map();
const PALLETS = new Map();
let MASKS = null;

// Статус системы
function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    e.innerText = text;
    e.style.color = color;
}

// Загрузка масок
async function loadMasks() {
    try {
        const resp = await fetch(APP.masksFile);
        MASKS = await resp.json();
    } catch (e) {
        console.error("Не удалось загрузить masks.json", e);
    }
}

// Проверка ввода по маске
function validateInput(value, type) {
    if (!MASKS || !MASKS[type] || !MASKS[type].masks) return true;
    return MASKS[type].masks.some(item => {
        const regex = new RegExp(item.regex);
        return regex.test(value);
    });
}

// Управление отображением поля SSCC
function toggleSSCCField(show) {
    const el = document.getElementById("ssccFieldWrapper");
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
}

// Регистрация паллеты
function registerPallet(containerCode, ssccCode) {
    PALLETS.set(containerCode, { containerCode, ssccCode, time: new Date().toLocaleTimeString() });
    document.getElementById("palletCount").innerText = PALLETS.size;
    setStatus(`Паллета ${containerCode} успешно зарегистрирована`);
    
    // Сброс полей
    document.getElementById("containerInput").value = "";
    document.getElementById("ssccInput").value = "";
    document.getElementById("containerInput").focus();
}

// Обработчик контейнера
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const code = e.target.value.trim();

        // 1. Проверка маски
        if (!validateInput(code, "container")) {
            setStatus(MASKS.container.errorMessage, "#c53929");
            return;
        }

        const good = GOODS.get(code.substring(0, 3)); // Парсинг ID товара (первые 3 цифры)

        if (good) {
            STATE.currentContainer = code;
            STATE.currentGood = good;

            if (good.askSSCC === "1") {
                STATE.waitSSCC = true;
                toggleSSCCField(true);
                setStatus(`Товар: ${good.name}. Введите SSCC.`);
                document.getElementById("ssccInput").focus();
            } else {
                registerPallet(code, null);
            }
        } else {
            setStatus("Товар не найден!", "#c53929");
            e.target.value = "";
        }
    }
});

// Обработчик SSCC
document.getElementById("ssccInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && STATE.waitSSCC) {
        const ssccCode = e.target.value.trim();

        // 1. Проверка маски SSCC
        if (!validateInput(ssccCode, "sscc")) {
            setStatus(MASKS.sscc.errorMessage, "#c53929");
            return;
        }

        registerPallet(STATE.currentContainer, ssccCode);
        STATE.waitSSCC = false;
        toggleSSCCField(false);
    }
});

// Инициализация
async function init() {
    await loadGoods();
    await loadMasks(); // Загружаем маски
    document.getElementById("containerInput").focus();
}

// (Функция parseGoodsCSV и остальные остаются без изменений)

init();
