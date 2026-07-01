const APP = { version: "0.1", goodsFile: "goods.csv", debug: true };
const STATE = { waitSSCC: false, currentContainer: null, currentGood: null };
const GOODS = new Map();
const PALLETS = new Map();

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    e.innerText = text;
    e.style.color = color;
}

function updateCounters() {
    document.getElementById("palletCount").innerText = PALLETS.size;
    document.getElementById("summaryCount").innerText = PALLETS.size;
}

document.querySelectorAll(".tabButton").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll(".tabButton").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(button.dataset.tab).classList.add("active");
    };
});

async function loadGoods() {
    try {
        const response = await fetch(APP.goodsFile);
        if (!response.ok) throw new Error("goods.csv не найден");
        const text = await response.text();
        parseGoodsCSV(text);
        document.getElementById("goodsStatus").innerText = "goods.csv загружен";
        document.getElementById("settingsGoods").innerText = GOODS.size + " товаров";
    } catch(ex) {
        console.error(ex);
        document.getElementById("goodsStatus").innerText = "Ошибка загрузки";
        setStatus("Ошибка загрузки goods.csv", "#c53929");
    }
}

function parseGoodsCSV(csv) {
    GOODS.clear();
    const rows = csv.replace(/\r/g,"").split("\n");
    for(let i=1; i<rows.length; i++) {
        const row = rows[i].trim();
        if(row === "") continue;
        const c = row.split(";");
        if(c.length < 3) continue;
        GOODS.set(c[0], { id: c[0], name: c[1], askSSCC: c[2] });
    }
}

async function init() {
    await loadGoods();
    updateCounters();
    document.getElementById("containerInput").focus();
}

init();
