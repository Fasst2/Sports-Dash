"use strict";

/* =========================================================
   SPORTDASH PREMIUM
   APP.JS
   ========================================================= */

const state = {
    matches: [],
    filteredMatches: [],
    selectedDate: getArgentinaDate(),
    selectedLeague: "all",
    search: "",
    currentView: "home",
    selectedMatch: null
};


/* =========================================================
   DOM
   ========================================================= */

const elements = {
    sidebar: document.getElementById("sidebar"),
    mobileMenu: document.getElementById("mobile-menu"),

    pageTitle: document.getElementById("page-title"),
    currentDate: document.getElementById("current-date"),

    refreshButton: document.getElementById("refresh-button"),

    dateFilter: document.getElementById("date-filter"),
    leagueFilter: document.getElementById("league-filter"),
    searchFilter: document.getElementById("search-filter"),

    matchesGrid: document.getElementById("matches-grid"),
    matchesGridFull: document.getElementById("matches-grid-full"),
    matchesGridLive: document.getElementById("matches-grid-live"),

    loadingState: document.getElementById("loading-state"),
    emptyState: document.getElementById("empty-state"),
    errorState: document.getElementById("error-state"),
    errorMessage: document.getElementById("error-message"),

    retryButton: document.getElementById("retry-button"),

    statTotal: document.getElementById("stat-total"),
    statLive: document.getElementById("stat-live"),
    statUpcoming: document.getElementById("stat-upcoming"),
    statFinished: document.getElementById("stat-finished"),

    modal: document.getElementById("match-modal"),
    modalClose: document.getElementById("modal-close"),

    modalLeague: document.getElementById("modal-league"),
    modalTitle: document.getElementById("modal-title"),

    modalHome: document.getElementById("modal-home"),
    modalAway: document.getElementById("modal-away"),

    modalHomeLogo: document.getElementById("modal-home-logo"),
    modalAwayLogo: document.getElementById("modal-away-logo"),

    modalStatus: document.getElementById("modal-status"),
    modalScore: document.getElementById("modal-score"),
    modalTime: document.getElementById("modal-time"),
    modalCountry: document.getElementById("modal-country"),

    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toast-message")
};


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {

    setupNavigation();
    setupFilters();
    setupModal();
    setupMobileMenu();

    updateCurrentDate();

    if (elements.dateFilter) {
        elements.dateFilter.value = state.selectedDate;
    }

    await loadMatches();
}


/* =========================================================
   DATE
   ========================================================= */

function getArgentinaDate() {

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "America/Argentina/Buenos_Aires",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(new Date());
}


function updateCurrentDate() {

    if (!elements.currentDate) {
        return;
    }

    const date = new Date();

    elements.currentDate.textContent =
        new Intl.DateTimeFormat(
            "es-AR",
            {
                timeZone: "America/Argentina/Buenos_Aires",
                weekday: "short",
                day: "numeric",
                month: "short"
            }
        ).format(date);
}


/* =========================================================
   API
   ========================================================= */

async function loadMatches() {

    setLoading(true);
    hideError();

    if (elements.refreshButton) {
        elements.refreshButton.classList.add("is-loading");
    }

    try {

        const url =
            `/api/matches?date=${encodeURIComponent(
                state.selectedDate
            )}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `El servidor respondió con HTTP ${response.status}.`
            );
        }

        const data = await response.json();

        if (!data || data.success !== true) {
            throw new Error(
                data?.error ||
                "La API no devolvió una respuesta válida."
            );
        }

        state.matches =
            Array.isArray(data.matches)
                ? data.matches
                : [];

        buildLeagueFilter();

        applyFilters();

        updateStats();

    } catch (error) {

        console.error(
            "SportDash: error cargando partidos:",
            error
        );

        state.matches = [];
        state.filteredMatches = [];

        renderMatches();

        showError(
            error?.message ||
            "No se pudieron cargar los partidos."
        );

    } finally {

        setLoading(false);

        if (elements.refreshButton) {
            elements.refreshButton.classList.remove(
                "is-loading"
            );
        }
    }
}


/* =========================================================
   FILTERS
   ========================================================= */

function setupFilters() {

    elements.dateFilter?.addEventListener(
        "change",
        async (event) => {

            state.selectedDate =
                event.target.value ||
                getArgentinaDate();

            await loadMatches();
        }
    );


    elements.leagueFilter?.addEventListener(
        "change",
        (event) => {

            state.selectedLeague =
                event.target.value;

            applyFilters();
        }
    );


    elements.searchFilter?.addEventListener(
        "input",
        (event) => {

            state.search =
                event.target.value
                    .trim()
                    .toLowerCase();

            applyFilters();
        }
    );


    elements.refreshButton?.addEventListener(
        "click",
        () => loadMatches()
    );


    elements.retryButton?.addEventListener(
        "click",
        () => loadMatches()
    );
}


function buildLeagueFilter() {

    if (!elements.leagueFilter) {
        return;
    }

    const leagues = [
        ...new Set(
            state.matches
                .map(match => match.league)
                .filter(Boolean)
        )
    ].sort(
        (a, b) =>
            a.localeCompare(
                b,
                "es"
            )
    );

    const current =
        state.selectedLeague;

    elements.leagueFilter.innerHTML = `
        <option value="all">
            Todas las competiciones
        </option>

        ${leagues.map(
            league => `
                <option value="${escapeAttribute(league)}">
                    ${escapeHTML(league)}
                </option>
            `
        ).join("")}
    `;

    if (
        leagues.includes(current)
    ) {
        elements.leagueFilter.value =
            current;
    } else {
        state.selectedLeague = "all";
        elements.leagueFilter.value = "all";
    }
}


function applyFilters() {

    state.filteredMatches =
        state.matches.filter(
            match => {

                if (
                    state.selectedLeague !== "all" &&
                    match.league !== state.selectedLeague
                ) {
                    return false;
                }

                if (!state.search) {
                    return true;
                }

                const haystack = [
                    match.home,
                    match.away,
                    match.league,
                    match.country
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(
                    state.search
                );
            }
        );

    renderMatches();
}


/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

    const total =
        state.matches.length;

    const live =
        state.matches.filter(
            match =>
                normalizeStatus(match) === "live"
        ).length;

    const upcoming =
        state.matches.filter(
            match =>
                normalizeStatus(match) === "upcoming"
        ).length;

    const finished =
        state.matches.filter(
            match =>
                normalizeStatus(match) === "finished"
        ).length;

    setText(
        elements.statTotal,
        total
    );

    setText(
        elements.statLive,
        live
    );

    setText(
        elements.statUpcoming,
        upcoming
    );

    setText(
        elements.statFinished,
        finished
    );
}


/* =========================================================
   RENDER
   ========================================================= */

function renderMatches() {

    const html =
        state.filteredMatches
            .map(match => createMatchCard(match))
            .join("");

    if (elements.matchesGrid) {
        elements.matchesGrid.innerHTML =
            html;
    }

    if (elements.matchesGridFull) {
        elements.matchesGridFull.innerHTML =
            html;
    }

    const liveMatches =
        state.matches.filter(
            match =>
                normalizeStatus(match) === "live"
        );

    if (elements.matchesGridLive) {

        elements.matchesGridLive.innerHTML =
            liveMatches.length
                ? liveMatches
                    .map(match =>
                        createMatchCard(match)
                    )
                    .join("")
                : createNoLiveMessage();
    }


    if (
        state.filteredMatches.length === 0 &&
        state.matches.length > 0
    ) {
        showEmpty();
    } else {
        hideEmpty();
    }


    if (state.matches.length === 0) {
        showEmpty();
    }


    attachMatchEvents();
}


function createMatchCard(match) {

    const status =
        normalizeStatus(match);

    const statusLabel =
        getStatusLabel(
            match,
            status
        );

    const home =
        match.home ||
        "Local";

    const away =
        match.away ||
        "Visitante";

    const homeLogo =
        match.homeLogo ||
        "";

    const awayLogo =
        match.awayLogo ||
        "";

    const leagueLogo =
        match.leagueLogo ||
        "";

    const scoreHome =
        match.scoreHome ??
        "-";

    const scoreAway =
        match.scoreAway ??
        "-";

    const time =
        match.time ||
        "--:--";

    const matchDate =
        formatMatchDate(
            match.date
        );

    const isLive =
        status === "live";

    return `
        <article
            class="match-card ${isLive ? "is-live" : ""}"
            data-match-id="${escapeAttribute(
                match.id
            )}"
        >

            <div class="match-card__top">

                <div class="league-info">

                    ${createLogo(
                        leagueLogo,
                        match.league || "Liga",
                        "league-info__logo"
                    )}

                    <div class="league-info__text">

                        <span class="league-info__name">
                            ${escapeHTML(
                                match.league ||
                                "Fútbol"
                            )}
                        </span>

                        <span class="league-info__country">
                            ${escapeHTML(
                                match.country ||
                                "Internacional"
                            )}
                        </span>

                    </div>

                </div>

                <span
                    class="match-status match-status--${status}"
                >
                    ${escapeHTML(statusLabel)}
                </span>

            </div>


            <div class="match-card__teams">

                <div class="team">

                    ${createLogo(
                        homeLogo,
                        home,
                        "team__logo"
                    )}

                    <span class="team__name">
                        ${escapeHTML(home)}
                    </span>

                </div>


                <div class="match-score">

                    <strong>
                        ${escapeHTML(
                            String(scoreHome)
                        )}
                        :
                        ${escapeHTML(
                            String(scoreAway)
                        )}
                    </strong>

                    <span
                        class="
                            match-score__time
                            ${isLive ? "is-live" : ""}
                            ${status === "finished" ? "is-finished" : ""}
                        "
                    >
                        ${
                            isLive &&
                            match.elapsed
                                ? `${escapeHTML(
                                    String(match.elapsed)
                                )}'`
                                : escapeHTML(time)
                        }
                    </span>

                </div>


                <div class="team">

                    ${createLogo(
                        awayLogo,
                        away,
                        "team__logo"
                    )}

                    <span class="team__name">
                        ${escapeHTML(away)}
                    </span>

                </div>

            </div>


            <div class="match-card__bottom">

                <span class="match-card__date">
                    ${escapeHTML(matchDate)}
                </span>

                <button
                    type="button"
                    class="match-card__action"
                    data-match-action="${escapeAttribute(
                        match.id
                    )}"
                >
                    Detalles
                    <span>→</span>
                </button>

            </div>

        </article>
    `;
}


function createLogo(
    url,
    alt,
    className
) {

    if (!url) {

        return `
            <div
                class="${className} team__logo--fallback"
                aria-hidden="true"
            >
                ${getInitials(alt)}
            </div>
        `;
    }

    return `
        <img
            class="${className}"
            src="${escapeAttribute(url)}"
            alt="${escapeAttribute(alt)}"
            loading="lazy"
            onerror="this.style.display='none'"
        >
    `;
}


function createNoLiveMessage() {

    return `
        <div class="empty-state">

            <div class="empty-state__icon">
                ●
            </div>

            <h3>
                No hay partidos en vivo
            </h3>

            <p>
                Cuando comience un encuentro,
                aparecerá automáticamente en esta sección.
            </p>

        </div>
    `;
}


/* =========================================================
   MATCH EVENTS
   ========================================================= */

function attachMatchEvents() {

    document
        .querySelectorAll(
            "[data-match-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        const id =
                            button.dataset.matchAction;

                        openMatchById(id);
                    }
                );
            }
        );


    document
        .querySelectorAll(".match-card")
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    () => {

                        const id =
                            card.dataset.matchId;

                        openMatchById(id);
                    }
                );
            }
        );
}


function openMatchById(id) {

    const match =
        state.matches.find(
            item =>
                String(item.id) === String(id)
        );

    if (!match) {
        return;
    }

    state.selectedMatch = match;

    openMatchModal(match);
}


/* =========================================================
   MODAL
   ========================================================= */

function setupModal() {

    elements.modalClose?.addEventListener(
        "click",
        closeMatchModal
    );


    elements.modal?.querySelectorAll(
        "[data-close-modal]"
    ).forEach(
        element => {

            element.addEventListener(
                "click",
                closeMatchModal
            );
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                elements.modal?.classList.contains(
                    "is-open"
                )
            ) {
                closeMatchModal();
            }
        }
    );
}


function openMatchModal(match) {

    const status =
        normalizeStatus(match);

    const home =
        match.home ||
        "Local";

    const away =
        match.away ||
        "Visitante";

    setText(
        elements.modalLeague,
        match.league ||
        "Fútbol"
    );

    setText(
        elements.modalTitle,
        `${home} vs ${away}`
    );

    setText(
        elements.modalHome,
        home
    );

    setText(
        elements.modalAway,
        away
    );

    setText(
        elements.modalStatus,
        getStatusLabel(
            match,
            status
        )
    );

    setText(
        elements.modalScore,
        `${match.scoreHome ?? "-"} : ${match.scoreAway ?? "-"}`
    );

    setText(
        elements.modalTime,
        match.time ||
        "--:--"
    );

    setText(
        elements.modalCountry,
        `${match.country || "Internacional"} · ${formatMatchDate(match.date)}`
    );


    setImage(
        elements.modalHomeLogo,
        match.homeLogo,
        home
    );

    setImage(
        elements.modalAwayLogo,
        match.awayLogo,
        away
    );


    if (elements.modal) {

        elements.modal.classList.add(
            "is-open"
        );

        elements.modal.setAttribute(
            "aria-hidden",
            "false"
        );
    }
}


function closeMatchModal() {

    if (!elements.modal) {
        return;
    }

    elements.modal.classList.remove(
        "is-open"
    );

    elements.modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const view =
                            button.dataset.view;

                        showView(view);
                    }
                );
            }
        );
}


function showView(viewName) {

    const validViews = [
        "home",
        "matches",
        "live",
        "favorites",
        "settings"
    ];

    if (
        !validViews.includes(
            viewName
        )
    ) {
        return;
    }

    state.currentView =
        viewName;


    document
        .querySelectorAll(".view")
        .forEach(
            view => {

                view.classList.toggle(
                    "is-visible",
                    view.id ===
                    `view-${viewName}`
                );
            }
        );


    document
        .querySelectorAll(
            ".nav-item[data-view]"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "is-active",
                    item.dataset.view ===
                    viewName
                );
            }
        );


    const titles = {
        home: "Inicio",
        matches: "Partidos",
        live: "En vivo",
        favorites: "Favoritos",
        settings: "Configuración"
    };

    setText(
        elements.pageTitle,
        titles[viewName]
    );


    elements.sidebar?.classList.remove(
        "is-open"
    );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function setupMobileMenu() {

    elements.mobileMenu?.addEventListener(
        "click",
        () => {

            elements.sidebar?.classList.toggle(
                "is-open"
            );
        }
    );
}


/* =========================================================
   LOADING / STATES
   ========================================================= */

function setLoading(isLoading) {

    elements.loadingState?.classList.toggle(
        "is-hidden",
        !isLoading
    );

    if (isLoading) {

        elements.matchesGrid?.classList.add(
            "is-hidden"
        );

    } else {

        elements.matchesGrid?.classList.remove(
            "is-hidden"
        );
    }
}


function showEmpty() {

    elements.emptyState?.classList.remove(
        "is-hidden"
    );
}


function hideEmpty() {

    elements.emptyState?.classList.add(
        "is-hidden"
    );
}


function showError(message) {

    setText(
        elements.errorMessage,
        message
    );

    elements.errorState?.classList.remove(
        "is-hidden"
    );

    elements.matchesGrid?.classList.add(
        "is-hidden"
    );
}


function hideError() {

    elements.errorState?.classList.add(
        "is-hidden"
    );

    elements.matchesGrid?.classList.remove(
        "is-hidden"
    );
}


/* =========================================================
   STATUS
   ========================================================= */

function normalizeStatus(match) {

    const status =
        String(
            match?.status ||
            match?.fixtureStatus ||
            ""
        ).toLowerCase();

    if (
        status === "live" ||
        status === "1h" ||
        status === "2h" ||
        status === "et" ||
        status === "ht" ||
        status === "bt" ||
        status === "p"
    ) {
        return "live";
    }

    if (
        status === "finished" ||
        status === "ft" ||
        status === "aet" ||
        status === "pen"
    ) {
        return "finished";
    }

    if (
        status === "postponed"
    ) {
        return "postponed";
    }

    if (
        status === "cancelled" ||
        status === "canceled"
    ) {
        return "cancelled";
    }

    if (
        status === "suspended"
    ) {
        return "suspended";
    }

    if (
        status === "abandoned"
    ) {
        return "abandoned";
    }

    if (
        status === "upcoming" ||
        status === "scheduled" ||
        status === "ns" ||
        status === "tbd"
    ) {
        return "upcoming";
    }

    /*
     * Nuestro backend ya devuelve "upcoming"
     * para partidos futuros. Como fallback,
     * usamos la fecha.
     */

    if (match?.date) {

        const date =
            new Date(
                `${match.date}T${match.time || "00:00"}:00-03:00`
            );

        if (
            !Number.isNaN(
                date.getTime()
            ) &&
            date > new Date()
        ) {
            return "upcoming";
        }
    }

    return "upcoming";
}


function getStatusLabel(
    match,
    status
) {

    if (
        status === "live"
    ) {
        return "EN VIVO";
    }

    if (
        status === "finished"
    ) {
        return "FINALIZADO";
    }

    if (
        status === "postponed"
    ) {
        return "POSTERGADO";
    }

    if (
        status === "cancelled"
    ) {
        return "CANCELADO";
    }

    if (
        status === "suspended"
    ) {
        return "SUSPENDIDO";
    }

    if (
        status === "abandoned"
    ) {
        return "ABANDONADO";
    }

    return "PRÓXIMO";
}


/* =========================================================
   FORMATTERS
   ========================================================= */

function formatMatchDate(
    date
) {

    if (!date) {
        return "Fecha no disponible";
    }

    const parsed =
        new Date(
            `${date}T12:00:00`
        );

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return date;
    }

    return new Intl.DateTimeFormat(
        "es-AR",
        {
            day: "2-digit",
            month: "short"
        }
    ).format(parsed);
}


function getInitials(
    name
) {

    return String(name || "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(
            word =>
                word
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");
}


/* =========================================================
   SAFE DOM
   ========================================================= */

function setText(
    element,
    value
) {

    if (element) {
        element.textContent =
            value ?? "";
    }
}


function setImage(
    element,
    source,
    alt
) {

    if (!element) {
        return;
    }

    element.alt =
        alt || "";

    if (source) {

        element.src =
            source;

        element.style.display =
            "";

    } else {

        element.removeAttribute(
            "src"
        );

        element.style.display =
            "none";
    }
}


/* =========================================================
   SECURITY / ESCAPING
   ========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;

function showToast(
    message
) {

    if (
        !elements.toast ||
        !elements.toastMessage
    ) {
        return;
    }

    elements.toastMessage.textContent =
        message;

    elements.toast.classList.add(
        "is-visible"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(
            () => {

                elements.toast.classList.remove(
                    "is-visible"
                );

            },
            2800
        );
}


/* =========================================================
   DEBUG
   ========================================================= */

window.SportDash = {
    state,
    loadMatches,
    showView,
    openMatchById
};