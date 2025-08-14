"use strict";

// VibeFlix - TMDb integration
// Fill in your TMDb API key below. You can create one at https://www.themoviedb.org/settings/api
const TMDB_API_KEY = "YOUR_TMDB_API_KEY_HERE"; // Required

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const DEFAULT_POSTER_PLACEHOLDER = "https://via.placeholder.com/300x450?text=No+Image";

/**
 * Debounce helper: delays invoking `fn` until `waitMs` have elapsed since the last call
 */
function debounce(fn, waitMs) {
    let timeoutId = null;
    return function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), waitMs);
    };
}

function buildApiUrl(path, params) {
    const url = new URL(TMDB_BASE_URL + path);
    url.searchParams.set("api_key", TMDB_API_KEY);
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function searchMovies(query) {
    const url = buildApiUrl("/search/movie", {
        query,
        include_adult: "false",
        language: "en-US",
        page: 1
    });
    const data = await fetchJson(url);
    return Array.isArray(data.results) ? data.results : [];
}

async function fetchPopularMovies() {
    const url = buildApiUrl("/movie/popular", {
        language: "en-US",
        page: 1
    });
    const data = await fetchJson(url);
    return Array.isArray(data.results) ? data.results : [];
}

function getPosterUrl(posterPath) {
    if (!posterPath) return DEFAULT_POSTER_PLACEHOLDER;
    return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
}

function formatRating(voteAverage) {
    if (typeof voteAverage !== "number" || Number.isNaN(voteAverage)) return "N/A";
    return voteAverage.toFixed(1);
}

function renderMovies(movies) {
    const grid = document.getElementById("movies-grid");
    if (!grid) return;

    if (!TMDB_API_KEY || TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
        grid.innerHTML = `<p style="color:#aaa;">Add your TMDb API key in <code>app.js</code> to load movies.</p>`;
        return;
    }

    if (!Array.isArray(movies) || movies.length === 0) {
        grid.innerHTML = `<p style="color:#aaa;">No movies found. Try a different search.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    movies.forEach((movie) => {
        const title = movie.title || movie.name || "Untitled";
        const rating = formatRating(movie.vote_average);
        const posterSrc = getPosterUrl(movie.poster_path);

        const card = document.createElement("div");
        card.className = "movie-card";
        card.tabIndex = 0;
        card.setAttribute("aria-label", `${title}, rating ${rating} out of 10`);

        const img = document.createElement("img");
        img.className = "movie-poster";
        img.src = posterSrc;
        img.alt = `${title} poster`;
        img.loading = "lazy";
        img.width = 300;
        img.height = 450;

        const info = document.createElement("div");
        info.className = "movie-info";

        const titleEl = document.createElement("h3");
        titleEl.className = "movie-title";
        titleEl.textContent = title;

        const ratingEl = document.createElement("div");
        ratingEl.className = "movie-rating";

        const star = document.createElement("span");
        star.className = "star-icon";
        star.setAttribute("aria-hidden", "true");
        star.textContent = "★";

        const ratingText = document.createElement("span");
        ratingText.textContent = rating;

        ratingEl.appendChild(star);
        ratingEl.appendChild(ratingText);

        info.appendChild(titleEl);
        info.appendChild(ratingEl);

        card.appendChild(img);
        card.appendChild(info);

        fragment.appendChild(card);
    });

    grid.innerHTML = "";
    grid.appendChild(fragment);
}

async function initialize() {
    const searchInput = document.getElementById("movie-search");
    const grid = document.getElementById("movies-grid");
    if (!searchInput || !grid) return;

    const performSearch = debounce(async () => {
        const query = searchInput.value.trim();
        try {
            if (query.length === 0) {
                const popular = await fetchPopularMovies();
                renderMovies(popular);
            } else {
                const results = await searchMovies(query);
                renderMovies(results);
            }
        } catch (err) {
            console.error(err);
            grid.innerHTML = `<p style="color:#aaa;">Something went wrong while loading movies.</p>`;
        }
    }, 400);

    searchInput.addEventListener("input", performSearch);

    // Initial load: show popular movies
    try {
        const popular = await fetchPopularMovies();
        renderMovies(popular);
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<p style="color:#aaa;">Unable to load movies. Check your network or API key.</p>`;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
} else {
    initialize();
}


