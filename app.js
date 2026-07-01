const APP = { goodsFile: "goods.csv", structureFile: "packing.json" };
const GOODS = new Map(); // ID -> {name, qty, askSSCC}
const PALLETS = new Map(); // ContainerCode -> {goodId, goodName, qty, ssccCode}
let PACK_STRUCTURE = null;

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

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

// Глобальная функция старта
window.startJob = function() {
    PALLETS.clear();
    updateSummaryTable();
    document.getElementById("palletCount").innerText = "0";
    setStatus("Задание начато. Сканируйте контейнер.");
    document.getElementById("containerInput").focus();
    
    // Переход на вкладку сканирования
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById("scanTab").classList.add("active");
};

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
        
        document.getElementById("goodsStatus").innerText = "Готов";
    } catch (err) {
        document.getElementById("goodsStatus").innerText = "Ошибка загрузки!";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadData();

    // Логика контейнера
    document.getElementById("containerInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const fullCode = e.target.value.trim();
            if (PALLETS.has(fullCode)) {
                setStatus(`Ошибка: ${fullCode} уже добавлен!`, "#c53929");
                e.target.value = "";
                return;
            }

            const data = parseBarcode(fullCode);
            const good = GOODS.get(data.ItemID);

            if (good) {
                if (good.askSSCC === "1") {
                    document.getElementById("foundedContainer").innerText = `Товар: ${good.name} | Введите SSCC`;
                    document.getElementById("ssccFieldWrapper").classList.remove("hidden");
                    document.getElementById("ssccInput").dataset.container = fullCode;
                    document.getElementById("ssccInput").focus();
                } else {
                    PALLETS.set(fullCode, { goodId: data.ItemID, goodName: good.name, qty: data.Qty || good.qty, ssccCode: null });
                    finishRegistration();
                }
            } else {
                setStatus(`Товар ${data.ItemID} не найден!`, "#c53929");
            }
        }
    });

    // Логика SSCC
    document.getElementById("ssccInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const containerCode = e.target.dataset.container;
            const ssccCode = e.target.value.trim();
            const { ItemID, Qty } = parseBarcode(containerCode);
            const good = GOODS.get(ItemID);
            
            PALLETS.set(containerCode, { goodId: ItemID, goodName: good.name, qty: Qty || good.qty, ssccCode });
            document.getElementById("ssccFieldWrapper").classList.add("hidden");
            finishRegistration();
        }
    });
});

function finishRegistration() {
    updateSummaryTable();
    document.getElementById("palletCount").innerText = PALLETS.size;
    setStatus("Паллета зарегистрирована");
    document.getElementById("containerInput").value = "";
    document.getElementById("ssccInput").value = "";
    document.getElementById("containerInput").focus();
}
