const APP = { goodsFile: "goods.csv", masksFile: "masks.json" };
const STATE = { waitSSCC: false, currentContainer: null };
const GOODS = new Map();
const PALLETS = new Map();
let MASKS = null;

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

// Восстановленная функция парсинга (используем логику из app(3).js)
function parseBarcode(code) {
    // Если есть специфическая логика выделения ID, она здесь
    // Например: return code.length > 10 ? { ItemID: code.substring(0, 5) } : { ItemID: code };
    return { ItemID: code }; 
}

function validateInput(code, type) {
    if (!MASKS || !MASKS[type]) return true;
    const regex = new RegExp(MASKS[type].pattern);
    return regex.test(code);
}

function toggleSSCCField(show) {
    const el = document.getElementById("ssccFieldWrapper");
    if (el) el.classList.toggle("hidden", !show);
}

function updateSummaryTable() {
    const summary = {};
    const uniqueSSCC = new Set();
    let totalSSCC = 0;

    PALLETS.forEach(p => {
        if (!summary[p.goodId]) summary[p.goodId] = { name: p.goodName, count: 0, totalQty: 0 };
        summary[p.goodId].count++;
        summary[p.goodId].totalQty += p.qty;
        if (p.ssccCode) {
            totalSSCC++;
            uniqueSSCC.add(p.ssccCode);
        }
    });

    document.getElementById("summaryCount").innerText = PALLETS.size;
    document.getElementById("summarySSCC").innerText = `${uniqueSSCC.size}/${totalSSCC}`;

    const tbody = document.getElementById("summaryTable");
    tbody.innerHTML = PALLETS.size === 0 ? '<tr><td colspan="3">Нет данных</td></tr>' : "";
    
    for (let id in summary) {
        tbody.innerHTML += `<tr><td>${summary[id].name}</td><td>${summary[id].count}</td><td>${summary[id].totalQty} штук</td></tr>`;
    }
}

function registerPallet(containerCode, ssccCode) {
    const data = parseBarcode(containerCode);
    const good = GOODS.get(data.ItemID);
    if (good) {
        PALLETS.set(containerCode + Date.now(), { goodId: data.ItemID, goodName: good.name, qty: good.qty, ssccCode: ssccCode });
        updateSummaryTable();
        setStatus(`Добавлено: ${good.name}`);
        document.getElementById("containerInput").value = "";
        document.getElementById("ssccInput").value = "";
        document.getElementById("foundedContainer").innerText = "";
    }
}

// Загрузка данных
async function loadData() {
    try {
        // Загрузка GOODS.csv
        const resGoods = await fetch(APP.goodsFile);
        const text = await resGoods.text();
        text.split('\n').forEach(line => {
            const [id, name, qty, askSSCC] = line.split(';');
            if (id) GOODS.set(id.trim(), { name, qty: parseInt(qty), askSSCC: askSSCC?.trim() });
        });

        // Загрузка MASKS.json
        const resMasks = await fetch(APP.masksFile);
        MASKS = await resMasks.json();
        
        setStatus("Данные загружены. Сканируйте контейнер.");
    } catch (err) {
        setStatus("Ошибка загрузки данных!", "#c53929");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadData();
    document.getElementById("jobNameInput").focus();

    document.getElementById("containerInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const val = e.target.value.trim();
            const data = parseBarcode(val);
            const good = GOODS.get(data.ItemID);

            if (good) {
                document.getElementById("foundedContainer").style.color = "#f1c40f";
                document.getElementById("foundedContainer").innerText = `Товар: ${good.name} | Кол-во: ${good.qty}`;
                
                if (good.askSSCC === "1") {
                    STATE.currentContainer = val;
                    STATE.waitSSCC = true;
                    toggleSSCCField(true);
                    document.getElementById("ssccInput").focus();
                } else {
                    registerPallet(val, null);
                }
            } else {
                setStatus(`Товар с ID '${data.ItemID}' не найден!`, "#c53929");
            }
        }
    });

    document.getElementById("ssccInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter" && STATE.waitSSCC) {
            const ssccCode = e.target.value.trim();
            if (validateInput(ssccCode, "sscc")) {
                registerPallet(STATE.currentContainer, ssccCode);
                STATE.waitSSCC = false;
                toggleSSCCField(false);
            } else {
                setStatus(MASKS?.sscc?.errorMessage || "Ошибка SSCC!", "#c53929");
            }
        }
    });
});
