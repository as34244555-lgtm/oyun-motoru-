function svgUrl(markup) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
}

function creatureSvg({ hue, kind, frame = 0, name = "" }) {
  const c = `hsl(${hue} 72% 56%)`;
  const d = `hsl(${hue} 72% 38%)`;
  const l = `hsl(${hue} 70% 72%)`;
  const blink = frame === 2 ? 0 : 1;
  const step = frame % 2 === 0 ? -7 : 7;
  const ear = kind === "kedi" || kind === "kopek" || kind === "tavsan" || kind === "tilki" ? 1 : 0;
  const horn = kind === "unicorn" || kind === "ejderha" ? 1 : 0;
  const hat = ["sihirbaz", "asci", "korsan", "kral", "prenses"].includes(kind) ? 1 : 0;
  const wing = ["kus", "kelebek", "melek", "peri", "ejderha", "yarasa"].includes(kind) ? 1 : 0;
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <ellipse cx="64" cy="118" rx="26" ry="6" fill="#000" opacity=".16"/>
    ${wing ? `<ellipse cx="${40 + step / 3}" cy="70" rx="16" ry="8" fill="${l}" transform="rotate(-20 40 70)"/>
              <ellipse cx="${88 - step / 3}" cy="70" rx="16" ry="8" fill="${l}" transform="rotate(20 88 70)"/>` : ""}
    <ellipse cx="64" cy="78" rx="22" ry="26" fill="${c}"/>
    <circle cx="64" cy="42" r="18" fill="${c}"/>
    ${ear ? `<polygon points="48,32 44,14 56,28" fill="${d}"/><polygon points="80,32 84,14 72,28" fill="${d}"/>` : ""}
    ${horn ? `<polygon points="64,26 60,8 68,8" fill="#ffe08a"/>` : ""}
    ${hat ? `<path d="M46 30 h36 l-6 -12 h-24 z" fill="#2b2b2b"/>` : ""}
    <circle cx="57" cy="40" r="${3.2 * blink}" fill="#1b1b1b"/>
    <circle cx="71" cy="40" r="${3.2 * blink}" fill="#1b1b1b"/>
    <ellipse cx="64" cy="48" rx="5" ry="3" fill="${d}"/>
    <rect x="${54 + step / 8}" y="100" width="7" height="16" rx="3" fill="${d}"/>
    <rect x="${67 - step / 8}" y="100" width="7" height="16" rx="3" fill="${d}"/>
    <rect x="40" y="${68 + step / 6}" width="8" height="18" rx="3" fill="${d}"/>
    <rect x="80" y="${68 - step / 6}" width="8" height="18" rx="3" fill="${d}"/>
    <text x="64" y="14" text-anchor="middle" font-size="9" fill="#fff" font-family="Outfit,sans-serif">${name}</text>
  </svg>`);
}

const RAW = [
  ["kedi", "Kedi", "hayvan", 28, "kedi"],
  ["kopek", "Köpek", "hayvan", 32, "kopek"],
  ["tavsan", "Tavşan", "hayvan", 12, "tavsan"],
  ["ayi", "Ayı", "hayvan", 24, "ayi"],
  ["tilki", "Tilki", "hayvan", 18, "tilki"],
  ["penguen", "Penguen", "hayvan", 210, "kus"],
  ["baykus", "Baykuş", "hayvan", 30, "kus"],
  ["kus", "Kuş", "hayvan", 200, "kus"],
  ["balik", "Balık", "hayvan", 190, "balik"],
  ["kurbaga", "Kurbağa", "hayvan", 130, "kurbaga"],
  ["ari", "Arı", "hayvan", 48, "ari"],
  ["kelebek", "Kelebek", "hayvan", 300, "kelebek"],
  ["karinca", "Karınca", "hayvan", 10, "karinca"],
  ["dinozor", "Dinozor", "hayvan", 140, "dinozor"],
  ["ejderha", "Ejderha", "efsane", 150, "ejderha"],
  ["unicorn", "Unicorn", "efsane", 280, "unicorn"],
  ["hayalet", "Hayalet", "efsane", 190, "hayalet"],
  ["peri", "Peri", "efsane", 310, "peri"],
  ["melek", "Melek", "efsane", 50, "melek"],
  ["golem", "Golem", "efsane", 80, "golem"],
  ["robot", "Robot", "kahraman", 200, "robot"],
  ["kahraman", "Kahraman", "kahraman", 220, "kahraman"],
  ["ninja", "Ninja", "kahraman", 0, "ninja"],
  ["sovalye", "Şövalye", "kahraman", 210, "sovalye"],
  ["samuray", "Samuray", "kahraman", 8, "samuray"],
  ["korsan", "Korsan", "kahraman", 16, "korsan"],
  ["astronot", "Astronot", "kahraman", 200, "astronot"],
  ["uzayli", "Uzaylı", "kahraman", 120, "uzayli"],
  ["prenses", "Prenses", "masal", 320, "prenses"],
  ["cadi", "Cadı", "masal", 280, "cadi"],
  ["sihirbaz", "Sihirbaz", "masal", 260, "sihirbaz"],
  ["cuce", "Cüce", "masal", 25, "cude"],
  ["dev", "Dev", "masal", 35, "dev"],
  ["kral", "Kral", "masal", 45, "kral"],
  ["palyaco", "Palyaço", "meslek", 0, "palyaco"],
  ["asci", "Aşçı", "meslek", 12, "asci"],
  ["doktor", "Doktor", "meslek", 200, "doktor"],
  ["futbolcu", "Futbolcu", "meslek", 140, "futbolcu"],
  ["muzisyen", "Müzisyen", "meslek", 270, "muzisyen"],
  ["denizci", "Denizci", "meslek", 205, "denizci"],
  ["zombi", "Zombi", "korku", 90, "zombi"],
  ["yarasa", "Yarasa", "korku", 250, "yarasa"],
  ["kardanadam", "Kardan adam", "mevsim", 200, "kardanadam"],
  ["kabak", "Kabak", "mevsim", 30, "kabak"],
  ["yildiz", "Yıldız", "nesne", 50, "yildiz"],
  ["top", "Top", "nesne", 2, "top"],
];

export const CHARACTERS = RAW.map(([id, name, category, hue, kind]) => ({
  id,
  name,
  category,
  hue,
  kind,
  frames: 3,
}));

export const BACKDROPS = [
  { id: "cayir", name: "Çayır", sky: "#73b8f2", ground: "#3d8a4a" },
  { id: "gece", name: "Gece", sky: "#0d1228", ground: "#1a1f30" },
  { id: "gunbatimi", name: "Gün batımı", sky: "#e06a38", ground: "#6b3a28" },
  { id: "uzay", name: "Uzay", sky: "#090914", ground: "#1b1630" },
  { id: "deniz", name: "Deniz", sky: "#2e6b9e", ground: "#1d4e72" },
  { id: "col", name: "Çöl", sky: "#e3b361", ground: "#c48a3a" },
  { id: "kar", name: "Kar", sky: "#c8dcf0", ground: "#eef6ff" },
  { id: "sehir", name: "Şehir", sky: "#384258", ground: "#2a3140" },
  { id: "orman", name: "Orman", sky: "#2a5230", ground: "#1d3b22" },
  { id: "magara", name: "Mağara", sky: "#1e1a17", ground: "#2a221c" },
  { id: "kale", name: "Kale", sky: "#485062", ground: "#3a3f4c" },
  { id: "sahne", name: "Sahne", sky: "#1a1424", ground: "#2a1d36" },
  { id: "sualti", name: "Sualtı", sky: "#0d385f", ground: "#0a2a46" },
  { id: "volkan", name: "Volkan", sky: "#47150d", ground: "#2c0d08" },
  { id: "bulutlar", name: "Bulutlar", sky: "#b3ccea", ground: "#d9e6f6" },
  { id: "ay", name: "Ay yüzeyi", sky: "#1e1e24", ground: "#4a4a52" },
  { id: "ciftlik", name: "Çiftlik", sky: "#8cb86b", ground: "#6a9348" },
  { id: "stadyum", name: "Stadyum", sky: "#336338", ground: "#1f4724" },
  { id: "sinif", name: "Sınıf", sky: "#9e947a", ground: "#6e6550" },
  { id: "labirent", name: "Labirent", sky: "#2e3329", ground: "#1c2018" },
  { id: "neon", name: "Neon şehir", sky: "#1a0a38", ground: "#120624" },
  { id: "sonbahar", name: "Sonbahar", sky: "#b86b2e", ground: "#7a3f16" },
  { id: "gol", name: "Göl", sky: "#53859e", ground: "#2f5d70" },
  { id: "dag", name: "Dağ", sky: "#6688ad", ground: "#3e5870" },
];

export function characterKindOf(id) {
  const kinds = {
    kedi: "quadruped",
    kopek: "quadruped",
    tavsan: "quadruped",
    ayi: "quadruped",
    tilki: "quadruped",
    dinozor: "quadruped",
    kurbaga: "quadruped",
    karinca: "quadruped",
    unicorn: "quadruped",
    kus: "flyer",
    kelebek: "flyer",
    ari: "flyer",
    melek: "flyer",
    peri: "flyer",
    ejderha: "flyer",
    yarasa: "flyer",
    penguen: "flyer",
    baykus: "flyer",
    top: "round",
    balik: "fish",
    robot: "robot",
    golem: "robot",
    hayalet: "ghost",
    ninja: "ninja",
    sovalye: "knight",
    samuray: "knight",
    sihirbaz: "wizard",
    cadi: "wizard",
    uzayli: "alien",
    prenses: "royal",
    kral: "royal",
    kardanadam: "snow",
    kabak: "pumpkin",
    yildiz: "star",
  };
  return kinds[id] || "humanoid";
}

export function costumeImage(id, frame = 0) {
  const ch = CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
  return creatureSvg({ hue: ch.hue, kind: ch.kind, frame, name: ch.name });
}

export function characterCostumes(id) {
  const ch = CHARACTERS.find((c) => c.id === id);
  if (!ch) return [];
  return ["dur", "adim1", "adim2"].map((name, i) => ({ name, image: costumeImage(id, i) }));
}

export function backdropStyle(id) {
  const bg = BACKDROPS.find((b) => b.id === id) || BACKDROPS[0];
  return { sky: bg.sky, ground: bg.ground };
}
