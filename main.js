const initialRequests = [
  {
    id: "2020134577",
    aansluitnr: "424000",
    dienst: "TEL",
    mutatie: "2000-02-16",
    debiteurnr: "BB424000",
    naamDebiteur: "UN PATOE/LEE ON O I",
    aangeslotene: "170333565",
    naamAangeslotene: "UN PATOE/LEE ON O I",
    adres: "MAAGDENSTR 2",
    status: "0",
    laatsteGebruiker: "sarimis",
    laatsteWijziging: "2020-12-21",
    contractor: "",
    processStage: "",
    surveyDate: "",
    surveyTime: "",
    soortAanvraag: "MIG",
    aanvraagdatum: "2000-02-16",
    aansluitadres: "HARRY WEG 18 - PONTBUITEN - KWEEKI - WANICA",
    contactnr: "",
    contactnaam: "",
    fiberNummer: "",
    fiberAccessTerminal: "",
    olt: "",
    paalNumber: "",
    odfPositie: "",
    paalStraat: "",
    closure: "",
    paalLongitude: "",
    geprojecteerdAdres: "",
    paalLatitude: "",
    aansluitnummerNieuw: "",
    opmerking: ""
  }
];

const storageKey = "ftthInboxRequests";
const storageVersionKey = "ftthInboxRequestsVersion";
const currentStorageVersion = "5";
const usersKey = "ftthUsers";
const sessionKey = "ftthCurrentUser";
const contractorEmailsKey = "ftthContractorEmails";
const contractors = ["SETI NV", "OX88", "ANTS", "QCT", "TQRT"];
const processStages = [
  "Survey",
  "Installatie",
  "ATA-box invoeren",
  "REST nummers opheffen",
  "Bulk file opmaken",
  "ATA-box configureren",
  "ATA-box install (contractor)",
  "Afronding & registratie (Excel file)"
];
const extraNumberFields = [
  "fiberNummer",
  "fiberAccessTerminal",
  "olt",
  "paalNumber",
  "odfPositie",
  "paalStraat",
  "closure",
  "paalLongitude",
  "geprojecteerdAdres",
  "paalLatitude"
];
const state = {
  requests: loadRequests(),
  users: loadUsers(),
  contractorEmails: loadContractorEmails(),
  currentUser: loadSessionUser(),
  selectedIds: new Set(),
  selectedQueue: [],
  currentQueueIndex: 0,
  page: 1,
  pageSize: 10,
  query: "",
  contractorFilter: "ALL"
};

const inboxView = document.querySelector("#inboxView");
const formView = document.querySelector("#formView");
const loginView = document.querySelector("#loginView");
const usersView = document.querySelector("#usersView");
const dashboardView = document.querySelector("#dashboardView");
const inboxRows = document.querySelector("#inboxRows");
const recordInfo = document.querySelector("#recordInfo");
const pageNumber = document.querySelector("#pageNumber");
const form = document.querySelector("#requestForm");
const userForm = document.querySelector("#userForm");
const contractorEmailForm = document.querySelector("#contractorEmailForm");
let lastProcessMail = null;

document.querySelector("#showInbox").addEventListener("click", () => showView("inbox"));
document.querySelector("#showDashboard").addEventListener("click", () => showView("dashboard"));
document.querySelector("#showUsers").addEventListener("click", () => showView("users"));
document.querySelector("#backToInbox").addEventListener("click", hideInlineForm);
document.querySelector("#selectAll").addEventListener("change", toggleVisibleRows);
document.querySelector("#searchBox").addEventListener("input", event => {
  state.query = event.target.value.trim().toLowerCase();
  state.page = 1;
  renderInbox();
});
document.querySelector("#pageSize").addEventListener("change", event => {
  state.pageSize = Number(event.target.value);
  state.page = 1;
  renderInbox();
});
document.querySelector("#prevPage").addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  renderInbox();
});
document.querySelector("#nextPage").addEventListener("click", () => {
  const maxPage = Math.max(1, Math.ceil(getFilteredRequests().length / state.pageSize));
  state.page = Math.min(maxPage, state.page + 1);
  renderInbox();
});
document.querySelector("#previousRequest").addEventListener("click", moveProcessBack);
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#fileUpload").addEventListener("change", importFile);
document.querySelector("#assignSelected").addEventListener("click", assignSelectedContractor);
document.querySelector("#deleteSelected").addEventListener("click", deleteSelectedRequests);
document.querySelector("#deleteAll").addEventListener("click", deleteAllRequests);
document.querySelector("#logoutButton").addEventListener("click", logout);
document.querySelector("#loginForm").addEventListener("submit", login);
userForm.addEventListener("submit", createUser);
userForm.elements.role.addEventListener("change", updateUserContractorField);
contractorEmailForm.addEventListener("submit", saveContractorEmails);
document.querySelector("#userRows").addEventListener("click", handleUserAction);
document.querySelector("#openSurveyMail").addEventListener("click", () => {
  if (lastProcessMail) openMailDraft(lastProcessMail);
});
document.querySelector("#copySurveyMail").addEventListener("click", copyProcessMailText);
document.querySelectorAll(".contractor-tab").forEach(button => {
  button.addEventListener("click", () => {
    state.contractorFilter = button.dataset.contractor;
    state.page = 1;
    state.selectedIds.clear();
    renderInbox();
  });
});
form.addEventListener("submit", completeCurrentRequest);

applyUserAccess();

function loadRequests() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return initialRequests;

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return initialRequests;
    if (!parsed.length) return [];
    if (localStorage.getItem(storageVersionKey) !== currentStorageVersion) {
      const upgraded = parsed.map(request => upgradeRequest(request));
      localStorage.setItem(storageKey, JSON.stringify(upgraded));
      localStorage.setItem(storageVersionKey, currentStorageVersion);
      return upgraded;
    }
    return parsed;
  } catch {
    return initialRequests;
  }
}

function saveRequests() {
  localStorage.setItem(storageKey, JSON.stringify(state.requests));
  localStorage.setItem(storageVersionKey, currentStorageVersion);
}

function loadUsers() {
  const saved = localStorage.getItem(usersKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // Use default SuperAdmin if stored users are unreadable.
    }
  }

  const defaultUsers = [{ username: "superadmin", password: "superadmin", role: "superadmin", contractor: "" }];
  localStorage.setItem(usersKey, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function saveUsers() {
  localStorage.setItem(usersKey, JSON.stringify(state.users));
}

function loadContractorEmails() {
  const saved = localStorage.getItem(contractorEmailsKey);
  const defaults = Object.fromEntries(contractors.map(contractor => [contractor, ""]));
  if (!saved) return defaults;

  try {
    return { ...defaults, ...JSON.parse(saved) };
  } catch {
    return defaults;
  }
}

function saveContractorEmails(event) {
  event.preventDefault();
  if (!canManageUsers()) return;

  contractors.forEach(contractor => {
    state.contractorEmails[contractor] = contractorEmailForm.elements[contractor].value.trim();
  });
  localStorage.setItem(contractorEmailsKey, JSON.stringify(state.contractorEmails));
  alert("Contractor e-mails opgeslagen.");
}

function loadContractorEmailForm() {
  if (!contractorEmailForm) return;
  contractors.forEach(contractor => {
    contractorEmailForm.elements[contractor].value = state.contractorEmails[contractor] || "";
  });
}

function loadSessionUser() {
  const username = localStorage.getItem(sessionKey);
  if (!username) return null;
  return loadUsers().find(user => user.username === username) || null;
}

function login(event) {
  event.preventDefault();
  const username = event.currentTarget.elements.username.value.trim();
  const password = event.currentTarget.elements.password.value;
  const user = state.users.find(item => item.username === username && item.password === password);

  if (!user) {
    alert("Gebruikersnaam of wachtwoord is onjuist.");
    return;
  }

  state.currentUser = user;
  localStorage.setItem(sessionKey, user.username);
  event.currentTarget.reset();
  applyUserAccess();
}

function logout() {
  localStorage.removeItem(sessionKey);
  state.currentUser = null;
  state.selectedIds.clear();
  applyUserAccess();
}

function isSuperAdmin() {
  return state.currentUser?.role === "superadmin";
}

function isAdmin() {
  return state.currentUser?.role === "admin" || isSuperAdmin();
}

function canAssignWorkorders() {
  return isSuperAdmin();
}

function canManageUsers() {
  return isSuperAdmin();
}

function applyUserAccess() {
  const loggedIn = Boolean(state.currentUser);
  document.querySelector(".topbar").classList.toggle("logged-out", !loggedIn);
  document.querySelector("#sessionBar").classList.toggle("hidden", !loggedIn);
  document.querySelector("#sessionUser").textContent = loggedIn
    ? `${state.currentUser.username} (${getRoleLabel(state.currentUser)})`
    : "";

  ensureDefaultSuperAdmin();

  document.querySelectorAll(".superadmin-only").forEach(element => {
    element.classList.toggle("hidden", !canManageUsers());
  });
  document.querySelectorAll(".manager-only").forEach(element => {
    element.classList.toggle("hidden", !isAdmin());
  });
  document.querySelector(".contractor-tabs").classList.toggle("hidden", !isAdmin());
  document.querySelector(".assign-bar").classList.toggle("admin-restricted", !canAssignWorkorders());
  document.querySelector("#assignContractor").disabled = !canAssignWorkorders();
  document.querySelector("#assignSelected").classList.toggle("hidden", !canAssignWorkorders());

  if (!loggedIn) {
    showView("login");
    return;
  }

  if (isAdmin()) {
    if (!contractors.includes(state.contractorFilter) && state.contractorFilter !== "ALL") {
      state.contractorFilter = "ALL";
    }
  } else {
    state.contractorFilter = state.currentUser.contractor;
  }

  renderInbox();
  renderUsers();
  loadContractorEmailForm();
  loadCurrentForm();
  showView("inbox");
}

function upgradeRequest(request) {
  const contractor = normalizeContractor(request.contractor);
  return {
    ...request,
    contractor,
    processStage: normalizeProcessStage(request.processStage) || (contractor ? processStages[0] : ""),
    surveyDate: request.surveyDate || "",
    surveyTime: request.surveyTime || ""
  };
}

function ensureDefaultSuperAdmin() {
  if (state.users.some(user => user.role === "superadmin")) return;
  state.users.unshift({ username: "superadmin", password: "superadmin", role: "superadmin", contractor: "" });
  saveUsers();
}

function getRoleLabel(user) {
  if (user.role === "superadmin") return "SuperAdmin";
  if (user.role === "admin") return "Admin";
  return user.contractor || "Contractor";
}

function showView(viewName) {
  if (!state.currentUser && viewName !== "login") viewName = "login";
  if (viewName === "users" && !canManageUsers()) viewName = "inbox";
  if (viewName === "dashboard" && !isSuperAdmin()) viewName = "inbox";

  const isLogin = viewName === "login";
  const isInbox = viewName === "inbox";
  const isForm = viewName === "form" || (isInbox && state.selectedQueue.length > 0);
  const isUsers = viewName === "users";
  const isDashboard = viewName === "dashboard";
  loginView.classList.toggle("active", isLogin);
  inboxView.classList.toggle("active", isInbox);
  formView.classList.toggle("active", isForm);
  usersView.classList.toggle("active", isUsers);
  dashboardView.classList.toggle("active", isDashboard);
  document.querySelector("#showInbox").classList.toggle("active", isInbox);
  document.querySelector("#showDashboard").classList.toggle("active", isDashboard);
  document.querySelector("#showUsers").classList.toggle("active", isUsers);
  if (isForm) loadCurrentForm();
  if (isUsers) {
    renderUsers();
    loadContractorEmailForm();
  }
  if (isDashboard) renderDashboard();
}

function getFilteredRequests() {
  if (!state.currentUser) return [];
  if (!isAdmin()) state.contractorFilter = state.currentUser.contractor;

  const query = state.query;
  const byContractor = state.contractorFilter === "ALL"
    ? state.requests
    : state.requests.filter(request => request.contractor === state.contractorFilter);
  if (!query) return byContractor;

  return byContractor.filter(request =>
    [
      request.aansluitnr,
      request.dienst,
      getInternetNumber(request),
      request.naamDebiteur,
      request.aangeslotene,
      request.naamAangeslotene,
      request.adres,
      request.status,
      request.contractor,
      request.processStage,
      request.laatsteGebruiker,
      request.laatsteWijziging
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function renderInbox() {
  if (!state.currentUser) return;
  const filtered = getFilteredRequests().slice(0, 1000);
  const maxPage = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  state.page = Math.min(state.page, maxPage);
  document.querySelector("#inboxTitle").textContent = state.contractorFilter === "ALL"
    ? "Algemene inbox"
    : `${state.contractorFilter} inbox`;

  const start = (state.page - 1) * state.pageSize;
  const visible = filtered.slice(start, start + state.pageSize);

  inboxRows.innerHTML = visible
    .map(request => {
      const checked = state.selectedIds.has(request.id) ? "checked" : "";
      const selectedClass = checked ? " class=\"selected\"" : "";
      return `
        <tr${selectedClass} data-id="${escapeHtml(request.id)}">
          <td><input type="checkbox" data-id="${escapeHtml(request.id)}" ${checked} aria-label="Aanvraag selecteren" /></td>
          <td>${escapeHtml(request.aansluitnr)}</td>
          <td>${escapeHtml(request.dienst)}</td>
          <td>${escapeHtml(request.mutatie)}</td>
          <td>${escapeHtml(getInternetNumber(request))}</td>
          <td>${escapeHtml(request.naamDebiteur)}</td>
          <td>${escapeHtml(request.aangeslotene)}</td>
          <td>${escapeHtml(request.naamAangeslotene)}</td>
          <td>${escapeHtml(request.adres)}</td>
          <td>${escapeHtml(request.status)}</td>
          <td>${escapeHtml(request.contractor || "Niet toegekend")}</td>
          <td>${escapeHtml(request.processStage || "-")}</td>
          <td>${escapeHtml(request.laatsteGebruiker)}</td>
          <td>${escapeHtml(request.laatsteWijziging)}</td>
        </tr>
      `;
    })
    .join("");

  inboxRows.querySelectorAll("input[type='checkbox']").forEach(checkbox => {
    checkbox.addEventListener("change", event => {
      event.stopPropagation();
      const id = event.target.dataset.id;
      if (event.target.checked) {
        state.selectedIds.add(id);
      } else {
        state.selectedIds.delete(id);
      }
      prepareQueueFromInbox();
      renderInbox();
      loadCurrentForm();
      formView.classList.toggle("active", state.selectedQueue.length > 0);
    });
  });
  inboxRows.querySelectorAll("tr[data-id]").forEach(row => {
    row.addEventListener("click", () => {
      state.selectedIds.clear();
      state.selectedIds.add(row.dataset.id);
      prepareQueueFromInbox();
      renderInbox();
      loadCurrentForm();
      formView.classList.add("active");
      formView.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const end = Math.min(start + visible.length, filtered.length);
  const canManageGeneralInbox = isSuperAdmin() && state.contractorFilter === "ALL";
  recordInfo.textContent = `Weergegeven ${filtered.length ? start + 1 : 0} - ${end} van ${filtered.length} records`;
  pageNumber.textContent = state.page;
  document.querySelector("#prevPage").disabled = state.page === 1;
  document.querySelector("#nextPage").disabled = state.page === maxPage;
  document.querySelector("#assignSelected").disabled = state.selectedIds.size === 0;
  document.querySelector("#deleteSelected").disabled = state.selectedIds.size === 0;
  document.querySelector("#deleteSelected").classList.toggle("hidden", !canManageGeneralInbox);
  document.querySelector("#deleteAll").disabled = state.requests.length === 0;
  document.querySelector("#deleteAll").classList.toggle("hidden", !canManageGeneralInbox);
  document.querySelector("#uploadControls").classList.toggle("hidden", !canManageGeneralInbox);
  document.querySelector("#selectAll").checked = visible.length > 0 && visible.every(request => state.selectedIds.has(request.id));
  document.querySelectorAll(".contractor-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.contractor === state.contractorFilter);
  });
}

function assignSelectedContractor() {
  if (!canAssignWorkorders()) {
    alert("Alleen SuperAdmin users kunnen werkorders toekennen.");
    return;
  }

  const contractor = document.querySelector("#assignContractor").value;
  if (!contractor) {
    alert("Kies eerst een contractor.");
    return;
  }

  let updatedCount = 0;
  state.requests.forEach(request => {
    if (state.selectedIds.has(request.id)) {
      request.contractor = contractor;
      request.processStage = processStages[0];
      request.status = request.status && request.status !== "0" ? request.status : "Toegekend";
      request.laatsteGebruiker = "planner";
      request.laatsteWijziging = new Date().toISOString().slice(0, 10);
      updatedCount += 1;
    }
  });

  state.selectedIds.clear();
  saveRequests();
  renderInbox();
  renderDashboard();
  alert(`${updatedCount} werkorder(s) toegekend aan ${contractor}.`);
}

function deleteSelectedRequests() {
  if (!isSuperAdmin() || state.contractorFilter !== "ALL") {
    alert("Alleen SuperAdmin kan werkorders verwijderen vanuit de algemene inbox.");
    return;
  }

  if (!state.selectedIds.size) {
    alert("Selecteer eerst een of meer werkorders.");
    return;
  }

  if (!confirm(`Weet je zeker dat je ${state.selectedIds.size} geselecteerde werkorder(s) wilt verwijderen?`)) return;

  state.requests = state.requests.filter(request => !state.selectedIds.has(request.id));
  clearSelectionAndRefresh();
  alert("Geselecteerde werkorder(s) verwijderd.");
}

function deleteAllRequests() {
  if (!isSuperAdmin() || state.contractorFilter !== "ALL") {
    alert("Alleen SuperAdmin kan alle werkorders verwijderen vanuit de algemene inbox.");
    return;
  }

  if (!state.requests.length) {
    alert("De inbox is al leeg.");
    return;
  }

  if (!confirm(`Weet je zeker dat je alle ${state.requests.length} werkorders wilt verwijderen?`)) return;

  state.requests = [];
  clearSelectionAndRefresh();
  alert("Alle werkorders zijn verwijderd.");
}

function clearSelectionAndRefresh() {
  state.selectedIds.clear();
  state.selectedQueue = [];
  state.currentQueueIndex = 0;
  saveRequests();
  renderInbox();
  renderDashboard();
  formView.classList.remove("active");
}

function updateUserContractorField() {
  const isContractor = userForm.elements.role.value === "contractor";
  document.querySelector("#userContractorField").classList.toggle("hidden", !isContractor);
  userForm.elements.contractor.disabled = !isContractor;
  if (!isContractor) userForm.elements.contractor.value = "";
}

function createUser(event) {
  event.preventDefault();
  if (!canManageUsers()) return;

  const username = userForm.elements.username.value.trim();
  const password = userForm.elements.password.value;
  const role = userForm.elements.role.value;
  const contractor = role === "contractor" ? userForm.elements.contractor.value : "";

  if (!username || !password) {
    alert("Vul gebruikersnaam en wachtwoord in.");
    return;
  }

  if (state.users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    alert("Deze gebruikersnaam bestaat al.");
    return;
  }

  if (role === "contractor" && !contractor) {
    alert("Kies een contractor voor deze user.");
    return;
  }

  state.users.push({ username, password, role, contractor });
  saveUsers();
  userForm.reset();
  updateUserContractorField();
  renderUsers();
}

function renderUsers() {
  const userRows = document.querySelector("#userRows");
  if (!userRows) return;

  userRows.innerHTML = state.users
    .map(user => `
      <tr>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.password || "")}</td>
        <td>${escapeHtml(getRoleLabel(user))}</td>
        <td>${escapeHtml(user.contractor || "-")}</td>
        <td>
          <button class="table-action" data-action="change-password" data-username="${escapeHtml(user.username)}" type="button">
            Wachtwoord wijzigen
          </button>
        </td>
      </tr>
    `)
    .join("");
  updateUserContractorField();
}

function handleUserAction(event) {
  const button = event.target.closest("[data-action='change-password']");
  if (!button || !canManageUsers()) return;

  const username = button.dataset.username;
  const user = state.users.find(item => item.username === username);
  if (!user) return;

  const password = prompt(`Nieuw wachtwoord voor ${user.username}:`);
  if (password === null) return;

  const cleanPassword = password.trim();
  if (!cleanPassword) {
    alert("Vul een wachtwoord in.");
    return;
  }

  user.password = cleanPassword;
  saveUsers();
  alert(`Wachtwoord van ${user.username} is gewijzigd.`);
}

function isOpenWorkorder(request) {
  return request.status !== "Afgerond" && request.processStage !== processStages[processStages.length - 1];
}

function getDashboardData() {
  return contractors.map(contractor => {
    const contractorRequests = state.requests.filter(request => request.contractor === contractor);
    const open = contractorRequests.filter(isOpenWorkorder).length;
    return {
      contractor,
      open,
      total: contractorRequests.length
    };
  });
}

function renderDashboard() {
  const data = getDashboardData();
  const totalOpen = data.reduce((sum, item) => sum + item.open, 0);
  const totalAssigned = data.reduce((sum, item) => sum + item.total, 0);
  const maxOpen = Math.max(1, ...data.map(item => item.open));

  document.querySelector("#dashboardSummary").innerHTML = `
    <div class="summary-card">
      <span>Openstaand totaal</span>
      <strong>${totalOpen}</strong>
    </div>
    <div class="summary-card">
      <span>Toegekend totaal</span>
      <strong>${totalAssigned}</strong>
    </div>
    <div class="summary-card">
      <span>Contractors</span>
      <strong>${contractors.length}</strong>
    </div>
  `;

  document.querySelector("#contractorChart").innerHTML = data
    .map(item => {
      const width = Math.round((item.open / maxOpen) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(item.contractor)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${width}%"></div>
          </div>
          <div class="bar-value">${item.open}</div>
        </div>
      `;
    })
    .join("");
}

function getProcessIndex(stage) {
  return processStages.indexOf(stage);
}

function moveRequestToNextProcess(request) {
  const currentIndex = getProcessIndex(request.processStage);
  const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, processStages.length - 1);
  request.processStage = processStages[nextIndex];
  request.status = nextIndex === processStages.length - 1 ? "Afgerond" : "In proces";
}

function moveProcessBack() {
  const current = getCurrentRequest();
  if (!current) return;

  if (!isSuperAdmin()) {
    alert("Alleen SuperAdmin kan een processtap terugzetten.");
    return;
  }

  saveCurrentForm();
  const currentIndex = getProcessIndex(current.processStage);
  const previousIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
  current.processStage = processStages[previousIndex];
  current.status = "In proces";
  current.laatsteGebruiker = "planner";
  current.laatsteWijziging = new Date().toISOString().slice(0, 10);
  saveRequests();
  renderInbox();
  renderDashboard();
  loadCurrentForm();
}

function toggleVisibleRows(event) {
  const checked = event.target.checked;
  const start = (state.page - 1) * state.pageSize;
  const visible = getFilteredRequests().slice(0, 1000).slice(start, start + state.pageSize);

  visible.forEach(request => {
    if (checked) {
      state.selectedIds.add(request.id);
    } else {
      state.selectedIds.delete(request.id);
    }
  });
  prepareQueueFromInbox();
  renderInbox();
  loadCurrentForm();
  formView.classList.toggle("active", state.selectedQueue.length > 0);
}

function hideInlineForm() {
  state.selectedIds.clear();
  state.selectedQueue = [];
  state.currentQueueIndex = 0;
  renderInbox();
  renderDashboard();
  formView.classList.remove("active");
}

function prepareQueueFromInbox() {
  if (state.selectedIds.size) {
    state.selectedQueue = state.requests.filter(request => state.selectedIds.has(request.id));
  } else {
    state.selectedQueue = getFilteredRequests().slice(0, 1000);
  }
  state.currentQueueIndex = Math.min(state.currentQueueIndex, Math.max(0, state.selectedQueue.length - 1));
}

function loadCurrentForm() {
  const current = getCurrentRequest();
  const queueInfo = document.querySelector("#queueInfo");

  if (!current) {
    form.reset();
    queueInfo.textContent = "Geen aanvraag geselecteerd";
    document.querySelector("#surveyPanel").classList.add("hidden");
    document.querySelector("#surveyMailPreview").classList.add("hidden");
    form.querySelectorAll("input, select, button[type='submit']").forEach(element => {
      element.disabled = element.name !== "";
    });
    document.querySelector("#previousRequest").disabled = true;
    return;
  }

  form.querySelectorAll("input, select, button").forEach(element => {
    element.disabled = false;
  });

  queueInfo.textContent = state.selectedIds.size
    ? `Geselecteerde aanvraag ${state.currentQueueIndex + 1} van ${state.selectedQueue.length || 1}`
    : `Inbox aanvraag ${state.currentQueueIndex + 1} van ${state.selectedQueue.length || 1}`;
  setField("aanvraagnr", current.id);
  setField("soortAanvraag", "MIG");
  setField("aansluitnrReadonly", current.aansluitnr);
  setField("aanvraagdatum", getInboxDate(current));
  setField("aansluitadres", current.aansluitadres || current.adres);
  setField("debiteurnr", getInternetNumber(current));
  setField("processStage", current.processStage);
  setField("surveyDate", current.surveyDate);
  setField("surveyTime", current.surveyTime);
  setField("naamDebiteur", current.naamDebiteur);
  setField("contactnr", current.contactnr);
  setField("contactnaam", current.contactnaam);

  [
    ...extraNumberFields,
    "aansluitnummerNieuw",
    "opmerking"
  ].forEach(name => setField(name, current[name]));

  document.querySelector("#previousRequest").disabled = !isSuperAdmin() || getProcessIndex(current.processStage) <= 0;
  document.querySelector("#surveyPanel").classList.toggle("hidden", current.processStage !== "Survey");
  document.querySelector("#surveyMailPreview").classList.add("hidden");
  lastProcessMail = null;
}

function setField(name, value = "") {
  const field = form.elements[name];
  if (field) field.value = value || "";
}

function getCurrentRequest() {
  if (state.selectedQueue.length) return state.selectedQueue[state.currentQueueIndex];
  return getFilteredRequests()[0] || state.requests[0] || null;
}

function getInboxDate(request) {
  return request.mutatie || request.aanvraagdatum || request.laatsteWijziging || "";
}

function getInternetNumber(request) {
  const aansluitnr = String(request.aansluitnr || "").trim();
  return aansluitnr ? `BB${aansluitnr}` : "";
}

function saveCurrentForm() {
  const current = getCurrentRequest();
  if (!current) return;

  [
    ...extraNumberFields,
    "aansluitnummerNieuw",
    "contactnr",
    "contactnaam",
    "surveyDate",
    "surveyTime",
    "opmerking"
  ].forEach(name => {
    if (form.elements[name]) current[name] = form.elements[name].value.trim();
  });

  const index = state.requests.findIndex(request => request.id === current.id);
  if (index >= 0) state.requests[index] = current;
  saveRequests();
}

async function completeCurrentRequest(event) {
  event.preventDefault();
  saveCurrentForm();

  const current = getCurrentRequest();
  if (current) {
    const completedStage = current.processStage || "";
    if (completedStage === "Survey") {
      if (!current.surveyDate || !current.surveyTime) {
        alert("Vul eerst de Survey uitvoerdatum en uitvoertijd in.");
        return;
      }
    }

    if (!(await openProcessEmail(current, completedStage))) return;

    moveRequestToNextProcess(current);
    current.laatsteGebruiker = "planner";
    current.laatsteWijziging = new Date().toISOString().slice(0, 10);
  }
  saveRequests();
  renderInbox();
  renderDashboard();
  loadCurrentForm();
  alert(`Werkorder staat nu op processtap: ${current.processStage}.`);
}

async function openProcessEmail(request, completedStage) {
  const email = state.contractorEmails[request.contractor] || "";
  if (!email) {
    alert(`Er is nog geen e-mailadres ingesteld voor ${request.contractor}. SuperAdmin kan dit bij Users invullen.`);
    return false;
  }

  const nextStage = getNextProcessStage(completedStage);
  const subject = `Proces afgemeld: ${completedStage} - werkorder ${request.id || request.aansluitnr}`;
  const bodyLines = [
    "Beste,",
    "",
    "De volgende processtap is afgemeld.",
    "",
    `Werkorder: ${request.id || request.aansluitnr || ""}`,
    `Contractor: ${request.contractor || ""}`,
    `Afgemelde processtap: ${completedStage}`,
    `Volgende processtap: ${nextStage}`,
    `Aansluitnr: ${request.aansluitnr || ""}`,
    `Internet nummer: ${request.debiteurnr || ""}`,
    `Klant naam: ${request.naamDebiteur || ""}`,
    `Adres: ${request.aansluitadres || request.adres || ""}`,
  ];

  if (request.surveyDate || request.surveyTime) {
    bodyLines.push(`Survey datum: ${request.surveyDate || ""}`);
    bodyLines.push(`Survey tijd: ${request.surveyTime || ""}`);
  }

  bodyLines.push("", "Met vriendelijke groet,");

  lastProcessMail = { email, subject, body: bodyLines.join("\n") };
  showProcessMailPreview(lastProcessMail);

  if (await sendMailThroughBackend(lastProcessMail)) {
    alert("De e-mail is automatisch verstuurd.");
    return true;
  }

  openMailDraft(lastProcessMail);
  alert("Automatisch versturen is niet beschikbaar. De e-mail is klaargezet in je mailprogramma. Klik daar nog op Verzenden om de mail echt te versturen.");
  return true;
}

async function sendMailThroughBackend(mail) {
  if (!window.location.protocol.startsWith("http")) return false;

  try {
    const response = await fetch("/api/send-process-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mail)
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

function getNextProcessStage(stage) {
  const index = getProcessIndex(stage);
  if (index < 0) return "";
  return processStages[Math.min(index + 1, processStages.length - 1)];
}

function openMailDraft(mail) {
  const mailto = `mailto:${encodeURIComponent(mail.email)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
  window.location.href = mailto;
}

function showProcessMailPreview(mail) {
  document.querySelector("#surveyMailNotice").textContent =
    `Conceptmail voor ${mail.email}. Als je mailprogramma niet opent, kopieer de tekst hieronder handmatig.`;
  document.querySelector("#surveyMailBody").value = `Onderwerp: ${mail.subject}\n\n${mail.body}`;
  document.querySelector("#surveyMailPreview").classList.remove("hidden");
}

function copyProcessMailText() {
  const text = document.querySelector("#surveyMailBody").value;
  if (!text) return;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => alert("E-mailtekst gekopieerd."));
    return;
  }

  document.querySelector("#surveyMailBody").select();
  document.execCommand("copy");
  alert("E-mailtekst gekopieerd.");
}

function importFile(event) {
  if (!isSuperAdmin()) {
    alert("Alleen SuperAdmin kan de inbox bijwerken via upload.");
    event.target.value = "";
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = loadEvent => {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const rows = isCsv
      ? parseCsv(new TextDecoder().decode(loadEvent.target.result))
      : readExcelRows(loadEvent.target.result);
    const imported = rows.map(normalizeRow).filter(request => request.id);
    if (!imported.length) {
      alert("Geen geldige aanvragen gevonden in het bestand.");
      return;
    }

    const mode = document.querySelector("#uploadMode").value;
    if (mode === "replace") {
      if (!confirm("Weet je zeker dat je de gehele inbox wilt vervangen met dit bestand?")) return;
      state.requests = imported;
    } else {
      state.requests = mergeRequests(state.requests, imported);
    }

    state.selectedIds.clear();
    state.selectedQueue = [];
    state.currentQueueIndex = 0;
    saveRequests();
    renderInbox();
    renderDashboard();
    formView.classList.remove("active");
    alert(mode === "replace"
      ? `Inbox vervangen met ${imported.length} aanvraag/aanvragen.`
      : `${imported.length} aanvraag/aanvragen toegevoegd of bijgewerkt.`);
    return;
    alert(`${imported.length} aanvragen geïmporteerd of bijgewerkt.`);
  };
  reader.readAsArrayBuffer(file);
  event.target.value = "";
}

function readExcelRows(data) {
  if (!window.XLSX) {
    alert("Excel upload is nog niet beschikbaar. Controleer je internetverbinding of upload een CSV-bestand.");
    return [];
  }

  const workbook = XLSX.read(data, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows
    .filter(values => values.some(value => value.trim()))
    .map(values =>
      headers.reduce((record, header, index) => {
        record[header] = values[index] || "";
        return record;
      }, {})
    );
}

function normalizeRow(row) {
  const findKey = (...names) =>
    Object.keys(row).find(key => names.map(cleanKey).includes(cleanKey(key)));
  const getRaw = (...names) => {
    for (const name of names) {
      const match = findKey(name);
      const value = match ? row[match] : "";
      if (value !== null && value !== undefined && String(value).trim() !== "") return value;
    }
    return "";
  };
  const get = (...names) => {
    const value = getRaw(...names);
    return value === null || value === undefined ? "" : String(value).trim();
  };
  const getDate = (...names) => formatDateValue(getRaw(...names));

  const aansluitnr = get("Aansluitnr", "Aansluitnummer", "Aansluitnr.");
  const id = get("Aanvraagnr", "Aanvraagnummer", "ID") || aansluitnr;
  const contractor = normalizeContractor(get("Contractor", "Aannemer"));
  const processStage = normalizeProcessStage(get("Processtap", "Proces stap", "Process", "Process stage")) || (contractor ? processStages[0] : "");

  return {
    id,
    aansluitnr,
    dienst: get("Dienst"),
    mutatie: getDate("Mutatie"),
    debiteurnr: get("Internet nummer", "Internetnummer", "Debiteurnr", "Debiteur") || (aansluitnr ? `BB${aansluitnr}` : ""),
    naamDebiteur: get("Naam debiteur", "Naam Debiteur"),
    aangeslotene: get("Aangeslotene"),
    naamAangeslotene: get("Naam aangeslotene", "Naam Aangeslotene"),
    adres: get("Adres", "Aansluitadres"),
    status: get("Status"),
    contractor,
    processStage,
    surveyDate: getDate("Survey datum", "Survey uitvoerdatum", "Uitvoerdatum"),
    surveyTime: get("Survey tijd", "Survey uitvoertijd", "Uitvoertijd"),
    laatsteGebruiker: get("Laatste gebruiker"),
    laatsteWijziging: getDate("Laatste wijziging"),
    soortAanvraag: "MIG",
    aanvraagdatum: getDate("Aanvraagdatum", "Mutatie", "Laatste wijziging"),
    aansluitadres: get("Aansluitadres", "Adres"),
    contactnr: get("IP adress", "IP adres", "IP address"),
    contactnaam: get("IP adress extra", "IP adres extra", "IP address extra"),
    fiberNummer: get("Aansluitnummer/Voice 1", "Aansluitnummer Voice 1", "Voice 1"),
    fiberAccessTerminal: get("Password 1"),
    olt: get("Aansluitnummer/Voice 2", "Aansluitnummer Voice 2", "Voice 2"),
    paalNumber: get("Password 2"),
    odfPositie: get("Aansluitnummer/Voice 3", "Aansluitnummer Voice 3", "Voice 3"),
    paalStraat: get("Password 3"),
    closure: get("Aansluitnummer/Voice 4", "Aansluitnummer Voice 4", "Voice 4"),
    paalLongitude: get("Password 4"),
    geprojecteerdAdres: get("Aansluitnummer/Voice 5", "Aansluitnummer Voice 5", "Voice 5"),
    paalLatitude: get("Password 5"),
    aansluitnummerNieuw: get("Nieuw Aansluitnummer"),
    opmerking: get("Opmerking")
  };
}

function normalizeContractor(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return contractors.find(contractor => contractor.toUpperCase() === normalized) || "";
}

function normalizeProcessStage(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return processStages.find(stage => stage.toUpperCase() === normalized) || "";
}

function cleanKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatDateValue(value) {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    const [first, second, year] = text.split("/");
    return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 90000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      return new Date(excelEpoch + serial * 86400000).toISOString().slice(0, 10);
    }
  }

  return text;
}

function mergeRequests(existing, imported) {
  const byId = new Map(existing.map(request => [request.id, request]));
  imported.forEach(request => {
    byId.set(request.id, { ...byId.get(request.id), ...request });
  });
  return Array.from(byId.values());
}

function exportCsv() {
  saveCurrentForm();
  const headers = [
    "Aanvraagnr",
    "Aansluitnr",
    "Dienst",
    "Mutatie",
    "Internet nummer",
    "Naam debiteur",
    "Aangeslotene",
    "Naam aangeslotene",
    "Adres",
    "Status",
    "Contractor",
    "Processtap",
    "Survey datum",
    "Survey tijd",
    "Laatste gebruiker",
    "Laatste wijziging",
    "Soort Aanvraag",
    "Aanvraagdatum",
    "Aansluitadres",
    "IP adress",
    "IP adress extra",
    "Aansluitnummer/Voice 1",
    "Password 1",
    "Aansluitnummer/Voice 2",
    "Password 2",
    "Aansluitnummer/Voice 3",
    "Password 3",
    "Aansluitnummer/Voice 4",
    "Password 4",
    "Aansluitnummer/Voice 5",
    "Password 5",
    "Nieuw Aansluitnummer",
    "Opmerking"
  ];
  const rows = getFilteredRequests().map(request => [
    request.id,
    request.aansluitnr,
    request.dienst,
    formatDateValue(request.mutatie),
    getInternetNumber(request),
    request.naamDebiteur,
    request.aangeslotene,
    request.naamAangeslotene,
    request.adres,
    request.status,
    request.contractor,
    request.processStage,
    request.surveyDate,
    request.surveyTime,
    request.laatsteGebruiker,
    formatDateValue(request.laatsteWijziging),
    "MIG",
    formatDateValue(getInboxDate(request)),
    request.aansluitadres || request.adres,
    request.contactnr,
    request.contactnaam,
    request.fiberNummer,
    request.fiberAccessTerminal,
    request.olt,
    request.paalNumber,
    request.odfPositie,
    request.paalStraat,
    request.closure,
    request.paalLongitude,
    request.geprojecteerdAdres,
    request.paalLatitude,
    request.aansluitnummerNieuw,
    request.opmerking
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aanvragen-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
