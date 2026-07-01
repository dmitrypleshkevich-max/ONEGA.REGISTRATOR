const APP = { goodsFile: "goods.csv", masksFile: "masks.json", structureFile: "packing.json" };
const STATE = { waitSSCC: false, currentContainer: null };
const GOODS = new Map();
const PALLETS = new Map();
let MASKS = null;
let PACK_STRUCTURE = null;

// Делаем функцию доступной глобально для HTML-кнопки
window.startJob = function() {
    STATE.waitSSCC = false;
    PALLETS.clear();
    const countEl = document.getElementById("palletCount");
    if (countEl) countEl.innerText = "0";
    
    const tableEl = document.getElementById("summaryTable");
    if (tableEl) tableEl.innerHTML = '<tr><td colspan="3">Нет данных</td></tr>';
    
    setStatus("Задание начато. Сканируйте контейнер.");
    const input = document.getElementById("containerInput");
    if (input) input.focus();
};

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

function toggleSSCCField(show) {
    const el = document.getElementById("ssccFieldWrapper");
    if (el) el.classList.toggle("hidden", !show);
}

// --- Кнопка "Начать задание" ---
window.startJob = function() {
    STATE.waitSSCC = false;
    PALLETS.clear();
    document.getElementById("palletCount").innerText = "0";
    document.getElementById("summaryTable").innerHTML = '<tr><td colspan="3">Нет данных</td></tr>';
    
    // Переход на нужную вкладку (если есть такая логика)
    setStatus("Задание начато. Сканируйте контейнер.");
    document.getElementById("containerInput").focus();
};

// --- Загрузка данных ---
async function loadGoods() {
    try {
        const resp = await fetch(APP.goodsFile);
        const text = await resp.text();
        const lines = text.split("\n").slice(1);
        lines.forEach(line => {
            const [id, name, askSSCC] = line.split(";");
            if (id) GOODS.set(id.trim(), { name: name.trim(), askSSCC: askSSCC ? askSSCC.trim() : "0" });
        });
        document.getElementById("goodsStatus").innerText = "Справочник загружен";
    } catch (e) { console.error("Ошибка загрузки товаров", e); }
}

async function loadMasks() {
    try {
        const resp = await fetch(APP.masksFile);
        MASKS = await resp.json();
    } catch (e) { console.error("Ошибка загрузки masks.json", e); }
}

async function loadStructure() {
    try {
        const resp = await fetch(APP.structureFile);
        PACK_STRUCTURE = await resp.json();
    } catch (e) { console.error("Ошибка загрузки структуры:", e); }
}

// --- Логика разбора ---
function validateInput(value, type) {
    if (!MASKS || !MASKS[type] || !MASKS[type].masks) return true;
    return MASKS[type].masks.some(item => new RegExp(item.regex).test(value));
}

function parseBarcode(code) {
    if (!PACK_STRUCTURE) return null;
    let result = {};
    PACK_STRUCTURE.fields.forEach(f => {
        result[f.name] = code.substring(f.start, f.end + 1).trim();
    });
    return result;
}

// --- Регистрация ---
function registerPallet(containerCode, ssccCode) {
    const data = parseBarcode(containerCode);
    const goodId = data && data.ItemID ? data.ItemID : containerCode;
    const good = GOODS.get(goodId);
    const qty = data && data.Qty ? parseInt(data.Qty, 10) : 0;

    PALLETS.set(containerCode, { 
        containerCode, ssccCode, goodId,
        goodName: good ? good.name : "Неизвестно",
        qty: qty,
        time: new Date().toLocaleTimeString() 
    });

    document.getElementById("palletCount").innerText = PALLETS.size;
    updateSummaryTable();
    setStatus(`Зарегистрировано: ${good ? good.name : goodId} (${qty} шт)`);
    document.getElementById("containerInput").value = "";
    document.getElementById("ssccInput").value = "";
    document.getElementById("containerInput").focus();
}

function updateSummaryTable() {
    const summary = {};
    PALLETS.forEach(p => {
        if (!summary[p.goodId]) summary[p.goodId] = { name: p.goodName, count: 0, totalQty: 0 };
        summary[p.goodId].count++;
        summary[p.goodId].totalQty += p.qty;
    });

    const tbody = document.getElementById("summaryTable");
    tbody.innerHTML = Object.keys(summary).length === 0 ? '<tr><td colspan="3">Нет данных</td></tr>' : "";
    for (let id in summary) {
        tbody.innerHTML += `<tr><td>${summary[id].name}</td><td>${summary[id].count}</td><td>${summary[id].totalQty}</td></tr>`;
    }
}

// --- Обработчики ---
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const fullCode = e.target.value.trim();
        const data = parseBarcode(fullCode);
        const goodId = data && data.ItemID ? data.ItemID : fullCode;
        const good = GOODS.get(goodId);

        if (good) {
            STATE.currentContainer = fullCode;
            if (good.askSSCC === "1") {
                STATE.waitSSCC = true;
                toggleSSCCField(true);
                setStatus(`Товар: ${good.name}. Введите SSCC.`);
                document.getElementById("ssccInput").focus();
            } else {
                registerPallet(fullCode, null);
            }
        } else {
            setStatus(`Товар с ID '${goodId}' не найден!`, "#c53929");
            e.target.value = "";
        }
    }
});

document.getElementById("ssccInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && STATE.waitSSCC) {
        const ssccCode = e.target.value.trim();
        if (MASKS && MASKS.sscc && !validateInput(ssccCode, "sscc")) {
            setStatus(MASKS.sscc.errorMessage, "#c53929");
            return;
        }
        registerPallet(STATE.currentContainer, ssccCode);
        STATE.waitSSCC = false;
        toggleSSCCField(false);
    }
});

async function init() {
    console.log("Инициализация приложения...");
    await loadGoods();
    await loadMasks();
    await loadStructure();
    const input = document.getElementById("containerInput");
    if (input) input.focus();
}

init();
