// Поведение страниц сайта: тема, оглавление на узком экране, поиск, текущий раздел.
(function () {
  const root = document.documentElement;
  const body = document.body;

  // Тема: светлая / тёмная, выбор запоминается; по умолчанию — как в системе
  const themeBtn = document.querySelector(".theme-btn");
  function systemDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : systemDark();
      const next = dark ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // Оглавление на узком экране
  const menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      const open = body.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".sidebar a").forEach(function (a) {
      a.addEventListener("click", function () { body.classList.remove("nav-open"); });
    });
  }

  // Поиск (Pagefind): панель открывается кнопкой или клавишей «/»
  const panel = document.querySelector(".search-panel");
  const searchBtn = document.querySelector(".search-btn");
  let searchReady = false;
  function openSearch() {
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (panel.hidden) return;
    if (!searchReady && window.PagefindUI) {
      new window.PagefindUI({
        element: "#search", showSubResults: true, showImages: false,
        translations: {
          placeholder: "Поиск по книге",
          zero_results: "Ничего не найдено по запросу «[SEARCH_TERM]»",
          clear_search: "Очистить",
          load_more: "Показать ещё",
        },
      });
      searchReady = true;
    }
    const input = panel.querySelector("input");
    if (input) input.focus();
  }
  if (searchBtn) searchBtn.addEventListener("click", openSearch);
  document.addEventListener("keydown", function (e) {
    const tag = (e.target.tagName || "").toLowerCase();
    if (e.key === "/" && tag !== "input" && tag !== "textarea") { e.preventDefault(); openSearch(); }
    if (e.key === "Escape" && panel && !panel.hidden) panel.hidden = true;
  });

  // Кнопка «Копировать» у листингов
  document.querySelectorAll("div.sourceCode").forEach(function (box) {
    const code = box.querySelector("code");
    if (!code || !navigator.clipboard) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "copy-btn"; btn.textContent = "Копировать";
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(code.innerText).then(function () {
        btn.textContent = "Скопировано";
        setTimeout(function () { btn.textContent = "Копировать"; }, 1500);
      });
    });
    box.appendChild(btn);
  });

  // «Как цитировать»: адрес книги (каталог текущей страницы) и сегодняшняя дата обращения
  const now = new Date();
  const pad = function (n) { return String(n).padStart(2, "0"); };
  const bookUrl = location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
  const dateRu = pad(now.getDate()) + "." + pad(now.getMonth() + 1) + "." + now.getFullYear();
  const dateIso = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  document.querySelectorAll(".cite-url").forEach(function (el) { el.textContent = bookUrl; });
  document.querySelectorAll(".cite-date").forEach(function (el) { el.textContent = dateRu; });
  document.querySelectorAll("pre.cite-bib code").forEach(function (el) {
    el.textContent = el.textContent.replace("{URL}", "{" + bookUrl + "}").replace("{DATE}", "{" + dateIso + "}");
  });
  document.querySelectorAll(".cite-box, pre.cite-bib").forEach(function (box) {
    if (!navigator.clipboard) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "copy-btn"; btn.textContent = "Копировать";
    btn.addEventListener("click", function () {
      const src = box.querySelector("code") || box.querySelector("p") || box;
      navigator.clipboard.writeText(src.innerText.trim()).then(function () {
        btn.textContent = "Скопировано";
        setTimeout(function () { btn.textContent = "Копировать"; }, 1500);
      });
    });
    box.appendChild(btn);
  });

  // «Сообщить об ошибке»: новая задача на GitHub с главой, адресом и выделенным фрагментом.
  // Выделение запоминаем до нажатия: на некоторых устройствах нажатие его снимает.
  const report = document.querySelector(".report-link");
  if (report) {
    let quote = "";
    const remember = function () { quote = String(window.getSelection() || "").trim(); };
    document.addEventListener("selectionchange", function () {
      const s = String(window.getSelection() || "").trim();
      if (s) quote = s;
    });
    report.addEventListener("mousedown", remember);
    report.addEventListener("click", function () {
      const clean = function (s) { return s.replace(/\s+/g, " ").trim(); };
      const page = document.querySelector("article h1");
      let chapter = document.title;
      if (page) {
        const num = page.querySelector(".header-section-number");
        const h = page.cloneNode(true);
        h.querySelectorAll(".header-section-number").forEach(function (n) { n.remove(); });
        chapter = (num ? "гл. " + clean(num.textContent) + ". " : "") + clean(h.textContent);
      }
      const title = "Ошибка: " + chapter;
      const lines = ["**Книга:** " + clean(report.dataset.book), "**Страница:** " + location.href];
      if (quote) lines.push("", "**Фрагмент:**", "> " + quote.slice(0, 1500).replace(/\n+/g, "\n> "));
      lines.push("", "**Что не так и как должно быть:**", "");
      report.href = report.dataset.issues + "/new?title=" + encodeURIComponent(title) +
        "&body=" + encodeURIComponent(lines.join("\n"));
    });
  }

  // Текущий раздел главы — подсветка в оглавлении при прокрутке
  const links = Array.from(document.querySelectorAll(".sidebar li.current ol a"));
  const byId = new Map();
  links.forEach(function (a) {
    const id = decodeURIComponent((a.getAttribute("href").split("#")[1]) || "");
    const h = id && document.getElementById(id);
    if (h) byId.set(h, a);
  });
  if (byId.size && "IntersectionObserver" in window) {
    const heads = Array.from(byId.keys());
    let active = null;
    function update() {
      const top = window.innerHeight * 0.25;
      let cur = heads[0];
      for (const h of heads) { if (h.getBoundingClientRect().top <= top) cur = h; }
      if (cur !== active) {
        if (active) byId.get(active).classList.remove("active");
        byId.get(cur).classList.add("active");
        active = cur;
      }
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }
})();
