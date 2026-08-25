/* Athena Ecosystem Map — static prototype. Inventory is loaded from mock-data.json. */

const STALE_AFTER = 120;
const ICONS = {
  check:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  alert:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 4.7L2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0z"/></svg>',
  help: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 2v.2"/><path d="M12 17h.01"/></svg>',
  dash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/></svg>',
  refresh:
    '<svg class="icon refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
  lock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  shield:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
};

const MARK = `
<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
  <rect width="32" height="32" rx="7" fill="#181c24"/>
  <rect x=".5" y=".5" width="31" height="31" rx="6.5" fill="none" stroke="color-mix(in oklab, #e8edf2 11%, transparent)"/>
  <circle cx="8" cy="21" r="2.15" fill="#7ec8d9"/>
  <circle cx="16" cy="9.5" r="2.15" fill="#7ec8d9"/>
  <circle cx="24" cy="21" r="2.15" fill="#7ec8d9"/>
  <path d="M8 21L16 9.5L24 21" fill="none" stroke="#7ec8d9" stroke-width="1.15" stroke-linejoin="round" opacity=".75"/>
</svg>`;

function ageSeconds(fromIso, observedAt) {
  const from = Date.parse(fromIso);
  const observed = Date.parse(observedAt);
  if (Number.isNaN(from) || Number.isNaN(observed)) return 0;
  return Math.max(0, Math.round((observed - from) / 1000));
}

function formatAge(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${hh}:${mm}:${ss} Z`;
}

function truncateHash(hash, keep = 12) {
  if (hash.length <= keep * 2) return hash;
  return `${hash.slice(0, keep)}…${hash.slice(-8)}`;
}

function iconFor(tone, label) {
  if (tone === "ready") return ICONS.check;
  if (tone === "unavailable") return ICONS.x;
  if (tone === "optional") return ICONS.dash;
  if (label === "Unconfirmed") return ICONS.help;
  return ICONS.alert;
}

function view(tone, label, detail) {
  return { tone, label, detail, icon: iconFor(tone, label) };
}

function evaluateService(service, expected) {
  const restricted =
    service.binding === "network-facing" &&
    service.remotelyReachable === false &&
    service.state === "ready";

  if (!expected) {
    if (service.state === "inactive") return view("optional", "Not required", "Optional in this profile.");
    if (service.state === "ready" && !restricted) {
      return view("optional", "Ready · optional", "Observed ready; not required by this profile.");
    }
    if (restricted) return view("optional", "Restricted · optional", service.reason || "LAN access restricted.");
    if (service.state === "unconfirmed") return view("optional", "Unconfirmed · optional", "No recent evidence; not required.");
    return view("optional", "Inactive", service.reason || "Not required by this profile.");
  }
  if (service.state === "unavailable") return view("unavailable", "Unavailable", service.reason || "Expected, but no healthy evidence.");
  if (service.state === "unconfirmed") return view("attention", "Unconfirmed", service.reason || "Expected, but evidence is unconfirmed.");
  if (service.state === "inactive") return view("optional", "Inactive", service.reason || "Intentionally inactive.");
  if (service.state === "degraded" || restricted) {
    return view("attention", restricted ? "Restricted" : "Degraded", service.reason || "Expected, but operating in a degraded or restricted state.");
  }
  if (service.binding === "localhost-only") return view("ready", "Ready", "Locally verified. Bound to localhost.");
  return view("ready", "Ready", "Expected and ready.");
}

function evaluateHost(node, expected) {
  const state = node.host.state;
  if (!expected) {
    if (state === "online") return view("optional", "Online · optional", "Host is online; not required by this profile.");
    if (state === "unconfirmed") {
      return view("optional", "Unconfirmed · optional", "No recent host evidence. Optional in this profile — not labelled offline.");
    }
    return view("optional", "Offline · optional", "Host is offline; not required by this profile.");
  }
  if (state === "online") return view("ready", "Online", "Host is reachable.");
  if (state === "unconfirmed") {
    return view("attention", "Unconfirmed", "Expected, but host evidence is unconfirmed. Not labelled offline.");
  }
  return view("unavailable", "Offline", "Expected host is unavailable.");
}

function rank(tone) {
  if (tone === "unavailable") return 3;
  if (tone === "attention") return 2;
  if (tone === "ready") return 1;
  return 0;
}

function evaluate(inventory, profileId) {
  const profile = inventory.profiles.find((p) => p.id === profileId) || inventory.profiles[0];
  const nodes = inventory.nodes.map((node) => {
    const expected = Object.prototype.hasOwnProperty.call(profile.expected, node.id);
    const ids = new Set(profile.expected[node.id] || []);
    const hostAge = ageSeconds(node.host.lastConfirmed, inventory.meta.observedAt);
    const stale = hostAge >= STALE_AFTER;
    const services = node.services.map((service) => ({
      service,
      expected: ids.has(service.id),
      view: evaluateService(service, ids.has(service.id)),
      ageSeconds: ageSeconds(service.lastConfirmed, inventory.meta.observedAt),
    }));
    return {
      node,
      expected,
      hostView: evaluateHost(node, expected && ids.has("host")),
      hostAgeSeconds: hostAge,
      stale,
      services,
      cardNote: node.restrictions[0] || node.notes[0] || null,
    };
  });

  let worst = "ready";
  let unavailable = 0;
  let attention = 0;
  let ready = 0;
  for (const n of nodes) {
    if (!n.expected) continue;
    const ids = new Set(profile.expected[n.node.id] || []);
    if (ids.has("host")) {
      const tone = n.stale && n.hostView.tone === "ready" ? "attention" : n.hostView.tone;
      if (rank(tone) > rank(worst)) worst = tone;
      if (tone === "unavailable") unavailable += 1;
      else if (tone === "attention") attention += 1;
      else if (tone === "ready") ready += 1;
    }
    for (const s of n.services) {
      if (!s.expected) continue;
      const tone = s.ageSeconds >= STALE_AFTER && s.view.tone === "ready" ? "attention" : s.view.tone;
      if (rank(tone) > rank(worst)) worst = tone;
      if (tone === "unavailable") unavailable += 1;
      else if (tone === "attention") attention += 1;
      else if (tone === "ready") ready += 1;
    }
  }

  const overall =
    worst === "unavailable"
      ? { tone: "unavailable", label: "Unavailable", summary: `${unavailable} expected ${unavailable === 1 ? "item is" : "items are"} down.` }
      : worst === "attention"
        ? { tone: "attention", label: "Attention", summary: `${attention} expected ${attention === 1 ? "item needs" : "items need"} review.` }
        : { tone: "ready", label: "Nominal", summary: `All ${ready} expected ${ready === 1 ? "item is" : "items are"} ready.` };

  return { profile, overall, nodes };
}

function chip(tone, label, icon) {
  return `<span class="chip" data-tone="${tone}">${icon || ""}${escapeHtml(label)}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """);
}

function bindingLabel(binding) {
  return binding === "localhost-only" ? "localhost-only" : "network-facing";
}

function reachabilityLabel(service) {
  if (service.binding === "localhost-only") {
    return service.state === "ready"
      ? "Locally verified · not LAN-reachable by design"
      : "Not LAN-reachable by design";
  }
  return service.remotelyReachable ? "Remotely reachable" : "Host online · service not LAN-reachable";
}

function shortLabel(label) {
  return label.replace(" · optional", "").replace(" · not required", "");
}

const state = {
  inventory: null,
  profileId: null,
  selectedId: null,
  refreshing: false,
  flash: null,
};

function render() {
  const root = document.getElementById("app");
  const { inventory } = state;
  const evaluation = evaluate(inventory, state.profileId);
  const selected = evaluation.nodes.find((n) => n.node.id === state.selectedId) || evaluation.nodes[0];
  const newest = Math.min(...evaluation.nodes.map((n) => n.hostAgeSeconds));
  const { overall, profile } = evaluation;

  root.innerHTML = `
    <header class="glass-bar">
      <div class="bar-row">
        <div class="brand">
          ${MARK}
          <div>
            <p class="eyebrow">Operations view</p>
            <h1>Athena Ecosystem Map</h1>
          </div>
        </div>
        <div class="profiles-wrap">${renderProfiles(inventory.profiles, state.profileId)}</div>
        <div class="bar-right">
          <div class="overall" aria-live="polite">
            <span class="dot" data-tone="${overall.tone}"></span>
            ${chip(overall.tone, overall.label, iconFor(overall.tone, overall.label))}
            <span data-tone="${overall.tone}" class="host-state">${escapeHtml(overall.summary)}</span>
          </div>
          <div class="ticker">Evidence ${formatAge(newest)} · ${formatTimestamp(inventory.meta.observedAt)}</div>
          <button type="button" class="refresh-btn" data-busy="${state.refreshing}" data-action="refresh" aria-label="Refresh evidence display. Presentation only — does not probe hosts.">
            ${ICONS.refresh} Refresh
          </button>
        </div>
      </div>
      <p class="summary-line">Profile <span style="color:var(--muted)">${escapeHtml(profile.label)}</span> · ${escapeHtml(profile.summary)}</p>
      <span class="sr-only">Active profile ${escapeHtml(profile.label)}. Ecosystem ${escapeHtml(overall.label)}. ${escapeHtml(overall.summary)}</span>
    </header>
    <div class="stage">
      <section aria-labelledby="nodes-heading">
        <div class="stage-head">
          <div>
            <h2 id="nodes-heading" class="eyebrow">Nodes</h2>
            <p class="ticker" style="margin-top:.25rem">LAN · ${escapeHtml(inventory.meta.network.cidr)}</p>
          </div>
          <p class="ticker">Select a host for service evidence</p>
        </div>
        <div class="lan-rail" aria-hidden="true"></div>
        <div class="grid" role="listbox" aria-label="Ecosystem hosts" aria-activedescendant="node-${selected.node.id}" tabindex="0" data-nodes="1">
          ${evaluation.nodes.map((n) => renderCard(n, n.node.id === selected.node.id)).join("")}
        </div>
      </section>
      ${renderDetail(selected)}
    </div>
    ${renderFooter(inventory)}
  `;

  bind(root, evaluation);
}

function renderProfiles(profiles, value) {
  return `<div class="profile-seg" role="radiogroup" aria-label="Operating profile">
    ${profiles
      .map(
        (p) =>
          `<button type="button" role="radio" aria-checked="${p.id === value}" tabindex="${p.id === value ? 0 : -1}" data-profile="${p.id}">${escapeHtml(p.label)}</button>`,
      )
      .join("")}
  </div>`;
}

function renderCard(n, selected) {
  const shown = n.services.filter((s) => s.expected || s.service.state !== "inactive").slice(0, 5);
  const extra = Math.max(0, n.services.length - shown.length);
  const chips =
    shown.length === 0
      ? chip("optional", "No services in snapshot")
      : shown
          .map((s) => chip(s.view.tone, `${s.service.name} ${shortLabel(s.view.label)}`, s.view.icon))
          .join("") + (extra > 0 ? chip("optional", `+${extra}`) : "");
  return `
    <button type="button" class="node-card" role="option" id="node-${n.node.id}" aria-selected="${selected}" data-selected="${selected}" data-expected="${n.expected}" data-node="${n.node.id}" aria-label="${escapeHtml(n.node.logicalName)}, ${escapeHtml(n.hostView.label)}. ${n.node.ip}">
      <div class="card-top">
        <span class="status-orb" data-tone="${n.hostView.tone}">${n.hostView.icon}</span>
        <div style="min-width:0;flex:1">
          <div class="card-title-row">
            <p class="logical">${escapeHtml(n.node.logicalName)}</p>
            <span class="ticker">${formatAge(n.hostAgeSeconds)}</span>
          </div>
          <p class="ip">${escapeHtml(n.node.ip)}</p>
          <p class="host-meta">${escapeHtml(n.node.hostname)}${n.node.platform ? ` · ${escapeHtml(n.node.platform)}` : ""} · ${escapeHtml(n.node.role)}</p>
        </div>
      </div>
      <div class="host-state" data-tone="${n.hostView.tone}">
        ${n.hostView.icon} ${escapeHtml(n.hostView.label)}${n.expected ? "" : ' <span style="color:var(--faint)">· not required</span>'}${n.stale ? ' <span data-tone="attention">· stale evidence</span>' : ""}
      </div>
      <div class="chips">${chips}</div>
      ${n.cardNote ? `<p class="note">${escapeHtml(n.cardNote)}</p>` : ""}
    </button>`;
}

function renderDetail(n) {
  const { node, hostView } = n;
  const services =
    n.services.length === 0
      ? `<p style="color:var(--muted);font-size:.9rem">No services reported for this host.</p>`
      : n.services.map(renderService).join("");
  return `
    <aside class="detail-panel" id="node-details" aria-labelledby="detail-heading">
      <div class="detail-head">
        <span class="status-orb" data-tone="${hostView.tone}">${hostView.icon}</span>
        <div>
          <p class="eyebrow">Selected node</p>
          <h2 id="detail-heading" class="logical" style="margin-top:.25rem">${escapeHtml(node.logicalName)}</h2>
          <p class="ip">${escapeHtml(node.ip)}</p>
          <p class="host-meta">hostname ${escapeHtml(node.hostname)}${node.platform ? ` · ${escapeHtml(node.platform)}` : ""} · ${escapeHtml(node.role)}</p>
        </div>
      </div>
      <div class="detail-host">
        <dl>
          <div><dt>Host state</dt><dd data-tone="${hostView.tone}">${hostView.icon} ${escapeHtml(hostView.label)}</dd></div>
          <div><dt>In this profile</dt><dd>${n.expected ? "Expected" : "Optional"}</dd></div>
          <div><dt>Last confirmed</dt><dd class="mono">${formatTimestamp(node.host.lastConfirmed)}</dd></div>
          <div><dt>Report age</dt><dd class="mono">${formatAge(n.hostAgeSeconds)}${n.stale ? ' <span data-tone="attention">· stale</span>' : ""}</dd></div>
          <div><dt>Evidence</dt><dd>${escapeHtml(node.host.evidenceSource)}</dd></div>
          <div><dt>Reachability</dt><dd>${node.host.state === "online" ? "Host online" : node.host.state === "unconfirmed" ? "Host unconfirmed" : "Host unavailable"}</dd></div>
        </dl>
        <p class="note">${escapeHtml(hostView.detail)}</p>
        ${node.notes.map((note) => `<p class="note">${escapeHtml(note)}</p>`).join("")}
        ${node.restrictions.map((note) => `<p class="note" data-tone="attention">${escapeHtml(note)}</p>`).join("")}
      </div>
      <div class="detail-services">
        <h3 class="eyebrow">Services</h3>
        ${services}
      </div>
    </aside>`;
}

function renderService(row) {
  const { service, view, expected } = row;
  const models = (service.models || [])
    .map((m) => chip(m.state === "ready" ? "ready" : "attention", m.name))
    .join("");
  return `
    <article class="service-row" data-tone="${view.tone}">
      <div class="card-title-row">
        <div>
          <h4>${escapeHtml(service.name)}</h4>
          <p class="host-state" data-tone="${view.tone}">${view.icon} ${escapeHtml(view.label)}${expected ? "" : ' <span style="color:var(--faint)">· not required</span>'}</p>
        </div>
        ${chip(view.tone, view.label, view.icon)}
      </div>
      <dl class="service-meta">
        <div><dt>Port</dt><dd class="mono">${service.port == null ? "—" : service.port}</dd></div>
        <div><dt>Binding</dt><dd>${bindingLabel(service.binding)}</dd></div>
        <div><dt>Scope</dt><dd>${escapeHtml(reachabilityLabel(service))}</dd></div>
        <div><dt>Evidence</dt><dd>${escapeHtml(service.evidenceSource)}</dd></div>
        <div><dt>Last confirmed</dt><dd class="mono">${formatTimestamp(service.lastConfirmed)}</dd></div>
        <div><dt>Age</dt><dd class="mono">${formatAge(row.ageSeconds)}</dd></div>
      </dl>
      ${service.reason ? `<p class="note">${escapeHtml(service.reason)}</p>` : ""}
      ${models ? `<div class="chips">${models}</div>` : ""}
    </article>`;
}

function renderFooter(inventory) {
  const { meta } = inventory;
  const verified = meta.integrity.status === "verified";
  return `
    <footer class="glass-bar-bottom">
      <div class="foot-row">
        <div class="foot-items">
          <span class="ticker">${escapeHtml(meta.probeVersion)}</span>
          <span>Evidence snapshot ${formatTimestamp(meta.observedAt)}</span>
          <span>${ICONS.shield} Integrity ${verified ? "verified" : escapeHtml(meta.integrity.status)} · <span class="mono">${escapeHtml(meta.integrity.algorithm)} ${truncateHash(meta.integrity.hash)}</span></span>
          <span class="readonly">${ICONS.lock} Read-only</span>
        </div>
        <p>${state.flash ? escapeHtml(state.flash) : "Observe only. Profiles change expectation, not machines. Refresh is presentation-only."}</p>
      </div>
    </footer>`;
}

function bind(root, evaluation) {
  root.querySelectorAll("[data-profile]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.profileId = btn.getAttribute("data-profile");
      render();
    });
  });
  const group = root.querySelector("[role='radiogroup']");
  if (group) {
    group.addEventListener("keydown", (event) => {
      const profiles = state.inventory.profiles;
      const i = profiles.findIndex((p) => p.id === state.profileId);
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        state.profileId = profiles[(i + 1) % profiles.length].id;
        render();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        state.profileId = profiles[(i - 1 + profiles.length) % profiles.length].id;
        render();
      }
    });
  }
  root.querySelectorAll("[data-node]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedId = btn.getAttribute("data-node");
      render();
      document.getElementById("node-details")?.scrollIntoView({ block: "nearest" });
    });
  });
  const list = root.querySelector("[data-nodes]");
  if (list) {
    list.addEventListener("keydown", (event) => {
      const ids = evaluation.nodes.map((n) => n.node.id);
      const i = ids.indexOf(state.selectedId);
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        state.selectedId = ids[(i + 1) % ids.length];
        render();
        list.focus();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        state.selectedId = ids[(i - 1 + ids.length) % ids.length];
        render();
        list.focus();
      }
    });
  }
  root.querySelector("[data-action='refresh']")?.addEventListener("click", refresh);
}

function refresh() {
  if (state.refreshing) return;
  state.refreshing = true;
  state.flash = "Re-reading local evidence snapshot…";
  render();
  window.setTimeout(() => {
    state.refreshing = false;
    state.flash = "Evidence unchanged. Snapshot is still the local mock inventory — no hosts were probed.";
    render();
  }, 520);
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  if (event.key >= "1" && event.key <= "4" && state.inventory) {
    const profile = state.inventory.profiles[Number(event.key) - 1];
    if (profile) {
      state.profileId = profile.id;
      render();
    }
  }
  if ((event.key === "r" || event.key === "R") && state.inventory) {
    event.preventDefault();
    refresh();
  }
});

async function boot() {
  const root = document.getElementById("app");
  try {
    const res = await fetch("./mock-data.json");
    if (!res.ok) throw new Error(`Could not read mock-data.json (${res.status})`);
    const inventory = await res.json();
    state.inventory = inventory;
    state.profileId = inventory.defaultProfileId;
    state.selectedId = inventory.nodes.find((n) => n.id === "workstation1")?.id || inventory.nodes[0]?.id;
    render();
  } catch (err) {
    root.innerHTML = `<p class="boot">Could not load mock-data.json. Serve this folder over HTTP rather than opening the file directly.<br><span class="ticker">${escapeHtml(err.message)}</span></p>`;
  }
}

boot();
