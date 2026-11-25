(function () {
  const KEY = 'dr-hub-theme';
  const OWNER_KEY = 'dr-owner-stats';
  const CACHE_KEY = 'dr-es21-dl-cache';
  const CACHE_TTL_MS = 60000;
  const API_URL = 'https://api.github.com/repos/darkrabbitkr-oss/eyeshield21/releases?per_page=30';

  const html = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');
  const iconSlot = document.getElementById('theme-icon');
  const labelSlot = document.getElementById('theme-label');
  const statsBar = document.getElementById('owner-stats-bar');

  const moonSvg =
    '<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const sunSvg =
    '<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>';

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    if (iconSlot) iconSlot.innerHTML = theme === 'dark' ? moonSvg : sunSvg;
    if (labelSlot) labelSlot.textContent = theme === 'dark' ? '다크 모드' : '라이트 모드';
  }

  let initial = 'dark';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') initial = saved;
  } catch {
    // ignore storage failures
  }
  applyTheme(initial);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // ignore storage failures
      }
    });
  }

  function escapeHtml(raw) {
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isOwnerEnabled() {
    try {
      return localStorage.getItem(OWNER_KEY) === '1';
    } catch {
      return false;
    }
  }

  function setOwnerEnabled(enabled) {
    try {
      if (enabled) {
        localStorage.setItem(OWNER_KEY, '1');
      } else {
        localStorage.removeItem(OWNER_KEY);
      }
    } catch {
      // ignore storage failures
    }
  }

  function initOwnerQuery() {
    try {
      const url = new URL(window.location.href);
      const val = url.searchParams.get('stats');
      if (val === '1' || val === 'true') {
        setOwnerEnabled(true);
        url.searchParams.delete('stats');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      } else if (val === '0' || val === 'false') {
        setOwnerEnabled(false);
        url.searchParams.delete('stats');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    } catch {
      // ignore URL errors
    }
    return isOwnerEnabled();
  }

  async function fetchStats(force) {
    if (!force) {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached && typeof cached.fetchedAt === 'number' && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
            return cached;
          }
        }
      } catch {
        // ignore cache errors
      }
    }

    const res = await fetch(API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error('GitHub API HTTP ' + res.status);
    const json = await res.json();

    const byPlatform = { winSetup: 0, winPortable: 0, macDmg: 0, androidApk: 0, other: 0 };
    let total = 0;

    const releases = (Array.isArray(json) ? json : []).map((rel) => {
      let relTotal = 0;
      const assets = (Array.isArray(rel.assets) ? rel.assets : []).map((asset) => {
        const name = String(asset.name || '');
        const lower = name.toLowerCase();
        const count = Number(asset.download_count || 0) || 0;
        relTotal += count;
        total += count;
        if (lower.includes('-setup-') && lower.endsWith('.exe')) byPlatform.winSetup += count;
        else if (lower.includes('-portable-') && lower.endsWith('.exe')) byPlatform.winPortable += count;
        else if (lower.endsWith('.dmg')) byPlatform.macDmg += count;
        else if (lower.endsWith('.apk')) byPlatform.androidApk += count;
        else byPlatform.other += count;
        return { name, count };
      });
      return {
        tag: String(rel.tag_name || ''),
        publishedAt: rel.published_at ? String(rel.published_at).slice(0, 10) : '',
        total: relTotal,
        assets,
      };
    });

    const stats = { total, byPlatform, releases, fetchedAt: Date.now() };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(stats));
    } catch {
      // ignore cache errors
    }
    return stats;
  }

  function hideOwnerBar() {
    setOwnerEnabled(false);
    if (statsBar) {
      statsBar.hidden = true;
      statsBar.innerHTML = '';
    }
  }

  async function renderOwnerBar(force) {
    if (!statsBar) return;
    statsBar.hidden = false;
    statsBar.innerHTML =
      '<div class="container"><div class="owner-stats-card"><div class="owner-stats-top"><span class="status-pill status-soon">OWNER STATS · 본인 브라우저 전용</span><button class="owner-mini-btn" id="hub-stats-hide" type="button">숨기기</button></div><p class="owner-stats-note">GitHub 릴리스 다운로드 통계를 불러오는 중...</p></div></div>';
    statsBar.querySelector('#hub-stats-hide')?.addEventListener('click', hideOwnerBar);

    try {
      const stats = await fetchStats(force);
      if (!isOwnerEnabled()) return;

      const winTotal = stats.byPlatform.winSetup + stats.byPlatform.winPortable;
      const timeStr = new Date(stats.fetchedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      statsBar.innerHTML = `
        <div class="container">
          <div class="owner-stats-card">
            <div class="owner-stats-top">
              <div>
                <span class="status-pill status-soon">OWNER STATS · 본인 브라우저 전용 (Alt+Shift+D)</span>
                <p class="owner-stats-note">아이실드 21 누적 다운로드 실측 · 갱신 ${escapeHtml(timeStr)}</p>
              </div>
              <div class="owner-stats-controls">
                <a class="owner-mini-btn" href="./eyeshield21/#downloads">상세 보기</a>
                <button class="owner-mini-btn" id="hub-stats-refresh" type="button">새로고침</button>
                <button class="owner-mini-btn" id="hub-stats-hide" type="button">숨기기</button>
              </div>
            </div>
            <div class="owner-stats-kpis">
              <div class="owner-kpi"><span>전체 누적</span><strong class="tabular">${stats.total.toLocaleString('ko-KR')}회</strong></div>
              <div class="owner-kpi"><span>Windows (.exe)</span><strong class="tabular">${winTotal.toLocaleString('ko-KR')}</strong></div>
              <div class="owner-kpi"><span>macOS (.dmg)</span><strong class="tabular">${stats.byPlatform.macDmg.toLocaleString('ko-KR')}</strong></div>
              <div class="owner-kpi"><span>Android (.apk)</span><strong class="tabular">${stats.byPlatform.androidApk.toLocaleString('ko-KR')}</strong></div>
            </div>
            <div class="owner-ver-list">
              ${stats.releases
                .map(
                  (r) =>
                    `<span class="owner-ver-chip tabular">${escapeHtml(r.tag)} <b>${r.total.toLocaleString('ko-KR')}회</b></span>`,
                )
                .join('')}
            </div>
          </div>
        </div>
      `;

      statsBar.querySelector('#hub-stats-refresh')?.addEventListener('click', () => {
        void renderOwnerBar(true);
      });
      statsBar.querySelector('#hub-stats-hide')?.addEventListener('click', hideOwnerBar);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '요청 실패';
      statsBar.innerHTML = `
        <div class="container">
          <div class="owner-stats-card">
            <div class="owner-stats-top">
              <span class="status-pill status-soon">OWNER STATS · 본인 브라우저 전용</span>
              <div class="owner-stats-controls">
                <button class="owner-mini-btn" id="hub-stats-refresh" type="button">새로고침</button>
                <button class="owner-mini-btn" id="hub-stats-hide" type="button">숨기기</button>
              </div>
            </div>
            <p class="owner-stats-note">통계 로드 실패: ${escapeHtml(msg)}</p>
          </div>
        </div>
      `;
      statsBar.querySelector('#hub-stats-refresh')?.addEventListener('click', () => {
        void renderOwnerBar(true);
      });
      statsBar.querySelector('#hub-stats-hide')?.addEventListener('click', hideOwnerBar);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      if (isOwnerEnabled()) {
        hideOwnerBar();
      } else {
        setOwnerEnabled(true);
        void renderOwnerBar(true);
      }
    }
  });

  if (initOwnerQuery()) {
    void renderOwnerBar(false);
  }
})();
