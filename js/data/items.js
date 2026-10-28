/*
 * EMERGENCY KIT ITEMS
 *
 * ✏️  Each item has:
 *   name — shown in the game
 *   good — true if it belongs in an emergency kit, false if it is useless
 *   tip  — shown when you pick it up (explains why it is useful or not)
 *
 * The icon picture has the same id (see js/gfx/icons.js).
 */
DR.ITEMS = {
  // ----- Useful items (in every level) -----
  water: { name: 'Water bottles', good: true, tip: 'Water! Store enough for at least 3 days — about 4 litres per person, per day.' },
  torch: { name: 'Torch', good: true, tip: 'A torch (flashlight) is much safer than candles when the power goes out.' },
  firstaid: { name: 'First aid kit', good: true, tip: 'A first aid kit lets you treat small cuts and scrapes.' },
  batteries: { name: 'Spare batteries', good: true, tip: 'Spare batteries keep your torch and radio working.' },
  powerbank: { name: 'Power bank', good: true, tip: 'A charged power bank keeps your phone ready for calls and emergency alerts.' },
  food: { name: 'Dry food', good: true, tip: 'Food that doesn\'t need cooking or a fridge (biscuits, nuts, tins) lasts a long time.' },
  documents: { name: 'Documents in a plastic bag', good: true, tip: 'Keep copies of important documents and family contacts in a waterproof bag.' },
  whistle: { name: 'Whistle', good: true, tip: 'A whistle helps rescuers find you — it is louder than shouting and saves your energy.' },

  // ----- Extra useful items for one level -----
  shoes: { name: 'Sturdy shoes', good: true, tip: 'Sturdy shoes protect your feet from broken glass after an earthquake.' },
  raincoat: { name: 'Raincoat', good: true, tip: 'A raincoat helps keep you dry and warm in wet weather.' },
  hat: { name: 'Sun hat', good: true, tip: 'A wide-brimmed hat shades your head and face from the hot sun.' },
  radio: { name: 'Battery radio', good: true, tip: 'A battery radio lets you hear official alerts even when the power is out.' },

  // ----- Useless items -----
  remote: { name: 'TV remote', good: false, tip: 'A TV remote won\'t help — the TV won\'t work in a power cut. Leave it!' },
  videogame: { name: 'Video game', good: false, tip: 'Games use up space and battery. Pack things that keep you safe instead.' },
  perfume: { name: 'Perfume', good: false, tip: 'Perfume isn\'t useful in an emergency. Soap or hand sanitiser is better for hygiene.' },
  skateboard: { name: 'Skateboard', good: false, tip: 'A skateboard is heavy and useless on roads covered in rubble. Leave it.' },
  hairdryer: { name: 'Hair dryer', good: false, tip: 'A hair dryer needs electricity, and electrical things are dangerous near floodwater.' },
  fizzy: { name: 'Fizzy drinks', good: false, tip: 'In hot weather water is best — sugary fizzy drinks don\'t hydrate you as well.' },
  candles: { name: 'Candles', good: false, tip: 'Candles can start fires, especially in strong winds. Pack a torch instead.' }
};

/** Items found in every level's prepare phase. Each level adds its own extras. */
DR.KIT_BASE = {
  good: ['water', 'torch', 'firstaid', 'batteries', 'powerbank', 'food', 'documents', 'whistle'],
  bad: ['remote', 'videogame', 'perfume']
};
