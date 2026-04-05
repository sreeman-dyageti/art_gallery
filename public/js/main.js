/* =============================================
   Dark mode · Hamburger · Delete confirm
   Char counter · Drag & drop · Process images
   ============================================= */

// --- DARK MODE ---
function applyTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("artfolio-theme", isDark ? "dark" : "light");
    document.querySelectorAll(".toggle-icon").forEach(icon => {
        icon.textContent = isDark ? "☀️" : "🌙";
    });
}

const savedTheme = localStorage.getItem("artfolio-theme");
if (savedTheme === "dark") applyTheme(true);

document.querySelectorAll("#themeToggle, #themeToggleMobile").forEach(btn => {
    if (!btn) return;
    btn.addEventListener("click", () => {
        applyTheme(!document.body.classList.contains("dark"));
    });
});

// --- HAMBURGER MENU ---
const hamburger  = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
const backdrop   = document.getElementById("menuBackdrop");

function openMenu() {
    hamburger?.classList.add("open");
    mobileMenu?.classList.add("open");
    backdrop?.classList.add("open");
    document.body.classList.add("menu-open");
}
function closeMenu() {
    hamburger?.classList.remove("open");
    mobileMenu?.classList.remove("open");
    backdrop?.classList.remove("open");
    document.body.classList.remove("menu-open");
}

hamburger?.addEventListener("click", () =>
    hamburger.classList.contains("open") ? closeMenu() : openMenu()
);
backdrop?.addEventListener("click", closeMenu);
document.querySelectorAll(".mobile-nav-link").forEach(l => l.addEventListener("click", closeMenu));
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
window.addEventListener("resize", () => { if (window.innerWidth > 640) closeMenu(); });

// --- DELETE CONFIRMATION ---
document.querySelectorAll("form[action^='/delete']").forEach(form => {
    form.addEventListener("submit", e => {
        if (!confirm("Remove this artwork from your portfolio?")) e.preventDefault();
    });
});

// --- CHARACTER COUNTER ---
const textarea = document.getElementById("content-area");
const counter  = document.getElementById("charCount");
const MAX = 500;

if (textarea && counter) {
    counter.textContent = textarea.value.length;
    textarea.addEventListener("input", () => {
        if (textarea.value.length > MAX) textarea.value = textarea.value.slice(0, MAX);
        counter.textContent = textarea.value.length;
        const pct = textarea.value.length / MAX;
        counter.style.color = pct > 0.9 ? "#dc2626" : pct > 0.75 ? "#d97706" : "";
    });
}
// --- MAIN IMAGE drag & drop ---
const mainZone    = document.getElementById("mainDropZone");
const mainInput   = document.getElementById("mainImageInput");
const mainBody    = document.getElementById("mainDropBody");
const mainPreview = document.getElementById("mainPreview");

function showMainPreview(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => {
        if (mainPreview) mainPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        if (mainBody)    mainBody.style.display = "none";
    };
    reader.readAsDataURL(file);
}

if (mainInput) {
    mainInput.addEventListener("change", () => {
        if (mainInput.files[0]) showMainPreview(mainInput.files[0]);
    });
}

if (mainZone) {
    ["dragenter", "dragover"].forEach(evt =>
        mainZone.addEventListener(evt, e => {
            e.preventDefault();
            mainZone.classList.add("drag-over");
        })
    );
    ["dragleave", "drop"].forEach(evt =>
        mainZone.addEventListener(evt, () => mainZone.classList.remove("drag-over"))
    );
    mainZone.addEventListener("drop", e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/") && mainInput) {
            // ← KEY FIX: properly assign file to input
            const dt = new DataTransfer();
            dt.items.add(file);
            mainInput.files = dt.files;
            showMainPreview(file);
        }
    });
}

// --- PROCESS IMAGES drag & drop + grid preview ---
const processZone  = document.getElementById("processDropZone");
const processInput = document.getElementById("processImagesInput");
const processBody  = document.getElementById("processDropBody");
const previewGrid  = document.getElementById("processPreviewGrid");

let processFiles = new DataTransfer();

function renderProcessPreviews() {
    if (!previewGrid) return;
    previewGrid.innerHTML = "";

    Array.from(processFiles.files).forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = e => {
            const item = document.createElement("div");
            item.className = "preview-item";
            item.innerHTML = `
                <img src="${e.target.result}" alt="Step ${i + 1}">
                <span class="preview-step">Step ${i + 1}</span>
                <button type="button" class="remove-btn" data-index="${i}">✕</button>
            `;
            previewGrid.appendChild(item);

            item.querySelector(".remove-btn").addEventListener("click", () => {
                const newDt = new DataTransfer();
                Array.from(processFiles.files).forEach((f, j) => {
                    if (j !== i) newDt.items.add(f);
                });
                processFiles = newDt;
                if (processInput) processInput.files = processFiles.files;
                renderProcessPreviews();
            });
        };
        reader.readAsDataURL(file);
    });

    if (processBody) {
        const count = processFiles.files.length;
        processBody.querySelector(".drop-text").textContent = count > 0
            ? `${count} image${count > 1 ? "s" : ""} selected — click to add more`
            : "Click or drag & drop process photos";
    }
}

if (processInput) {
    processInput.addEventListener("change", () => {
        Array.from(processInput.files).forEach(f => processFiles.items.add(f));
        processInput.files = processFiles.files;
        renderProcessPreviews();
    });
}

if (processZone) {
    ["dragenter", "dragover"].forEach(evt =>
        processZone.addEventListener(evt, e => { e.preventDefault(); processZone.classList.add("drag-over"); })
    );
    ["dragleave", "drop"].forEach(evt =>
        processZone.addEventListener(evt, () => processZone.classList.remove("drag-over"))
    );
    processZone.addEventListener("drop", e => {
        e.preventDefault();
        Array.from(e.dataTransfer.files).forEach(f => {
            if (f.type.startsWith("image/")) processFiles.items.add(f);
        });
        processInput.files = processFiles.files;
        renderProcessPreviews();
    });
}

// --- SMOOTH SCROLL ON LOGO CLICK ---
document.querySelectorAll(".logo-link").forEach(link => {
    link.addEventListener("click", () => {
        if (window.location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
    });
});