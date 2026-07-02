const APP = { goodsFile: "goods.csv", structureFile: "packing.json" };
const GOODS = new Map();
const PALLETS = new Map();
let PACK_STRUCTURE = null;

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

// Парсинг штрих-кода
function parseBarcode(fullCode) {
    if (!PACK_STRUCTURE || !PACK_STRUCTURE.fields) return { ItemID: fullCode, Qty: 0 };
    
    let parsed = { ItemID: "", Qty: 0 };
    PACK_STRUCTURE.fields.forEach(f => {
        // Используем end + 1 для "включительных" индексов
        const val = fullCode.slice(f.start, f.end + 1).trim();
        if (f.name === "ItemID") parsed.ItemID = val;
        if (f.name === "Qty") parsed.Qty = parseInt(val) || 0;
    });
    return parsed;
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Инициализация вкладок
    document.querySelectorAll('.tabButton').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tabButton').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
        });
    });

    // Установка начального состояния вкладок
    document.querySelectorAll('.tab').forEach(t => {
        t.style.display = t.classList.contains('active') ? 'block' : 'none';
    });

    loadData();

    // 2. Обработчик сканирования контейнера
    document.getElementById("containerInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const fullCode = e.target.value.trim();
            if (!fullCode) return;

            if (PALLETS.has(fullCode)) {
                setStatus(`Контейнер ${fullCode} уже добавлен!`, "#c53929");
                return;
            }

            const parsed = parseBarcode(fullCode);
            const good = GOODS.get(parsed.ItemID);

            if (good) {
                // Проверка на требование SSCC (строгая проверка строки "1")
                if (String(good.askSSCC) === "1") {
                    const wrapper = document.getElementById("ssccFieldWrapper");
                    wrapper.classList.remove("hidden");
                    
                    const ssccInput = document.getElementById("ssccInput");
                    ssccInput.dataset.container = fullCode;
                    ssccInput.dataset.itemId = parsed.ItemID;
                    ssccInput.dataset.qty = parsed.Qty || good.qty || 0;
                    ssccInput.focus();
                } else {
                    savePallet(fullCode, parsed.ItemID, good.name, parsed.Qty || good.qty || 0, null);
                }
            } else {
                setStatus(`Товар ID "${parsed.ItemID}" не найден в справочнике!`, "#c53929");
            }
        }
    });

    // 3. Обработчик SSCC
    document.getElementById("ssccInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const ssccCode = e.target.value.trim();
            const containerCode = e.target.dataset.container;
            
            savePallet(containerCode, e.target.dataset.itemId, GOODS.get(e.target.dataset.itemId).name, e.target.dataset.qty, ssccCode);
            
            document.getElementById("ssccFieldWrapper").classList.add("hidden");
            e.target.value = "";
        }
    });
});

async function loadData() {
    try {
        const resGoods = await fetch(APP.goodsFile);
        const text = await resGoods.text();
        
        text.split('\n').forEach(line => {
            const [id, name, askSSCC] = line.split(';').map(item => item.trim());
            
            // Пропуск заголовка и пустых строк
            if (!id || id === "GOOD_ID") return;
            
            GOODS.set(id, { 
                name: name, 
                qty: 0, 
                askSSCC: askSSCC || "0" 
            });
        });
        
        const resPack = await fetch(APP.structureFile);
        PACK_STRUCTURE = await resPack.json();
        
        document.getElementById("goodsStatus").innerText = "Справочник загружен";
    } catch (err) { 
        console.error(err); 
        document.getElementById("goodsStatus").innerText = "Ошибка загрузки данных"; 
    }
}

function savePallet(containerCode, itemId, name, qty, sscc) {
    PALLETS.set(containerCode, { itemId, goodName: name, qty: parseInt(qty), ssccCode: sscc });
    updateSummaryTable();
    setStatus(`Зарегистрировано: ${name} (${qty} шт.)`);
    document.getElementById("containerInput").value = "";
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
        if (p.ssccCode) { totalSSCCCount++; uniqueSSCC.add(p.ssccCode); }
    });
    
    const tbody = document.getElementById("summaryTable");
    if (Object.keys(summary).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Нет данных</td></tr>';
    } else {
        tbody.innerHTML = "";
        for (const name in summary) {
            tbody.innerHTML += `<tr><td>${name}</td><td>${summary[name].pallets}</td><td>${summary[name].totalQty}</td></tr>`;
        }
    }
    document.getElementById("summaryCount").innerText = PALLETS.size;
    document.getElementById("summarySSCC").innerText = `${uniqueSSCC.size}/${totalSSCCCount}`;
}
