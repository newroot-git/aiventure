// Curated "things to do" for the Explore page so it's never empty. Each idea is
// tagged with interest-category ids (see lib/interests) and carries a `q` that
// pre-fills the create-a-plan flow (/new?scope=single&intent=<q>). Instant, no AI call.
export interface Idea {
  id: string;
  title: string;
  blurb: string;
  tile: string; // cover image key -> /img/cover-<tile>.png
  cats: string[];
  q: string;
}

export const IDEAS: Idea[] = [
  { id: "sunrise-hike", title: "Sunrise hike", blurb: "Beat the crowds to a viewpoint with a flask of coffee.", tile: "hike", cats: ["active"], q: "a sunrise hike to a good viewpoint" },
  { id: "wild-swim", title: "Wild swim", blurb: "Find a lake or lido and take the plunge.", tile: "swim", cats: ["active", "chill"], q: "a wild swimming spot for a dip" },
  { id: "bouldering", title: "Bouldering session", blurb: "Indoor walls, no rope, all grip.", tile: "climb", cats: ["active", "games"], q: "a bouldering session at a climbing gym" },
  { id: "coffee-crawl", title: "Coffee crawl", blurb: "The best independent roasters in one morning.", tile: "coffee", cats: ["food"], q: "a coffee crawl of the best independent roasters" },
  { id: "street-food", title: "Street food wander", blurb: "Graze your way through a market.", tile: "streetfood", cats: ["food"], q: "a street food market to graze through" },
  { id: "sunday-roast", title: "Sunday roast", blurb: "Find the pub doing the proper trimmings.", tile: "roast", cats: ["food"], q: "a proper Sunday roast at a good pub" },
  { id: "pub-quiz", title: "Pub quiz night", blurb: "Round up the crew, defend your trivia honour.", tile: "pub", cats: ["games", "nightlife"], q: "a pub quiz night to enter as a team" },
  { id: "board-games", title: "Board game café", blurb: "Hot drinks and a wall of games.", tile: "games", cats: ["games"], q: "a board game café afternoon" },
  { id: "arcade", title: "Arcade & pizza", blurb: "Retro machines then a slice.", tile: "arcade", cats: ["games"], q: "an arcade night then pizza" },
  { id: "gallery-lunch", title: "Gallery + lunch", blurb: "A new exhibition then somewhere nice to eat.", tile: "gallery", cats: ["culture", "food"], q: "a gallery or museum then lunch" },
  { id: "live-gig", title: "Live gig", blurb: "Catch a band you've never heard of.", tile: "gig", cats: ["culture", "nightlife"], q: "a live gig at a small venue" },
  { id: "open-air-cinema", title: "Open-air cinema", blurb: "Films under the stars.", tile: "cinema", cats: ["culture", "chill"], q: "an open-air cinema night" },
  { id: "cocktail-crawl", title: "Cocktail crawl", blurb: "Three bars, three signature drinks.", tile: "cocktails", cats: ["nightlife"], q: "a cocktail bar crawl" },
  { id: "karaoke", title: "Karaoke booth", blurb: "Belt it out with the crew.", tile: "karaoke", cats: ["nightlife", "games"], q: "a karaoke booth night" },
  { id: "coastal-day", title: "Coastal day trip", blurb: "Train to the sea and back.", tile: "train", cats: ["trips", "active"], q: "a coastal day trip by train" },
  { id: "weekend-away", title: "Weekend away", blurb: "Two nights somewhere new.", tile: "trip", cats: ["trips"], q: "a weekend away somewhere new" },
  { id: "picnic", title: "Picnic in the park", blurb: "Blanket, snacks, good weather.", tile: "park", cats: ["chill", "food"], q: "a picnic in a nice park" },
  { id: "spa", title: "Spa afternoon", blurb: "Steam, sauna, switch off.", tile: "spa", cats: ["chill"], q: "a spa afternoon to switch off" },
];

// Pick N ideas, preferring ones that match the user's interest categories. `seed`
// rotates the selection (e.g. day-of-month) so it feels fresh but stays deterministic.
export function freshIdeas(cats: string[], seed: number, n = 3): Idea[] {
  const want = new Set(cats);
  const matched = IDEAS.filter((i) => i.cats.some((c) => want.has(c)));
  const pool = matched.length >= n ? matched : IDEAS;
  const out: Idea[] = [];
  const start = pool.length ? ((seed % pool.length) + pool.length) % pool.length : 0;
  for (let k = 0; k < Math.min(n, pool.length); k++) out.push(pool[(start + k) % pool.length]);
  return out;
}
