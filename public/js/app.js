"use strict";

/* =========================================================
   SPORTDASH PREMIUM — APP.JS
   Dashboard frontend aligned with views/app.html
   ========================================================= */

const state = {
    user: null,
    matches: [],
    filteredMatches: [],
    currentView: "home",
    selectedStatus: "all",
    selectedLeague: "all",
    search: "",
    favorites: JSON.parse(localStorage.getItem("sportdash_favorites") || "[]")
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const el = {
    sidebar: $("#sidebar"),
    menuButton: $("#menu-button"),
    overlay: $("#mobile-overlay"),
    usersNav: $("#users-nav"),
    sidebarAvatar: $("#sidebar-avatar"),
    sidebarName: $("#sidebar-name"),
    sidebarRole: $("#sidebar-role"),
    topAvatar: $("#top-avatar"),
    accessText: $("#access-text"),
    subscriptionStatus: $("#subscription-status"),
    subscriptionExpiry: $("#subscription-expiry"),
    daysLeft: $("#days-left"),
    logout: $("#logout-button"),
    heroLive: $("#hero-live"),
    homeMatches: $("#home-matches"),
    homeChannels: $("#home-channels"),
    allMatches: $("#all-matches"),
    matchSearch: $("#match-search"),
    statusFilters: $("#match-status-filters"),
    leagueFilters: $("#league-filters"),
    channelList: $("#channel-list"),
    channelCount: $("#channel-count"),
    player: $("#live-player"),
    playerPlaceholder: $("#player-placeholder"),
    playerLoading: $("#player-loading"),
    playerError: $("#player-error"),
    playerTitle: $("#player-title"),
    playerCountry: $("#player-country"),
    favorites: $("#favorite-channels"),
    openCreateUser: $("#open-create-user"),
    userModal: $("#user-modal"),
    closeUserModal: $("#close-user-modal"),
    createUserForm: $("#create-user-form"),
    createUserMessage: $("#create-user-message"),
    usersTable: $("#users-table"),
    statActive: $("#stat-active"),
    statExpiring: $("#stat-expiring"),
    statExpired: $("#stat-expired")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    setupNavigation();
    setupAccountActions();
    setupAdminActions();
    setupMatchFilters();
    setupChannelFilters();
    setupMobileMenu();

    await loadCurrentUser();
    await loadMatches();
    renderChannels();
    renderFavorites();
}

/* =========================================================
   AUTH / ACCOUNT
   ========================================================= */

async function loadCurrentUser() {
    try {
        const response = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.replace("/");
            }
            return;
        }

        const data = await response.json();

        if (!data.success || !data.authenticated || !data.user) {
            window.location.replace("/");
            return;
        }

        state.user = data.user;
        renderUser(data.user);
    } catch (error) {
        console.error("SportDash: no se pudo obtener la sesión:", error);
    }
}

function renderUser(user) {
    const displayName = user.displayName || user.username || "Usuario";
    const username = user.username || "";
    const isAdmin = user.role === "admin";
    const roleLabel = isAdmin ? "Administrador" : "Miembro";
    const avatar = getInitials(displayName || username);

    setText(el.sidebarName, displayName);
    setText(el.sidebarRole, roleLabel);
    setText(el.sidebarAvatar, avatar);
    setText(el.topAvatar, avatar);
    setText(el.accessText, isAdmin ? "Administrador" : "Acceso activo");
    setText(el.subscriptionStatus, isAdmin ? "Acceso administrador" : "Acceso activo");

    if (el.usersNav) {
        el.usersNav.classList.toggle("hidden", !isAdmin);
    }

    if (el.subscriptionExpiry) {
        if (isAdmin || !user.expiresAt) {
            el.subscriptionExpiry.textContent = isAdmin
                ? "Acceso permanente de administrador"
                : "Vencimiento: —";
        } else {
            el.subscriptionExpiry.textContent = `Vencimiento: ${formatDate(user.expiresAt)}`;
        }
    }

    if (el.daysLeft) {
        if (isAdmin || !user.expiresAt) {
            el.daysLeft.textContent = "∞";
        } else {
            const days = Math.max(0, Math.ceil((new Date(user.expiresAt) - Date.now()) / 86400000));
            el.daysLeft.textContent = String(days);
        }
    }
}

function setupAccountActions() {
    el.logout?.addEventListener("click", logout);
}

async function logout() {
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: { Accept: "application/json" }
        });
    } finally {
        localStorage.removeItem("sportdash_favorites");
        window.location.replace("/");
    }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
    $$('[data-view]').forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            const view = item.dataset.view;

            if (view === "users" && state.user?.role !== "admin") {
                return;
            }

            showView(view);
            history.replaceState(null, "", item.getAttribute("href") || "#inicio");
        });
    });

    $$('[data-view-link]').forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            showView(item.dataset.viewLink);
        });
    });

    el.heroLive?.addEventListener("click", () => showView("live"));
}

function showView(viewName) {
    const validViews = ["home", "matches", "live", "favorites", "users"];
    if (!validViews.includes(viewName)) return;
    if (viewName === "users" && state.user?.role !== "admin") return;

    state.currentView = viewName;

    $$(".view").forEach(view => {
        const active = view.id === `view-${viewName}`;
        view.classList.toggle("is-active", active);
        view.classList.toggle("is-visible", active);
    });

    $$(".nav-item[data-view]").forEach(item => {
        item.classList.toggle("is-active", item.dataset.view === viewName);
    });

    const titles = {
        home: "Inicio",
        matches: "Partidos",
        live: "TV en vivo",
        favorites: "Favoritos",
        users: "Usuarios"
    };

    setText($("#view-title"), titles[viewName]);
    el.sidebar?.classList.remove("is-open");
    el.overlay?.classList.remove("is-visible");
    el.menuButton?.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (viewName === "users" && state.user?.role === "admin") {
        loadUsers();
    }
}

function setupMobileMenu() {
    el.menuButton?.addEventListener("click", () => {
        const open = el.sidebar?.classList.toggle("is-open");
        el.overlay?.classList.toggle("is-visible", open);
        el.menuButton?.setAttribute("aria-expanded", String(Boolean(open)));
    });

    el.overlay?.addEventListener("click", () => {
        el.sidebar?.classList.remove("is-open");
        el.overlay?.classList.remove("is-visible");
        el.menuButton?.setAttribute("aria-expanded", "false");
    });
}

/* =========================================================
   MATCHES
   ========================================================= */

async function loadMatches() {
    try {
        const response = await fetch(`/api/matches?date=${encodeURIComponent(getArgentinaDate())}`, {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        state.matches = Array.isArray(data.matches) ? data.matches : [];
        applyMatchFilters();
    } catch (error) {
        console.error("SportDash: error cargando partidos:", error);
        state.matches = [];
        state.filteredMatches = [];
        renderMatches();
    }
}

function setupMatchFilters() {
    el.matchSearch?.addEventListener("input", event => {
        state.search = event.target.value.trim().toLowerCase();
        applyMatchFilters();
    });

    el.statusFilters?.addEventListener("click", event => {
        const button = event.target.closest("[data-status-filter]");
        if (!button) return;
        state.selectedStatus = button.dataset.statusFilter;
        renderStatusFilters();
        applyMatchFilters();
    });

    el.leagueFilters?.addEventListener("click", event => {
        const button = event.target.closest("[data-league-filter]");
        if (!button) return;
        state.selectedLeague = button.dataset.leagueFilter;
        renderLeagueFilters();
        applyMatchFilters();
    });
}

function applyMatchFilters() {
    state.filteredMatches = state.matches.filter(match => {
        const status = normalizeStatus(match);
        const league = String(match.league || "");
        const haystack = [match.home, match.away, match.league, match.country]
            .filter(Boolean).join(" ").toLowerCase();

        if (state.selectedStatus !== "all" && status !== state.selectedStatus) return false;
        if (state.selectedLeague !== "all" && league !== state.selectedLeague) return false;
        if (state.search && !haystack.includes(state.search)) return false;
        return true;
    });

    renderStatusFilters();
    renderLeagueFilters();
    renderMatches();
}

function renderStatusFilters() {
    if (!el.statusFilters) return;
    const filters = [
        ["all", "Todos"],
        ["live", "En vivo"],
        ["upcoming", "Próximos"],
        ["finished", "Finalizados"]
    ];

    el.statusFilters.innerHTML = filters.map(([value, label]) => `
        <button type="button" class="match-filter ${state.selectedStatus === value ? "is-active" : ""}" data-status-filter="${value}">${label}</button>
    `).join("");
}

function renderLeagueFilters() {
    if (!el.leagueFilters) return;
    const leagues = [...new Set(state.matches.map(match => match.league).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), "es"));

    if (state.selectedLeague !== "all" && !leagues.includes(state.selectedLeague)) {
        state.selectedLeague = "all";
    }

    el.leagueFilters.innerHTML = [
        `<button type="button" class="match-filter ${state.selectedLeague === "all" ? "is-active" : ""}" data-league-filter="all">Todas</button>`,
        ...leagues.map(league => `<button type="button" class="match-filter ${state.selectedLeague === league ? "is-active" : ""}" data-league-filter="${escapeAttribute(league)}">${escapeHTML(league)}</button>`)
    ].join("");
}

function renderMatches() {
    const cards = state.filteredMatches.map(createMatchCard).join("");

    if (el.allMatches) {
        el.allMatches.innerHTML = cards || emptyMessage("No encontramos partidos con esos filtros.");
    }

    if (el.homeMatches) {
        const upcoming = state.matches.filter(match => normalizeStatus(match) === "upcoming").slice(0, 6);
        el.homeMatches.innerHTML = upcoming.length
            ? upcoming.map(createMatchCard).join("")
            : emptyMessage("No hay próximos eventos disponibles.");
    }
}

function createMatchCard(match) {
    const status = normalizeStatus(match);
    const statusLabel = status === "live" ? "EN VIVO" : status === "finished" ? "FINALIZADO" : "PRÓXIMO";
    const home = match.home || "Local";
    const away = match.away || "Visitante";
    const scoreHome = match.scoreHome ?? "-";
    const scoreAway = match.scoreAway ?? "-";

    return `
        <article class="match-card ${status === "live" ? "is-live" : ""}">
            <div class="match-card__top">
                <div class="league-info">
                    <span class="league-info__name">${escapeHTML(match.league || "Fútbol")}</span>
                    <span class="league-info__country">${escapeHTML(match.country || "Internacional")}</span>
                </div>
                <span class="match-status match-status--${status}">${statusLabel}</span>
            </div>
            <div class="match-card__teams">
                <div class="team"><span class="team__name">${escapeHTML(home)}</span></div>
                <div class="match-score">
                    <strong>${escapeHTML(String(scoreHome))} : ${escapeHTML(String(scoreAway))}</strong>
                    <span class="match-score__time">${escapeHTML(match.time || "--:--")}</span>
                </div>
                <div class="team"><span class="team__name">${escapeHTML(away)}</span></div>
            </div>
            <div class="match-card__bottom">
                <span class="match-card__date">${formatMatchDate(match.date)}</span>
                <button type="button" class="match-card__action" data-match-id="${escapeAttribute(match.id)}">Detalles <span>→</span></button>
            </div>
        </article>
    `;
}

/* =========================================================
   CHANNELS / PLAYER
   ========================================================= */

function renderChannels() {
    if (el.channelCount) el.channelCount.textContent = "0";
    if (el.channelList) {
        el.channelList.innerHTML = emptyMessage("No hay canales configurados todavía.");
    }
    if (el.homeChannels) {
        el.homeChannels.innerHTML = emptyMessage("Los canales aparecerán cuando estén configurados.");
    }
}

function renderFavorites() {
    if (!el.favorites) return;
    el.favorites.innerHTML = emptyMessage("Todavía no tenés canales favoritos.");
}

function setupChannelFilters() {
    $$("[data-country-filter]").forEach(button => {
        button.addEventListener("click", () => {
            $$("[data-country-filter]").forEach(item => item.classList.remove("is-active"));
            button.classList.add("is-active");
        });
    });
}

/* =========================================================
   ADMIN USERS
   ========================================================= */

function setupAdminActions() {
    el.openCreateUser?.addEventListener("click", () => openUserModal());
    el.closeUserModal?.addEventListener("click", closeUserModal);

    el.userModal?.addEventListener("click", event => {
        if (event.target === el.userModal) closeUserModal();
    });

    el.createUserForm?.addEventListener("submit", createUser);

    el.usersTable?.addEventListener("click", async event => {
        const button = event.target.closest("button[data-user-action]");
        if (!button) return;

        const id = button.dataset.userId;
        const action = button.dataset.userAction;
        if (!id) return;

        if (action === "renew") await adminRequest(`/api/admin/users/${encodeURIComponent(id)}/renew`, "POST");
        if (action === "toggle") {
            const status = button.dataset.status === "active" ? "disabled" : "active";
            await adminRequest(`/api/admin/users/${encodeURIComponent(id)}/status`, "PATCH", { status });
        }

        await loadUsers();
    });
}

async function loadUsers() {
    if (!el.usersTable || state.user?.role !== "admin") return;

    try {
        const response = await fetch("/api/admin/users", {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const users = Array.isArray(data.users) ? data.users : [];

        const active = users.filter(user => user.status === "active" && Number(user.daysRemaining) > 0).length;
        const expired = users.filter(user => Number(user.daysRemaining) <= 0).length;
        const expiring = users.filter(user => Number(user.daysRemaining) > 0 && Number(user.daysRemaining) <= 7).length;

        setText(el.statActive, active);
        setText(el.statExpired, expired);
        setText(el.statExpiring, expiring);

        el.usersTable.innerHTML = users.length ? users.map(user => `
            <tr>
                <td><strong>${escapeHTML(user.displayName || user.username)}</strong><small>${escapeHTML(user.username)}</small></td>
                <td>${escapeHTML(String(user.maxDevices ?? 2))}</td>
                <td><span class="status-badge">${user.status === "active" && Number(user.daysRemaining) > 0 ? "Activo" : "Vencido / deshabilitado"}</span></td>
                <td>${formatDate(user.expiresAt)}</td>
                <td>${escapeHTML(String(user.daysRemaining ?? 0))} días</td>
                <td class="table-actions">
                    <button type="button" data-user-action="renew" data-user-id="${escapeAttribute(user.id)}">Renovar</button>
                    <button type="button" data-user-action="toggle" data-user-id="${escapeAttribute(user.id)}" data-status="${escapeAttribute(user.status)}">${user.status === "active" ? "Deshabilitar" : "Activar"}</button>
                </td>
            </tr>
        `).join("") : `<tr><td colspan="6">No hay usuarios creados.</td></tr>`;
    } catch (error) {
        console.error("SportDash: error cargando usuarios:", error);
        el.usersTable.innerHTML = `<tr><td colspan="6">No se pudo cargar la lista de usuarios.</td></tr>`;
    }
}

async function createUser(event) {
    event.preventDefault();
    if (state.user?.role !== "admin") return;

    const payload = {
        displayName: $("#new-display-name")?.value.trim() || "",
        username: $("#new-username")?.value.trim() || "",
        maxDevices: Number($("#new-max-devices")?.value || 2),
        password: $("#new-password")?.value || ""
    };

    setText(el.createUserMessage, "Creando acceso…");

    try {
        const response = await fetch("/api/admin/users", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "No se pudo crear el usuario.");

        el.createUserForm.reset();
        $("#new-max-devices").value = "2";
        setText(el.createUserMessage, "Usuario creado correctamente.");
        setTimeout(() => {
            closeUserModal();
            loadUsers();
        }, 500);
    } catch (error) {
        setText(el.createUserMessage, error.message);
    }
}

async function adminRequest(url, method, body) {
    try {
        const response = await fetch(url, {
            method,
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "La operación no pudo completarse.");
    } catch (error) {
        console.error("SportDash:", error);
        alert(error.message);
    }
}

function openUserModal() {
    if (!el.userModal || state.user?.role !== "admin") return;
    el.userModal.classList.remove("hidden");
    el.userModal.classList.add("is-open");
    el.userModal.setAttribute("aria-hidden", "false");
    $("#new-username")?.focus();
}

function closeUserModal() {
    if (!el.userModal) return;
    el.userModal.classList.add("hidden");
    el.userModal.classList.remove("is-open");
    el.userModal.setAttribute("aria-hidden", "true");
    setText(el.createUserMessage, "");
}

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeStatus(match) {
    const status = String(match?.status || match?.fixtureStatus || "").toLowerCase();
    if (["live", "1h", "2h", "et", "ht", "bt", "p"].includes(status)) return "live";
    if (["finished", "ft", "aet", "pen"].includes(status)) return "finished";
    if (["postponed"].includes(status)) return "postponed";
    if (["cancelled", "canceled"].includes(status)) return "cancelled";
    if (["upcoming", "scheduled", "ns", "tbd"].includes(status)) return "upcoming";
    return "upcoming";
}

function getArgentinaDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatMatchDate(value) {
    if (!value) return "Fecha no disponible";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
}

function getInitials(value) {
    const parts = String(value || "U").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join("") || "U";
}

function emptyMessage(message) {
    return `<div class="empty-state"><h3>${escapeHTML(message)}</h3></div>`;
}

function setText(element, value) {
    if (element) element.textContent = value ?? "";
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHTML(value);
}

window.SportDash = {
    state,
    showView,
    loadMatches,
    loadCurrentUser,
    loadUsers
};
