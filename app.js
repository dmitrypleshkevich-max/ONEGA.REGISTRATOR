const GOODS = new Map();
const STATE = {
    jobActive: false,
    scannedContainers: new Set(),
    scannedSSCC: new Set(),
    totalSSCCCount: 0
};

// --- Инициализация ---
async function init() {
    await loadGoods();
    toggleSSCCField(false);
}

// Загрузка товаров с учетом UTF-8 и разделителя ;
async function loadGoods() {
    try {
        const response = await fetch("goods.csv");
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        const result = await reader.read();
        const text = decoder.decode(result.value);
        
        const rows = text.replace(/\r/g, "").split("\n");
        for (let i = 1; i < rows.length; i++) {
            const [id, name, askSSCC] = rows[i].split(";");
            if (id) GOODS.set(id.trim(), { name: name.trim(), askSSCC: parseInt(askSSCC) });
        }
        document.getElementById("goodsStatus").innerText = "Справочник загружен";
    } catch (e) {
        document.getElementById("goodsStatus").innerText = "Ошибка загрузки goods.csv";
    }
}

// --- Управление заданием ---
function startJob() {
    STATE.jobActive = true;
    STATE.scannedContainers.clear();
    STATE.scannedSSCC.clear();
    STATE.totalSSCCCount = 0;
    updateSummaryUI();
    
    // Переход на вкладку сканирования
    document.querySelector('[data-tab="scanTab"]').click();
    setStatus("Задание начато. Сканируйте контейнер.");
}

// Пустышка для разбора кода
function parseContainerCode(code) {
    alert("Разбор кода: " + code);
    return code; 
}

// --- Обработка ввода ---
document.getElementById("containerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && STATE.jobActive) {
        const code = e.target.value.trim();
        
        if (STATE.scannedContainers.has(code)) {
            setStatus(`ВНИМАНИЕ: Контейнер ${code} уже добавлен!`, "#c53929");
            e.target.value = "";
            return;
        }

        const goodId = parseContainerCode(code);
        const good = GOODS.get(goodId);

        if (good) {
            document.getElementById("foundedContainer").innerText = good.name;
            if (good.askSSCC > 0) {
                toggleSSCCField(true);
                document.getElementById("ssccInput").focus();
            } else {
                addContainer(code, null);
            }
        } else {
            setStatus("Товар не найден в справочнике", "#c53929");
        }
    }
});

document.getElementById("ssccInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const sscc = e.target.value.trim();
        
        if (STATE.scannedSSCC.has(sscc)) {
            setStatus(`ПРЕДУПРЕЖДЕНИЕ: SSCC ${sscc} уже сканировался ранее`, "#e67e22");
        }
        
        addContainer(document.getElementById("containerInput").value, sscc);
        toggleSSCCField(false);
        document.getElementById("ssccInput").value = "";
        document.getElementById("containerInput").focus();
    }
});

function addContainer(container, sscc) {
    STATE.scannedContainers.add(container);
    if (sscc) {
        STATE.totalSSCCCount++;
        STATE.scannedSSCC.add(sscc);
    }
    updateSummaryUI();
    setStatus(`Контейнер ${container} успешно добавлен`);
    document.getElementById("containerInput").value = "";
}

function updateSummaryUI() {
    document.getElementById("palletCount").innerText = STATE.scannedContainers.size;
    document.getElementById("summaryCount").innerText = STATE.scannedContainers.size;
    document.getElementById("summarySSCC").innerText = `${STATE.totalSSCCCount} (уникальных: ${STATE.scannedSSCC.size})`;
}

function toggleSSCCField(show) {
    const el = document.getElementById("ssccFieldWrapper");
    show ? el.classList.remove("hidden") : el.classList.add("hidden");
}

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) {
        e.innerText = text; 
        e.style.color = color;
    }
}

init();
