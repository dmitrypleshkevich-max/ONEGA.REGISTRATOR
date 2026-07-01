const APP = { goodsFile: "goods.csv", structureFile: "packing.json" };
const STATE = { waitSSCC: false, currentContainer: null };
const GOODS = new Map(); // ID -> {name, qty, askSSCC}
const PALLETS = new Map(); // ContainerCode -> {goodId, goodName, qty, ssccCode}
let PACK_STRUCTURE = null; // Правила парсинга

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

// Парсинг контейнера по правилам из JSON
function parseBarcode(fullCode) {
    if (!PACK_STRUCTURE) return { ItemID: fullCode, Qty: 0 };

    for (const key in PACK_STRUCTURE) {
        const rule = PACK_STRUCTURE[key];
        if (rule.prefix && fullCode.startsWith(rule.prefix)) {
            const id = fullCode.substring(rule.prefix.length, rule.prefix.length + rule.length);
            return { ItemID: id, Qty: rule.qty || 0 };
        }
    }
    return { ItemID: fullCode, Qty: 0 };
}

// Обновление сводной таблицы
function updateSummaryTable() {
    const summary = {}; // name -> {pallets: 0, totalQty: 0}
    let totalSSCCCount = 0;
    const uniqueSSCC = new Set();

    PALLETS.forEach(p => {
        if (!summary[p.goodName]) summary[p.goodName] = { pallets: 0, totalQty: 0 };
        summary[p.goodName].pallets++;
        summary[p.goodName].totalQty += p.qty;
        
        if (p.ssccCode) {
            totalSSCCCount++;
            uniqueSSCC.add(p.ssccCode);
        }
    });

    const tbody = document.getElementById("summaryTable");
    tbody.innerHTML = PALLETS.size === 0 ? '<tr><td colspan="3">Нет данных</td></tr>' : "";
    
    for (const name in summary) {
        tbody.innerHTML += `<tr><td>${name}</td><td>${summary[name].pallets}</td><td>${summary[name].totalQty}</td></tr>`;
    }

    document.getElementById("summaryCount").innerText = PALLETS.size;
    document.getElementById("summarySSCC").innerText = `Всего: ${totalSSCCCount} | Уник: ${uniqueSSCC.size}`;
}

function registerPallet(containerCode, ssccCode, goodId, goodName, qty) {
    PALLETS.set(containerCode, { goodId, goodName, qty, ssccCode });
    updateSummaryTable();
    document.getElementById("palletCount").innerText = PALLETS.size;
    
    setStatus(`Зарегистрировано: ${goodName}`);
    document.getElementById("containerInput").value = "";
    document.getElementById("ssccInput").value = "";
    document.getElementById("foundedContainer").innerText = "";
    document.getElementById("containerInput").focus();
}

// Загрузка данных
async function loadData() {
    try {
        const resGoods = await fetch(APP.goodsFile);
        const text = await resGoods.text();
        text.split('\n').forEach(line => {
            const [id, name, qty, askSSCC] = line.split(';');
            if (id) GOODS.set(id.trim(), { name: name.trim(), qty: parseInt(qty), askSSCC: askSSCC?.trim() });
        });

        const resPack = await fetch(APP.structureFile);
        PACK_STRUCTURE = await resPack.json();
        
        document.getElementById("goodsStatus").innerText = "Данные загружены";
    } catch (err) {
        document.getElementById("goodsStatus").innerText = "Ошибка загрузки!";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadData();

    document.getElementById("containerInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const fullCode = e.target.value.trim();
            
            // Проверка на уникальность контейнера
            if (PALLETS.has(fullCode)) {
                setStatus(`Ошибка: Контейнер ${fullCode} уже отсканирован!`, "#c53929");
                e.target.value = "";
                return;
            }

            const data = parseBarcode(fullCode);
            const good = GOODS.get(data.ItemID);

            if (good) {
                document.getElementById("foundedContainer").innerText = `Товар: ${good.name} | Кол-во: ${data.Qty || good.qty}`;
                
                if (good.askSSCC === "1") {
                    STATE.currentContainer = fullCode;
                    STATE.waitSSCC = true;
                    document.getElementById("ssccFieldWrapper").classList.remove("hidden");
                    document.getElementById("ssccInput").focus();
                } else {
                    registerPallet(fullCode, null, data.ItemID, good.name, data.Qty || good.qty);
                }
            } else {
                setStatus(`Товар ID ${data.ItemID} не найден!`, "#c53929");
            }
        }
    });

    document.getElementById("ssccInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter" && STATE.waitSSCC) {
            const ssccCode = e.target.value.trim();
            const good = GOODS.get(parseBarcode(STATE.currentContainer).ItemID);
            registerPallet(STATE.currentContainer, ssccCode, good.id, good.name, good.qty);
            STATE.waitSSCC = false;
            document.getElementById("ssccFieldWrapper").classList.add("hidden");
        }
    });
});
