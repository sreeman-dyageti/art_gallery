/* =============================================
   Dark mode · Delete confirm · Char counter
   Image preview · Drag & drop
   ============================================= */

// --- DARK MODE ---
const toggleBtn = document.getElementById("themeToggle");

if (toggleBtn) {
    const savedTheme = localStorage.getItem("artfolio-theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        toggleBtn.querySelector(".toggle-icon").textContent = "☀️";
    }

    toggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        const isDark = document.body.classList.contains("dark");
        localStorage.setItem("artfolio-theme", isDark ? "dark" : "light");
        toggleBtn.querySelector(".toggle-icon").textContent = isDark ? "☀️" : "🌙";
    });
}

// --- DELETE CONFIRMATION ---
document.querySelectorAll("form[action^='/delete']").forEach(form => {
    form.addEventListener("submit", e => {
        const confirmed = confirm("Remove this artwork from your portfolio?");
        if (!confirmed) e.preventDefault();
    });
});

// --- CHARACTER COUNTER ---
const textarea = document.getElementById("content-area");
const counter  = document.getElementById("charCount");
const MAX = 500;

if (textarea && counter) {
    // Init count on edit page (pre-filled content)
    counter.textContent = textarea.value.length;

    textarea.addEventListener("input", () => {
        if (textarea.value.length > MAX) {
            textarea.value = textarea.value.slice(0, MAX);
        }
        counter.textContent = textarea.value.length;

        // Warn when close to limit
        const pct = textarea.value.length / MAX;
        counter.style.color = pct > 0.9 ? "#dc2626" : pct > 0.75 ? "#d97706" : "";
    });
}

// --- IMAGE PREVIEW + DRAG & DROP ---
const fileInput = document.getElementById("image-upload");
const dropZone  = document.getElementById("dropZone");
const preview   = document.getElementById("imagePreview");

function showPreview(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => {
        if (preview) {
           preview.innerHTML = `<img src="${e.target.result}" alt="Main Image">`;
        }
        if (dropZone) {
            const text = dropZone.querySelector(".drop-text");
            if (text) text.textContent = file.name;
        }
    };
    reader.readAsDataURL(file);
}

if (fileInput) {
    fileInput.addEventListener("change", () => {
        if (fileInput.files[0]) showPreview(fileInput.files[0]);
    });
}

if (dropZone) {
    ["dragenter", "dragover"].forEach(evt => {
        dropZone.addEventListener(evt, e => {
            e.preventDefault();
            dropZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach(evt => {
        dropZone.addEventListener(evt, e => {
            dropZone.classList.remove("drag-over");
        });
    });

    dropZone.addEventListener("drop", e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && fileInput) {
            // Create a DataTransfer to assign to the file input
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            showPreview(file);
        }
    });
}
// --- SMOOTH SCROLL TOP ON LOGO CLICK ---
document.querySelectorAll(".logo-link").forEach(link => {
    link.addEventListener("click", () => {
        if (window.location.pathname === "/") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
});
// --- PROCESS IMAGES PREVIEW (MULTIPLE) ---
const processInput = document.getElementById("process-upload");
const processPreview = document.getElementById("processPreview");

if (processInput && processPreview) {
    processInput.addEventListener("change", () => {
        processPreview.innerHTML = ""; // clear old previews

        const files = processInput.files;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith("image/")) return;

            const reader = new FileReader();

            reader.onload = e => {
                const img = document.createElement("img");
                img.src = e.target.result;

                img.style.width = "100%";
                img.style.height = "90px";
                img.style.objectFit = "cover";
                img.style.borderRadius = "8px";
                img.style.margin = "5px";

                processPreview.appendChild(img);
            };

            reader.readAsDataURL(file);
        });
    });
}