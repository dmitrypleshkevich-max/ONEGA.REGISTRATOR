const APP = { goodsFile: "goods.csv", masksFile: "masks.json" };
const STATE = { waitSSCC: false, currentContainer: null };
const GOODS = new Map();
const PALLETS = new Map();
let MASKS = null; // Переменная для хранения масок

// --- Утилиты ---
function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    e.innerText = text; e.style.color = color;
}

function toggleSSCCField(show) {
    const el = document.getElementById("ssccFieldWrapper");
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
}

// --- Загрузка данных ---
async function loadMasks() {
    try {
        const resp = await fetch(APP.masksFile);
        MASKS = await resp.json();
    } catch (e) { console.error("Не удалось загрузить masks.json", e); }
}

// --- Логика проверки масок ---
function validateInput(value, type) {
    if (!MASKS || !MASKS[type] || !MASKS[type].masks) return true;
    return MASKS[type].masks.some(item => new RegExp(item.regex).test(value));
}

// --- Обработка ввода контейнера ---
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const code = e.target.value.trim();

        // Проверка по маске
        if (!validateInput(code, "container")) {
            setStatus(MASKS.container.errorMessage, "#c53929");
            return;
        }

        const good = GOODS.get(code); // Ищем товар как есть

        if (good) {
            STATE.currentContainer = code;
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

// --- Обработка ввода SSCC ---
document.getElementById("ssccInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && STATE.waitSSCC) {
        const ssccCode = e.target.value.trim();

        // Проверка по маске
        if (!validateInput(ssccCode, "sscc")) {
            setStatus(MASKS.sscc.errorMessage, "#c53929");
            return;
        }

        registerPallet(STATE.currentContainer, ssccCode);
        STATE.waitSSCC = false;
        toggleSSCCField(false);
    }
});

function registerPallet(containerCode, ssccCode) {
    PALLETS.set(containerCode, { containerCode, ssccCode, time: new Date().toLocaleTimeString() });
    document.getElementById("palletCount").innerText = PALLETS.size;
    setStatus(`Паллета ${containerCode} успешно зарегистрирована`);
    document.getElementById("containerInput").value = "";
    document.getElementById("ssccInput").value = "";
    document.getElementById("containerInput").focus();
}

// --- Инициализация ---
async function init() {
    await loadGoods();
    await loadMasks(); 
    document.getElementById("containerInput").focus();
}

init();
