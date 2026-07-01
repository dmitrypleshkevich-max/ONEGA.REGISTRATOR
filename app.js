const APP = { goodsFile: "goods.csv", masksFile: "masks.json" };
const STATE = { waitSSCC: false, currentContainer: null };
const GOODS = new Map();
const PALLETS = new Map();
let MASKS = null;

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

function parseBarcode(code) {
    // Ваша логика парсинга штрих-кода (например, выделение ItemID)
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

function registerPallet(containerCode, ssccCode) {
    const data = parseBarcode(containerCode);
    const goodId = data.ItemID;
    const good = GOODS.get(goodId);

    if (good) {
        PALLETS.set(containerCode + Date.now(), { 
            goodId: goodId, 
            goodName: good.name, 
            qty: good.qty, 
            ssccCode: ssccCode 
        });
        updateSummaryTable();
        setStatus(`Зарегистрировано: ${good.name}`);
        document.getElementById("containerInput").value = "";
        document.getElementById("ssccInput").value = "";
        document.getElementById("foundedContainer").innerText = "";
    }
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

// Привязка событий после полной загрузки HTML
document.addEventListener("DOMContentLoaded", () => {
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
                setStatus("Товар не найден!", "#c53929");
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
                setStatus("Ошибка формата SSCC!", "#c53929");
            }
        }
    });
});

async function init() {
    // Здесь ваша логика загрузки GOODS и MASKS
    document.getElementById("goodsStatus").innerText = "Готов к работе";
}

init();
