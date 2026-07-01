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

function findGood(code) {
    return GOODS.get(code) || null;
}

// Слушатель для поля ввода контейнера
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const code = e.target.value.trim();
        const good = findGood(code);

        if (good) {
            STATE.currentContainer = code;
            STATE.currentGood = good;
            
            if (good.askSSCC === "1") {
                STATE.waitSSCC = true;
                setStatus(`Товар: ${good.name}. Введите SSCC.`);
                document.getElementById("ssccInput").focus();
            } else {
                registerPallet(code, null);
            }
        } else {
            setStatus("Товар не найден!", "#c53929");
        }
        e.target.value = "";
    }
});

function registerPallet(containerCode, ssccCode) {
    PALLETS.set(containerCode, { containerCode, ssccCode, time: new Date() });
    updateCounters();
    setStatus(`Паллета ${containerCode} зарегистрирована!`);
    document.getElementById("containerInput").focus();
}
// Функция для переключения видимости поля SSCC
function toggleSSCCField(show) {
    const ssccContainer = document.getElementById("ssccInput").parentElement.parentElement;
    if (show) {
        ssccContainer.classList.remove("hidden");
        document.getElementById("ssccInput").focus();
    } else {
        ssccContainer.classList.add("hidden");
    }
}

// Инициализация: скроем поле при загрузке
document.addEventListener("DOMContentLoaded", () => {
    toggleSSCCField(false);
});

// Слушатель для контейнера
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const code = e.target.value.trim();
        const good = GOODS.get(code); // Ищем товар в Map

        if (good) {
            STATE.currentContainer = code;
            STATE.currentGood = good;

            if (good.askSSCC === "1") {
                STATE.waitSSCC = true;
                toggleSSCCField(true); // Показываем поле
                setStatus(`Товар: ${good.name}. Введите SSCC.`);
            } else {
                registerPallet(code, null);
            }
        } else {
            setStatus("Товар не найден!", "#c53929");
        }
        e.target.value = "";
    }
});

// Слушатель для SSCC
document.getElementById("ssccInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && STATE.waitSSCC) {
        const ssccCode = e.target.value.trim();
        registerPallet(STATE.currentContainer, ssccCode);
        
        // Сбрасываем состояние
        STATE.waitSSCC = false;
        toggleSSCCField(false); // Скрываем поле обратно
        e.target.value = "";
    }
});

function registerPallet(containerCode, ssccCode) {
    PALLETS.set(containerCode, { containerCode, ssccCode, time: new Date() });
    updateCounters();
    setStatus(`Паллета ${containerCode} зарегистрирована!`);
    document.getElementById("containerInput").focus();
}
init();
