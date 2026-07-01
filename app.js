const APP = { 
    goodsFile: "goods.csv", 
    masksFile: "masks.json",
    structureFile: "packing.json" // Ваш файл структуры
};
const STATE = { waitSSCC: false, currentContainer: null };
const GOODS = new Map();
const PALLETS = new Map();
let MASKS = null;
let PACK_STRUCTURE = null;

// --- Утилиты ---
function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

function toggleSSCCField(show) {
    const el = document.getElementById("ssccFieldWrapper");
    if (el) el.classList.toggle("hidden", !show);
}

// --- Загрузка данных ---
async function loadGoods() {
    try {
        const resp = await fetch(APP.goodsFile);
        const text = await resp.text();
        const lines = text.split("\n").slice(1); // Пропускаем заголовок
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
        result[f.name] = code.substring(f.start, f.end + 1);
    });
    return result;
}

// --- Основная логика регистрации ---
function registerPallet(containerCode, ssccCode) {
    const data = parseBarcode(containerCode);
    const goodId = data ? data.ItemID : containerCode; // Если структура не найдена, используем код как ID
    const good = GOODS.get(goodId);
    const qty = data && data.Qty ? parseInt(data.Qty, 10) : 0;

    PALLETS.set(containerCode, { 
        containerCode, 
        ssccCode, 
        goodId: goodId,
        goodName: good ? good.name : "Неизвестно",
        qty: qty,
        time: new Date().toLocaleTimeString() 
    });

    document.getElementById("palletCount").innerText = PALLETS.size;
    updateSummaryTable();
    setStatus(`Зарегистрировано: ${good ? good.name : goodId} (${qty} шт)`);
    
    // Сброс полей
    document.getElementById("containerInput").value = "";
    document.getElementById("ssccInput").value = "";
    document.getElementById("containerInput").focus();
}

function updateSummaryTable() {
    const summary = {};
    PALLETS.forEach(p => {
        if (!summary[p.goodId]) {
            summary[p.goodId] = { name: p.goodName, count: 0, totalQty: 0 };
        }
        summary[p.goodId].count++;
        summary[p.goodId].totalQty += p.qty;
    });

    const tbody = document.getElementById("summaryTable");
    tbody.innerHTML = Object.keys(summary).length === 0 ? '<tr><td colspan="3">Нет данных</td></tr>' : "";
    
    for (let id in summary) {
        tbody.innerHTML += `<tr>
            <td>${summary[id].name}</td>
            <td>${summary[id].count}</td>
            <td>${summary[id].totalQty}</td>
        </tr>`;
    }
}

// --- Обработчики событий ---
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const fullCode = e.target.value.trim();
        const data = parseBarcode(fullCode);
        
        // ВАЖНО: добавим вывод в консоль
        console.log("Полный код:", fullCode);
        console.log("Распарсенные данные:", data);
        
        const goodId = data && data.ItemID ? data.ItemID.trim() : fullCode;
        console.log("Искомый GoodID:", "'" + goodId + "'");
        console.log("Что есть в GOODS:", Array.from(GOODS.keys()));

        const good = GOODS.get(goodId);

        if (good) {
            // ... остальная логика
        } else {
            setStatus(`Товар с ID '${goodId}' не найден!`, "#c53929");
        }
    }
});

// --- Инициализация ---
async function init() {
    await loadGoods();
    await loadMasks();
    await loadStructure();
    document.getElementById("containerInput").focus();
}

init();
