(() => {

  const DEFAULT_DAYS_LEFT = 15;

  const isValidOF = (s) => /^[Оо][Фф]\d+$/.test((s || "").trim());

 
  const normOF = (s) => (s || "").trim().toUpperCase();

  const balanceKey = (of) => `vac_balance_${normOF(of)}`;
  const profileKey = (of) => `vac_profile_${normOF(of)}`;

  const toDate = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return null;
    const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const toStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };

  const isSunday = (date) => date.getDay() === 0;

  const ofInput = document.getElementById("ofInput");
  const ofError = document.getElementById("ofError");

  const daysLeftEl = document.getElementById("daysLeft");
  const hoursLeftEl = document.getElementById("hoursLeft");
  const daysBar = document.getElementById("daysBar");

  const adminRow = document.getElementById("adminRow");
  const adminDays = document.getElementById("adminDays");
  const hoursPerDay = document.getElementById("hoursPerDay");
  const adminSaveBtn = document.getElementById("adminSaveBtn");

  const startDate = document.getElementById("startDate");
  const durationDays = document.getElementById("durationDays");
  const endDate = document.getElementById("endDate");
  const calcBtn = document.getElementById("calcBtn");
  const clearBtn = document.getElementById("clearBtn");

  const warn = document.getElementById("warn");
  const result = document.getElementById("result");

  const holidayPicker = document.getElementById("holidayPicker");
  const addHolidayBtn = document.getElementById("addHolidayBtn");
  const clearHolidaysBtn = document.getElementById("clearHolidaysBtn");
  const holidaysArea = document.getElementById("holidaysArea");

  const getDaysLeft = (of) => {
    const raw = localStorage.getItem(balanceKey(of));
    if (raw == null) return DEFAULT_DAYS_LEFT;
    const n = Number(raw);
    return Number.isFinite(n) ? n : DEFAULT_DAYS_LEFT;
  };

  const setDaysLeft = (of, days) => {
    localStorage.setItem(balanceKey(of), String(days));
  };

  const saveProfile = (of) => {
    const data = {
      calculator: {
        startDate: startDate.value || "",
        durationDays: durationDays.value || "",
        endDate: endDate.value || ""
      },
      holidaysText: holidaysArea.value || ""
    };
    localStorage.setItem(profileKey(of), JSON.stringify(data));
  };

  const loadProfile = (of) => {
    const raw = localStorage.getItem(profileKey(of));
    if (!raw) {
      startDate.value = "";
      durationDays.value = "";
      endDate.value = "";
      holidaysArea.value = "";
      return;
    }
    try {
      const data = JSON.parse(raw);

      if (data.calculator) {
        startDate.value = data.calculator.startDate || "";
        durationDays.value = data.calculator.durationDays || "";
        endDate.value = data.calculator.endDate || "";
      } else {
        startDate.value = "";
        durationDays.value = "";
        endDate.value = "";
      }

      holidaysArea.value = data.holidaysText != null ? data.holidaysText : "";
    } catch {
      startDate.value = "";
      durationDays.value = "";
      endDate.value = "";
      holidaysArea.value = "";
    }
  };

  const parseHolidays = () => {
    const txt = holidaysArea.value.trim();
    if (!txt) return new Set();
    const parts = txt.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const set = new Set();
    for (const p of parts) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(p)) set.add(p);
    }
    return set;
  };

  const renderBalance = () => {
    const of = normOF(ofInput.value);
    if (!isValidOF(of)) {
      daysLeftEl.textContent = "—";
      hoursLeftEl.textContent = "—";
      daysBar.style.width = "0%";
      return;
    }

    const left = getDaysLeft(of);
    const hpd = Number(hoursPerDay.value) || 8;

    daysLeftEl.textContent = left.toFixed(2).replace(/\.00$/, "");
    hoursLeftEl.textContent = (left * hpd).toFixed(2).replace(/\.00$/, "");

    const pct = DEFAULT_DAYS_LEFT > 0 ? (left / DEFAULT_DAYS_LEFT) * 100 : 0;
    daysBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  };

  const showWarn = (messages) => {
    if (!messages.length) {
      warn.hidden = true;
      warn.textContent = "";
      return;
    }
    warn.hidden = false;
    warn.textContent = "⚠️ " + messages.join(" ");
  };

  const applyOFMode = () => {
    const raw = ofInput.value.trim();
    if (raw) ofInput.value = normOF(raw);

    const of = normOF(ofInput.value);

    if (!raw) {
      ofError.hidden = true;
      adminRow.hidden = true;
      warn.hidden = true;
      result.innerHTML =
        "Введи <b>ОФ</b> у форматі <b>ОФ + число</b>, щоб побачити залишок і рахувати відпустку.";
      renderBalance();
      return;
    }

    if (!isValidOF(of)) {
      ofError.hidden = false;
      ofError.textContent =
        "⚠️ Невірний формат. Потрібно: ОФ + число (наприклад ОФ45).";
      adminRow.hidden = true;
      warn.hidden = true;
      result.innerHTML = "Введи коректний ОФ, щоб користуватись калькулятором.";
      renderBalance();
      return;
    }

    ofError.hidden = true;
    adminRow.hidden = false;
    loadProfile(of);

    renderBalance();
    warn.hidden = true;

    const left = getDaysLeft(of);
    result.innerHTML = `ОФ <b>${of}</b>: залишок <b>${left}</b> днів. Введи 2 параметри — порахується 3-й.`;
  };

  const calcDuration = (s, e, holidaySet) => {
    let cur = new Date(s);
    let count = 0;
    while (cur <= e) {
      if (!holidaySet.has(toStr(cur))) count++;
      cur = addDays(cur, 1);
    }
    return count;
  };

  const calcEnd = (s, duration, holidaySet) => {
    let cur = new Date(s);
    let counted = 0;
    while (true) {
      if (!holidaySet.has(toStr(cur))) counted++;
      if (counted === duration) return cur;
      cur = addDays(cur, 1);
    }
  };

  const calcStart = (e, duration, holidaySet) => {
    let cur = new Date(e);
    let counted = 0;
    while (true) {
      if (!holidaySet.has(toStr(cur))) counted++;
      if (counted === duration) return cur;
      cur = addDays(cur, -1);
    }
  };

  const calculate = () => {
    const of = normOF(ofInput.value);
    if (!isValidOF(of)) {
      result.innerHTML = "Спочатку введи коректний ОФ (наприклад ОФ45).";
      showWarn([]);
      return;
    }

    const hs = parseHolidays();
    const s = toDate(startDate.value);
    const e = toDate(endDate.value);
    const d = durationDays.value ? Number(durationDays.value) : null;

    if (d !== null && (!Number.isFinite(d) || d <= 0)) {
      result.innerHTML = "Тривалість має бути додатним числом.";
      showWarn([]);
      return;
    }

    const filled = [!!s, !!e, !!d].filter(Boolean).length;
    if (filled < 2) {
      result.innerHTML =
        "Введи будь-які <b>2 параметри</b> (початок/дні/кінець), щоб порахувати 3-й.";
      showWarn([]);
      saveProfile(of);
      return;
    }

    const warnings = [];
    if (s && isSunday(s)) warnings.push("Дата початку — неділя.");
    if (e && isSunday(e)) warnings.push("Дата завершення — неділя.");

    if (s && d !== null && !e) {
      const end = calcEnd(s, d, hs);
      endDate.value = toStr(end);
      if (isSunday(end)) warnings.push("Дата завершення — неділя.");
      showWarn(warnings);
      result.innerHTML = `Розраховано: <b>дата завершення = ${toStr(end)}</b> (включно).`;
      saveProfile(of);
      return;
    }

    if (e && d !== null && !s) {
      const start = calcStart(e, d, hs);
      startDate.value = toStr(start);
      if (isSunday(start)) warnings.push("Дата початку — неділя.");
      showWarn(warnings);
      result.innerHTML = `Розраховано: <b>дата початку = ${toStr(start)}</b> (включно).`;
      saveProfile(of);
      return;
    }

    if (s && e && d === null) {
      if (e < s) {
        result.innerHTML = "Дата завершення не може бути раніше дати початку.";
        showWarn([]);
        return;
      }
      const days = calcDuration(s, e, hs);
      durationDays.value = String(days);
      showWarn(warnings);
      result.innerHTML = `Розраховано: <b>тривалість = ${days}</b> днів (свята не враховані).`;
      saveProfile(of);
      return;
    }

    if (s && e && d !== null) {
      if (e < s) {
        result.innerHTML = "Дата завершення не може бути раніше дати початку.";
        showWarn([]);
        return;
      }
      const daysFact = calcDuration(s, e, hs);
      showWarn(warnings);
      result.innerHTML =
        `Усі 3 параметри задані. Фактична тривалість (з урахуванням свят) = <b>${daysFact}</b> днів.`;
      saveProfile(of);
      return;
    }

    showWarn(warnings);
    result.innerHTML = "Перевір введені дані: потрібно задати 2 параметри, третій буде розраховано.";
    saveProfile(of);
  };

  const saveBalanceForCurrentOF = () => {
    const of = normOF(ofInput.value);
    if (!isValidOF(of)) {
      alert("Введи коректний ОФ (ОФ + число).");
      return;
    }
    const days = Number(adminDays.value);
    if (!Number.isFinite(days) || days < 0) {
      alert("Залишок має бути числом ≥ 0.");
      return;
    }
    setDaysLeft(of, days);
    renderBalance();
    alert(`Збережено: ${of} → ${days} днів`);
  };

  ofInput.addEventListener("input", () => applyOFMode());
  hoursPerDay.addEventListener("input", () => renderBalance());
  adminSaveBtn.addEventListener("click", saveBalanceForCurrentOF);

  calcBtn.addEventListener("click", calculate);

  clearBtn.addEventListener("click", () => {
    startDate.value = "";
    durationDays.value = "";
    endDate.value = "";
    holidaysArea.value = "";
    showWarn([]);
    result.innerHTML = "Поля очищено.";
    const of = normOF(ofInput.value);
    if (isValidOF(of)) saveProfile(of);
  });

  addHolidayBtn.addEventListener("click", () => {
    const of = normOF(ofInput.value);
    if (!isValidOF(of)) { alert("Спочатку введи коректний ОФ."); return; }
    if (!holidayPicker.value) return;

    const set = parseHolidays();
    set.add(holidayPicker.value);
    holidaysArea.value = [...set].sort().join("\n");

    saveProfile(of);
  });

  clearHolidaysBtn.addEventListener("click", () => {
    const of = normOF(ofInput.value);
    if (!isValidOF(of)) { alert("Спочатку введи коректний ОФ."); return; }
    holidaysArea.value = "";
    saveProfile(of);
  });

  [startDate, durationDays, endDate, holidaysArea].forEach((el) => {
    el.addEventListener("input", () => {
      const of = normOF(ofInput.value);
      if (!isValidOF(of)) return;
      saveProfile(of);
    });
  });

  applyOFMode();
})();
