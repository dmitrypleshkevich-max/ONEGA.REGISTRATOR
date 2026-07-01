const APP = { goodsFile: "goods.csv", structureFile: "packing.json" };
const GOODS = new Map();
const PALLETS = new Map(); // Key: ContainerCode (full), Value: { itemId, qty, sscc }
let PACK_STRUCTURE = null;

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

function parseBarcode(fullCode) {
    if (!PACK_STRUCTURE || !PACK_STRUCTURE.fields) {
        return { ItemID: fullCode, Qty: 0 };
    }

    let parsed = { ItemID: "", Qty: 0 };

    PACK_STRUCTURE.fields.forEach(field => {
        // Добавляем +1 к end, так как в вашем JSON end включительный
        // slice(start, end + 1) корректно возьмет символы от start до end включительно
        const value = fullCode.slice(field.start, field.end + 1).trim();
        
        if (field.name === "ItemID") parsed.ItemID = value;
        if (field.name === "Qty") parsed.Qty = parseInt(value) || 0;
    });

    return parsed;
}

// Загрузка
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
    } catch (err) { console.error(err); }
}

document.addEventListener("DOMContentLoaded", () => {
    loadData();

    document.getElementById("containerInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const fullCode = e.target.value.trim();
            
            // 1. Проверка уникальности всей строки сканирования
            if (PALLETS.has(fullCode)) {
                setStatus(`Ошибка: Контейнер ${fullCode} уже добавлен!`, "#c53929");
                return;
            }

            // 2. Парсинг по индексам
            const parsed = parseBarcode(fullCode);
            const good = GOODS.get(parsed.ItemID);

            if (good) {
                if (good.askSSCC === "1") {
                    document.getElementById("ssccFieldWrapper").classList.remove("hidden");
                    document.getElementById("ssccInput").dataset.container = fullCode;
                    document.getElementById("ssccInput").dataset.itemId = parsed.ItemID;
                    document.getElementById("ssccInput").dataset.qty = parsed.Qty || good.qty;
                    document.getElementById("ssccInput").focus();
                } else {
                    savePallet(fullCode, parsed.ItemID, good.name, parsed.Qty || good.qty, null);
                }
            } else {
                setStatus(`Товар ID ${parsed.ItemID} не найден!`, "#c53929");
            }
        }
    });

    document.getElementById("ssccInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const containerCode = e.target.dataset.container;
            savePallet(containerCode, e.target.dataset.itemId, GOODS.get(e.target.dataset.itemId).name, e.target.dataset.qty, e.target.value.trim());
            document.getElementById("ssccFieldWrapper").classList.add("hidden");
        }
    });
});

function savePallet(containerCode, itemId, name, qty, sscc) {
    PALLETS.set(containerCode, { itemId, goodName: name, qty: parseInt(qty), ssccCode: sscc });
    updateSummaryTable();
    setStatus(`Добавлено: ${name}`);
    document.getElementById("containerInput").value = "";
    document.getElementById("ssccInput").value = "";
    document.getElementById("containerInput").focus();
}

function updateSummaryTable() {
    const summary = {}; 
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
    tbody.innerHTML = "";
    for (const name in summary) {
        tbody.innerHTML += `<tr><td>${name}</td><td>${summary[name].pallets}</td><td>${summary[name].totalQty}</td></tr>`;
    }
    document.getElementById("summaryCount").innerText = PALLETS.size;
    document.getElementById("summarySSCC").innerText = `Всего: ${totalSSCCCount} | Уник: ${uniqueSSCC.size}`;
}
