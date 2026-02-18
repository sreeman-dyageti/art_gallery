//for dark mode
const toggleBtn = document.getElementById("themeToggle");

if (toggleBtn) {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    toggleBtn.textContent = "☀️";
  }

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");

    toggleBtn.textContent = isDark ? "☀️" : "🌙";
  });
}

//delete conform
document
  .querySelectorAll("form[action^='/delete']")
  .forEach(form => {
    form.addEventListener("submit", e => {
      const confirmed = confirm("Are you sure you want to delete this post?");
      if (!confirmed) e.preventDefault();
    });
  });


const textarea = document.querySelector("textarea");
const counter = document.getElementById("charCount");
const MAX = 500;

if (textarea && counter) {
  textarea.addEventListener("input", () => {
    if (textarea.value.length > MAX) {
      textarea.value = textarea.value.slice(0, MAX);
    }
    counter.textContent = `${textarea.value.length} / ${MAX}`;
  });
}
