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

  // ---- batch 2 ----
  trappenbeest: '<path d="M4 20h4v-4h4v-4h4v-4h4V4"/>',
  buurtsuperheld: '<path d="M3 9c2-1.6 5.5-2.2 9-2.2s7 .6 9 2.2c0 3-1.6 5-4.2 5-1.7 0-2.8-.9-3.6-2h-2.4c-.8 1.1-1.9 2-3.6 2C4.6 14 3 12 3 9Z"/><path d="M7.2 9.7h.01M16.8 9.7h.01"/>',
  'blikseminslag-overlever': '<path d="M13 2.5L5.5 13H10l-1 8.5L18.5 10H14l1-7.5z"/>',
  verjaardagsvergeter: '<path d="M4.5 20.5h15M6 20.5v-6.5h12v6.5M4.5 14a2 2 0 0 1 2-1.9h11a2 2 0 0 1 2 1.9"/><path d="M9 12.1V9.4M12 12.1V9M15 12.1V9.4"/><path d="M9 8.6c0-.9.6-1.1.6-1.9M15 8.6c0-.9.6-1.1.6-1.9"/>',
  'karaoke-kamikaze': '<rect x="9" y="2.5" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17v3.5M8.5 20.5h7"/>',
  eendenfluisteraar: '<circle cx="14" cy="7" r="3.1"/><path d="M17 6.6l3.2-.6-2.3 2.1"/><path d="M13.4 5.9h.01"/><path d="M11.3 9.5C7.8 10.2 5.3 12.7 5.3 15.7h8.7c2.9 0 5.2-1.8 5.2-4.1"/>',
  'stekkerdoos-strateeg': '<path d="M9 2.5v4.5M15 2.5v4.5"/><path d="M6.5 7h11v2.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 15v6"/>',
  'spoiler-sluipschutter': '<rect x="3" y="9" width="18" height="11.5" rx="1.5"/><path d="M3.4 9l2.2-3.8 3.8 1.1-2.2 3.8M9.4 6.3l3.8 1.1-2.2 3.8M15.4 7.4l3.8 1.1-2.2 3.8"/>',
  verhalenverteller: '<path d="M12 6.2C10 5 7.4 5 5 5.8v12.4c2.4-.8 5-.8 7 .4 2-1.2 4.6-1.2 7-.4V5.8C15.6 5 13 5 12 6.2Z"/><path d="M12 6.2v12.8"/>',
  complimentenkanon: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M12 8.4c-1-1.2-3-.5-3 1.1 0 1.3 3 3.3 3 3.3s3-2 3-3.3c0-1.6-2-2.3-3-1.1Z"/>',
  'ikea-overwinnaar': '<path d="M15.6 4.6a4 4 0 0 0-5 5l-6.2 6.2 2.5 2.5 6.2-6.2a4 4 0 0 0 5-5l-2.3 2.3-2.4-.6-.6-2.4z"/>',
  wespenonderhandelaar: '<ellipse cx="12" cy="14" rx="3.4" ry="4.6"/><path d="M8.8 12.2h6.4M8.8 15.2h6.4"/><path d="M10 8.6L8 6.4M14 8.6l2-2.2"/><ellipse cx="8.6" cy="10.4" rx="2.2" ry="1.3"/><ellipse cx="15.4" cy="10.4" rx="2.2" ry="1.3"/>',
  middernachtsnacker: '<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M6 10h12M9.2 5.5v2.2M9.2 12.5v3"/>',
  bloedbroeder: '<path d="M12 3s6 6.8 6 11a6 6 0 0 1-12 0c0-4.2 6-11 6-11Z"/><path d="M9.4 13.2a2.6 2.6 0 0 0 2.6 2.6"/>',
  sneeuwschuiver: '<path d="M12 2v20M4 12h16"/><path d="M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1"/><path d="M12 6.5l-2.2-2.2M12 6.5l2.2-2.2M12 17.5l-2.2 2.2M12 17.5l2.2 2.2M6.5 12l-2.2-2.2M6.5 12l-2.2 2.2M17.5 12l2.2-2.2M17.5 12l2.2 2.2"/>',
  bandenplakker: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="2.1"/><path d="M12 3.6v3.9M12 16.5v3.9M3.6 12h3.9M16.5 12h3.9M6.3 6.3l2.7 2.7M15 15l2.7 2.7M17.7 6.3L15 9M9 15l-2.7 2.7"/>',
  kattenredder: '<path d="M6 5.5l1.6 4.2M18 5.5l-1.6 4.2"/><path d="M6 5.5C5 8.5 5 11.6 7 13.7a5 5 0 0 0 10 0c2-2.1 2-5.2 1-8.2"/><path d="M10 12h.01M14 12h.01"/><path d="M12 13.8l-1 1M12 13.8l1 1M9 13l-2.4.4M9 14l-2.4.4M15 13l2.4.4M15 14l2.4.4"/>',
  plantenreanimator: '<path d="M7 13.5h10l-1 6.5a1 1 0 0 1-1 .9H9a1 1 0 0 1-1-.9z"/><path d="M12 13.5V8"/><path d="M12 9.2C10.6 8 8.5 8.1 7.4 9.6M12 10.4c1.4-1.2 3.5-1.1 4.6.4M12 8c0-2 1-3.2 2.6-3.7"/>',
  boodschappenridder: '<path d="M6 8h12l-1 12a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  'deurhouder-deluxe': '<path d="M4 20.5h16"/><path d="M6.5 20.5V5l8-2.2v17.7"/><path d="M14.5 2.8L18 3.8v16.7"/><circle cx="12" cy="12" r=".7"/>',
};
