const line = (body, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const fill = (body, vb = '0 0 32 32', cls = 'ico') =>
  `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" fill="currentColor">${body}</svg>`;

export const icon = {
  cart: line('<path d="M3 4h2.2l2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L20.6 8H6.1"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>'),
  plus: line('<path d="M12 5v14M5 12h14"/>'),
  minus: line('<path d="M5 12h14"/>'),
  trash: line('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-12M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7"/>'),
  search: line('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  close: line('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: line('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  edit: line('<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/>'),
  lock: line('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  image: line('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 3.5 3L16 12l4 4"/>'),
  back: line('<path d="M15 5l-7 7 7 7"/>'),
  pin: fill('<path d="M16 2.5c-5.6 0-10 4.4-10 10 0 7.4 10 17 10 17s10-9.6 10-17c0-5.6-4.4-10-10-10zm0 13.8a3.9 3.9 0 1 1 0-7.8 3.9 3.9 0 0 1 0 7.8z"/>'),
  wa: fill('<path d="M16 3.2A12.8 12.8 0 0 0 5 22.5L3.3 28.8l6.5-1.7A12.8 12.8 0 1 0 16 3.2zm0 23.3c-2 0-3.9-.5-5.5-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.5 10.5 0 1 1 16 26.5z"/><path d="M21.9 18.7c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.6 8.6 0 0 1-4.3-3.7c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.2 1.3 3.4c.2.2 2.3 3.5 5.6 4.9 2.1.9 2.9 1 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/>'),
  ig: line('<rect x="4" y="4" width="16" height="16" rx="4.6"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.3" r=".6" fill="currentColor"/>'),
  moon: fill('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', '0 0 24 24', 'ico ico-moon'),
  spark: fill('<path d="M10 0C10.8 7 13 9.2 20 10 13 10.8 10.8 13 10 20 9.2 13 7 10.8 0 10 7 9.2 9.2 7 10 0z"/>', '0 0 20 20', 'ico ico-spark'),
};

/** Lua crescente com brilho: marca do site. */
export const brandMark = `<svg class="brand__moon" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a5634f"/><stop offset=".45" stop-color="#f6d3c3"/><stop offset="1" stop-color="#b8735d"/></linearGradient></defs><path d="M31 22.6A13.5 13.5 0 1 1 17.4 6.6a10.5 10.5 0 0 0 13.6 16z" fill="url(#rg)"/><path d="M31.5 5l1 3.2 3.2 1-3.2 1-1 3.2-1-3.2-3.2-1 3.2-1z" fill="#e2a48c"/></svg>`;

export const icon2 = {
  up: line('<path d="m6 15 6-6 6 6"/>'),
  down: line('<path d="m6 9 6 6 6-6"/>'),
  settings: line('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>'),
  tag: line('<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8.5" cy="8.5" r="1.3"/>'),
  box: line('<path d="M4 8l8-4 8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8M12 12v8"/>'),
  alert: line('<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.4v.1"/>'),
};
