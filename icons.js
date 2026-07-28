// Handgetekende badge-iconen (batch 1). Consistente lijnstijl:
// viewBox 0 0 24 24, fill=none, stroke=currentColor, stroke-width 2, ronde hoeken.
// Waarde = alleen de binnenkant (paden); de <svg>-wrapper zit in de render-code.
// Kleur volgt de categorie via een CSS-klasse. Badges zonder icoon vallen terug op emoji.
module.exports = {
  // ---- goede daden ----
  koffieketting: '<path d="M4 8h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z"/><path d="M15 9h2.2a2.5 2.5 0 0 1 0 5H15"/><path d="M6.5 2.5v2M9.5 2.5v2M12.5 2.5v2"/>',
  oversteekbegeleider: '<circle cx="12" cy="4.3" r="1.9"/><path d="M12 7.2v6.3M12 9l-3.2-1.2M12 9l3.2 1.2M12 13.5l-2.6 6.2M12 13.5l2.6 6.2"/>',
  perronsprinter: '<circle cx="14.5" cy="4.2" r="1.9"/><path d="M6 20.5l3.4-3 1-4.2 3 2.2 2.6-.6"/><path d="M9.4 13.3l-1-4.3 4.2-1.2 2.3 3.1 2.8.2"/>',
  thuischef: '<path d="M6.5 13a3.8 3.8 0 0 1-1-7.5 3.9 3.9 0 0 1 7-1.4 3.9 3.9 0 0 1 5 1.4 3.8 3.8 0 0 1-1 7.5Z"/><path d="M6.5 13v5.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V13"/>',
  'vroege-vogel': '<path d="M3 18.5h18"/><path d="M12 3.5v3M5.5 8.4l1.6 1.6M18.5 8.4l-1.6 1.6M2.5 14h2.5M19 14h2.5"/><path d="M7.5 18.5a4.5 4.5 0 0 1 9 0"/>',
  zitplaatsschenker: '<path d="M5 11V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5V11"/><path d="M4 11h16v5H4z"/><path d="M6 16v3.5M18 16v3.5"/>',
  sleutelspeurder: '<circle cx="8" cy="8" r="4.2"/><path d="M11 11l8.5 8.5"/><path d="M16.5 16.5l1.6-1.6M18.8 18.8l1.6-1.6"/>',
  'paraplu-samaritaan': '<path d="M12 3v2.2"/><path d="M3.4 11.3a8.6 8.6 0 0 1 17.2 0Z"/><path d="M12 11.3v6.4a2.6 2.6 0 0 0 5.2 0"/>',
  'wifi-wonderdokter': '<path d="M4.6 11.6a11 11 0 0 1 14.8 0"/><path d="M7.6 14.9a6.6 6.6 0 0 1 8.8 0"/><path d="M12 18.6h.01"/>',
  regenloper: '<path d="M7.5 15.5a4 4 0 0 1 .4-8 5.5 5.5 0 0 1 10.5 1.4 3.5 3.5 0 0 1-.9 6.6"/><path d="M8.5 18l-1 2.2M12 18l-1 2.2M15.5 18l-1 2.2"/>',
  hondenknuffelaar: '<path d="M7.5 7.5C5 8 4 10.5 5 13"/><path d="M16.5 7.5C19 8 20 10.5 19 13"/><path d="M7.5 7.5a4.7 4.7 0 0 1 9 0c.6 1.6.6 4-1 5.9a4.7 4.7 0 0 1-7 0c-1.6-1.9-1.6-4.3-1-5.9Z"/><path d="M10 11.2h.01M14 11.2h.01"/><path d="M12 13.4v1.1M10.7 15.6c.8.5 1.8.5 2.6 0"/>',
  ijsbreker: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M12 12v9M4 7.5l8 4.5 8-4.5"/>',
  'stille-afwasser': '<path d="M4.5 10.5h15l-1.2 8a2 2 0 0 1-2 1.7H7.7a2 2 0 0 1-2-1.7Z"/><path d="M8.5 10.5C8 6 10 3.5 12.5 3.5S17 5 16.5 8"/><path d="M7 14.5h10"/>',
  // ---- ondeugd ----
  vliegenmepper: '<rect x="6" y="2.6" width="10" height="9" rx="3"/><path d="M9 5.4v6M12.5 5.4v6M6.6 8.2h8.8"/><path d="M10.8 11.6L7 21"/>',
  muggenwreker: '<ellipse cx="12" cy="13.5" rx="2.3" ry="3.8"/><path d="M12 9.7V6.2M12 6.2l-1.8-1.8M12 6.2l1.8-1.8"/><path d="M10.2 11.8C7 10.5 5 9 4 6.6M13.8 11.8C17 10.5 19 9 20 6.6"/><path d="M10.4 15.6l-3.4 3M13.6 15.6l3.4 3"/>',
  'laatste-koekje-bandiet': '<circle cx="12" cy="12" r="8.4"/><circle cx="9.4" cy="9.6" r=".9"/><circle cx="14.2" cy="9.4" r=".9"/><circle cx="13.6" cy="14.4" r=".9"/><circle cx="9" cy="14.6" r=".9"/><circle cx="12" cy="11.8" r=".6"/>',
  snoozemeester: '<circle cx="12" cy="13.3" r="6.8"/><path d="M12 9.8v3.5l2.4 1.8"/><path d="M4.6 4.5L2.5 6.6M19.4 4.5l2.1 2.1M6.5 19.8l-1.4 2M17.5 19.8l1.4 2"/>',
  'wc-rol-fantoom': '<ellipse cx="12" cy="6.8" rx="7" ry="2.3"/><path d="M5 6.8v9.4c0 1.3 3.1 2.3 7 2.3s7-1 7-2.3V6.8"/><ellipse cx="12" cy="6.8" rx="2.4" ry=".8"/><path d="M19 12.5V19l2.3 1.6"/>',
  liftbommenwerper: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18"/><path d="M8 9.5l1.5-2 1.5 2M8 14.5l1.5 2 1.5-2"/>',
  pepervreter: '<path d="M13.5 6.2c.5-1.4 2-2.2 3.5-1.9"/><path d="M15.5 6.6c2 2.7 1.4 6.8-1.4 9.3-2 1.8-4.7 2.4-6.4 1.3-1-.7-1-1.9.2-2.3 1-.3 1.7.2 2.9 0 2.3-.4 3.9-2.5 3.9-4.8 0-1.3-.5-2.4-.9-3.2a1.2 1.2 0 0 1 1.7-.3Z"/>',
  'netflix-overspeler': '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M10 9l4.5 3-4.5 3z"/><path d="M8 20h8"/>',
};
