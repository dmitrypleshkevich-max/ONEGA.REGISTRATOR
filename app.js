const GOODS = new Map();
const PALLETS = new Map();

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
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

document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const val = e.target.value.trim();
        const good = GOODS.get(val); // Упрощено: ID товара = код
        if (good) {
            document.getElementById("foundedContainer").style.color = "#f1c40f";
            document.getElementById("foundedContainer").innerText = `Товар: ${good.name} | Кол-во: ${good.qty}`;
            
            if (good.askSSCC === "1") {
                document.getElementById("ssccFieldWrapper").classList.remove("hidden");
                document.getElementById("ssccInput").focus();
            } else {
                PALLETS.set(val + Date.now(), { goodId: val, goodName: good.name, qty: good.qty });
                updateSummaryTable();
                e.target.value = "";
            }
        }
    }
});

async function init() {
    // Здесь должна быть ваша логика загрузки CSV
    document.getElementById("goodsStatus").innerText = "Готов к работе";
    document.getElementById("jobNameInput").focus();
}

init();
