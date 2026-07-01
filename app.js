const APP = { goodsFile: "goods.csv", masksFile: "masks.json" };
const STATE = { waitSSCC: false, currentContainer: null, currentGood: null };
const GOODS = new Map();
const PALLETS = new Map();
let MASKS = null;

// --- Инициализация ---
document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {
    await loadGoods();
    await loadMasks();
}

// --- Загрузка данных ---
async function loadGoods() {
    try {
        const response = await fetch(APP.goodsFile);
        if (!response.ok) throw new Error("Файл goods.csv не найден");
        const text = await response.text();
        parseGoodsCSV(text);
        document.getElementById("goodsStatus").innerText = "goods.csv загружен";
        document.getElementById("settingsGoods").innerText = GOODS.size + " товаров";
    } catch (ex) {
        console.error(ex);
        document.getElementById("goodsStatus").innerText = "Ошибка загрузки goods.csv";
        setStatus("Ошибка загрузки справочника товаров", "#c53929");
    }
}

function parseGoodsCSV(csv) {
    GOODS.clear();
    const rows = csv.replace(/\r/g, "").split("\n");
    // Пропускаем заголовок (i=1)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (row === "") continue;
        
        // Разделяем по точке с запятой
        const [id, name, askSSCC] = row.split(";");
        if (id && name) {
            GOODS.set(id.trim(), { name: name.trim(), askSSCC: askSSCC.trim() });
        }
    }
}

async function loadMasks() {
    try {
        const resp = await fetch(APP.masksFile);
        if (resp.ok) MASKS = await resp.json();
    } catch (e) { console.warn("Файл masks.json не найден, валидация по маскам отключена"); }
}

// --- Утилиты ---
function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) {
        e.innerText = text;
        e.style.color = color;
    }
}

function toggleSSCCField(show) {
    const el = document.getElementById("ssccFieldWrapper");
    if (el) show ? el.classList.remove("hidden") : el.classList.add("hidden");
}

// --- Обработка событий ---
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const code = e.target.value.trim();
        const good = GOODS.get(code);

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
                e.target.value = "";
            }
        } else {
            setStatus("Товар не найден!", "#c53929");
            e.target.value = "";
        }
    }
});

document.getElementById("ssccInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && STATE.waitSSCC) {
        const ssccCode = e.target.value.trim();
        registerPallet(STATE.currentContainer, ssccCode);
        
        STATE.waitSSCC = false;
        toggleSSCCField(false);
        document.getElementById("ssccInput").value = "";
        document.getElementById("containerInput").value = "";
        document.getElementById("containerInput").focus();
    }
});

function registerPallet(containerCode, ssccCode) {
    PALLETS.set(containerCode, { containerCode, ssccCode, time: new Date().toLocaleTimeString() });
    document.getElementById("palletCount").innerText = PALLETS.size;
    setStatus(`Паллета ${containerCode} успешно зарегистрирована`);
}
