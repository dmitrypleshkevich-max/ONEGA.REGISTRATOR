const APP = { goodsFile: "goods.csv", structureFile: "packing.json" };
const GOODS = new Map();
const PALLETS = new Map();
let PACK_STRUCTURE = null;

function setStatus(text, color = "#2e8b57") {
    const e = document.getElementById("status");
    if (e) { e.innerText = text; e.style.color = color; }
}

// Парсинг с учетом того, что end ВКЛЮЧИТЕЛЬНЫЙ (используем slice(start, end + 1))
function parseBarcode(fullCode) {
    if (!PACK_STRUCTURE || !PACK_STRUCTURE.fields) return { ItemID: fullCode, Qty: 0 };
    
    let parsed = { ItemID: "", Qty: 0 };
    PACK_STRUCTURE.fields.forEach(f => {
        const val = fullCode.slice(f.start, f.end + 1).trim();
        if (f.name === "ItemID") parsed.ItemID = val;
        if (f.name === "Qty") parsed.Qty = parseInt(val) || 0;
    });
    return parsed;
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Инициализация вкладок (ОБЯЗАТЕЛЬНО)
    document.querySelectorAll('.tabButton').forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем активный класс у всех кнопок
            document.querySelectorAll('.tabButton').forEach(b => b.classList.remove('active'));
            // Добавляем активный класс текущей
            btn.classList.add('active');
            
            // Скрываем все вкладки
            document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
            // Показываем нужную
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
        });
    });

    // Инициализация отображения (сразу показываем только активную вкладку)
    document.querySelectorAll('.tab').forEach(t => {
        t.style.display = t.classList.contains('active') ? 'block' : 'none';
    });

    loadData();

    // Обработчик контейнера
    document.getElementById("containerInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const fullCode = e.target.value.trim();
            if (PALLETS.has(fullCode)) {
                setStatus(`Контейнер ${fullCode} уже добавлен!`, "#c53929");
                return;
            }

            const parsed = parseBarcode(fullCode);
            const good = GOODS.get(parsed.ItemID);

            if (good) {
                if (good.askSSCC === "1") {
                    const wrapper = document.getElementById("ssccFieldWrapper");
                    wrapper.classList.remove("hidden");
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

async function loadData() {
    try {
        const resGoods = await fetch(APP.goodsFile);
        const text = await resGoods.text();
        text.split('\n').forEach(line => {
            const [id, name, askSSCC] = line.split(';').map(item => item.trim());
            if (id) GOODS.set(id.trim(), { name: name.trim(), qty: parseInt(qty), askSSCC: askSSCC?.trim() });
        });
        const resPack = await fetch(APP.structureFile);
        PACK_STRUCTURE = await resPack.json();
        document.getElementById("goodsStatus").innerText = "Данные загружены";
    } catch (err) { console.error(err); document.getElementById("goodsStatus").innerText = "Ошибка загрузки"; }
}

function savePallet(containerCode, itemId, name, qty, sscc) {
    PALLETS.set(containerCode, { itemId, goodName: name, qty: parseInt(qty), ssccCode: sscc });
    updateSummaryTable();
    setStatus(`Зарегистрировано: ${name}`);
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
        if (p.ssccCode) { totalSSCCCount++; uniqueSSCC.add(p.ssccCode); }
    });
    const tbody = document.getElementById("summaryTable");
    tbody.innerHTML = Object.keys(summary).length === 0 ? '<tr><td colspan="3">Нет данных</td></tr>' : "";
    for (const name in summary) {
        tbody.innerHTML += `<tr><td>${name}</td><td>${summary[name].pallets}</td><td>${summary[name].totalQty}</td></tr>`;
    }
    document.getElementById("summaryCount").innerText = PALLETS.size;
    document.getElementById("summarySSCC").innerText = `${uniqueSSCC.size}/${totalSSCCCount}`;
}
