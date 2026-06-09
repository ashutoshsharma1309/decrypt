import { useNftMetadata } from "../hooks/useNftMetadata";
import type { Hex } from "viem";

export function NftPreview({
  nftAddr,
  tokenId,
  className = "",
}: {
  nftAddr?: Hex;
  tokenId?: bigint;
  className?: string;
}) {
  const { metadata, imageUrl, loading } = useNftMetadata(nftAddr, tokenId);
  const id = Number(tokenId ?? 0n);

  // Token #5 was minted in an early test with a hardcoded "Nebula Lock" SVG
  // baked into its tokenURI. The contract has no setTokenURI, so to keep
  // every NFT visually consistent we suppress that legacy image and render
  // the procedural mascot instead.
  const useProcedural = !imageUrl || id === 5;

  return (
    <div className={`relative aspect-square rounded-xl overflow-hidden border border-border bg-card ${className}`}>
      {!useProcedural ? (
        <img
          src={imageUrl}
          alt={metadata?.name || `Token #${tokenId}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <MascotNft tokenId={id} loading={loading} />
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
        <div className="text-[10px] uppercase tracking-widest text-white/60">DECRYPTO Champion</div>
        <div className="text-sm font-semibold truncate">{useProcedural ? characterName(id) : (metadata?.name || characterName(id))}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DECRYPTO Mascots — cartoon PFP-style NFTs.
// Each tokenId picks a deterministic combination of:
//   background color, body type, head, hat, eyes, mouth, accessory
// Designed to look like real PFP collection art (BAYC/Doodles vibes), all SVG.
// ---------------------------------------------------------------------------

const BACKGROUNDS = ["#f5a623", "#ff8fab", "#6ec8e0", "#b78de8", "#fcd34d", "#6ee7b7", "#ef4444", "#818cf8", "#c084fc", "#22d3ee", "#fb7185", "#84cc16", "#f472b6", "#34d399", "#fde047", "#60a5fa"];

const SHIRT_COLORS = ["#7c3aed", "#db2777", "#0891b2", "#16a34a", "#ea580c", "#dc2626", "#1e40af", "#9333ea", "#0d9488", "#ca8a04", "#be185d", "#1e293b"];
const HAT_COLORS = ["#dc2626", "#1e40af", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#facc15", "#0f172a", "#f43f5e"];
const EYE_FILLS = ["#fde047", "#86efac", "#7dd3fc", "#fda4af", "#f97316", "#a78bfa"];

// 18 head variants — 3 skin tones per archetype, so the same archetype on
// different tokenIds still looks visibly different.
const HEAD_VARIANTS: { archetype: number; skin: string; outline: string }[] = [
  // 0-2 Ape: tan, dark brown, blue
  { archetype: 0, skin: "#d4a574", outline: "#3a2a18" },
  { archetype: 0, skin: "#8b6f47", outline: "#2a1a0a" },
  { archetype: 0, skin: "#7dd3fc", outline: "#0c4a6e" },
  // 3-5 Cat: yellow, orange, lavender
  { archetype: 1, skin: "#fbbf24", outline: "#451a03" },
  { archetype: 1, skin: "#fb923c", outline: "#7c2d12" },
  { archetype: 1, skin: "#c4b5fd", outline: "#1e1b4b" },
  // 6-8 Skull: gray, gold, mint
  { archetype: 2, skin: "#9ca3af", outline: "#1f2937" },
  { archetype: 2, skin: "#fde047", outline: "#713f12" },
  { archetype: 2, skin: "#a7f3d0", outline: "#064e3b" },
  // 9-11 Alien: purple, green, pink
  { archetype: 3, skin: "#a78bfa", outline: "#1e1b4b" },
  { archetype: 3, skin: "#86efac", outline: "#14532d" },
  { archetype: 3, skin: "#f9a8d4", outline: "#831843" },
  // 12-14 Zombie: mint, lime, sickly yellow-green
  { archetype: 4, skin: "#6ee7b7", outline: "#064e3b" },
  { archetype: 4, skin: "#bef264", outline: "#365314" },
  { archetype: 4, skin: "#d9f99d", outline: "#3f6212" },
  // 15-17 Bunny: pink, cream, gray
  { archetype: 5, skin: "#fda4af", outline: "#4c0519" },
  { archetype: 5, skin: "#fef3c7", outline: "#713f12" },
  { archetype: 5, skin: "#e5e7eb", outline: "#374151" },
];

const HAT_NAMES = ["Crown", "Cap", "Beanie", "Bandana", "Fire", "Propeller", "Halo"];
const EYE_NAMES = ["Sunglasses", "Bored", "Dollar", "X-eyes", "Fire", "Wide", "Side-eye"];
const MOUTH_NAMES = ["Smirk", "Smile", "Tongue", "Cigar", "Frown", "Open"];
const HEAD_NAMES = ["Ape", "Cat", "Skull", "Alien", "Zombie", "Bunny"];
const EXTRA_NAMES = ["None", "None", "Earring", "Blush", "Freckles", "Mole", "Sweat", "Scar"];
const BG_PATTERNS = ["solid", "solid", "stripes", "dots", "rays"];

// splitmix32-style mixer — uniformly spreads (id, salt) bits so independent
// trait axes don't move in lockstep across nearby tokenIds.
function h(id: number, salt: number): number {
  let x = (Math.imul(id + 1, 2654435761) + Math.imul(salt + 1, 1597334677)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x;
}

function pick<T>(arr: T[], id: number, salt: number): T {
  return arr[h(id, salt) % arr.length];
}

function characterName(id: number) {
  const head = pick(HEAD_NAMES, id, 0);
  const hat = pick(HAT_NAMES, id, 4);
  const eyes = pick(EYE_NAMES, id, 2);
  return `${hat} · ${eyes} ${head} #${id}`;
}

function MascotNft({ tokenId, loading }: { tokenId: number; loading?: boolean }) {
  const bg = pick(BACKGROUNDS, tokenId, 1);
  const bgPattern = pick(BG_PATTERNS, tokenId, 11);
  const headVariant = pick(HEAD_VARIANTS, tokenId, 0);
  const hatIdx = h(tokenId, 4) % HAT_NAMES.length;
  const eyeIdx = h(tokenId, 2) % EYE_NAMES.length;
  const mouthIdx = h(tokenId, 3) % MOUTH_NAMES.length;
  const extraIdx = h(tokenId, 7) % EXTRA_NAMES.length;
  const shirtColor = pick(SHIRT_COLORS, tokenId, 8);
  const hatColor = pick(HAT_COLORS, tokenId, 9);
  const eyeFill = pick(EYE_FILLS, tokenId, 10);
  const accent = pick(BACKGROUNDS, tokenId, 6);

  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className={`w-full h-full ${loading ? "opacity-80" : ""}`} preserveAspectRatio="xMidYMid slice">
      <Background color={bg} pattern={bgPattern} accent={accent} />

      <ellipse cx="200" cy="370" rx="140" ry="14" fill="rgba(0,0,0,0.18)" />

      <Clothing idx={h(tokenId, 12) % 6} outline={headVariant.outline} skin={headVariant.skin} primary={shirtColor} secondary={accent} />

      <Head idx={headVariant.archetype} skin={headVariant.skin} outline={headVariant.outline} />

      <Eyes idx={eyeIdx} outline={headVariant.outline} fill={eyeFill} />

      <Mouth idx={mouthIdx} outline={headVariant.outline} />

      <Extras idx={extraIdx} outline={headVariant.outline} />

      <Hat idx={hatIdx} outline={headVariant.outline} color={hatColor} />
    </svg>
  );
}

function Background({ color, pattern, accent }: { color: string; pattern: string; accent: string }) {
  if (pattern === "stripes") {
    return (
      <g>
        <rect width="400" height="400" fill={color} />
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x="0" y={i * 80} width="400" height="40" fill={accent} opacity="0.18" />
        ))}
      </g>
    );
  }
  if (pattern === "dots") {
    return (
      <g>
        <rect width="400" height="400" fill={color} />
        {Array.from({ length: 25 }).map((_, i) => {
          const x = (i % 5) * 80 + 40;
          const y = Math.floor(i / 5) * 80 + 40;
          return <circle key={i} cx={x} cy={y} r="6" fill={accent} opacity="0.25" />;
        })}
      </g>
    );
  }
  if (pattern === "rays") {
    return (
      <g>
        <rect width="400" height="400" fill={color} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x2 = 200 + Math.cos(a) * 400;
          const y2 = 200 + Math.sin(a) * 400;
          return <line key={i} x1="200" y1="200" x2={x2} y2={y2} stroke={accent} strokeWidth="40" opacity="0.12" />;
        })}
      </g>
    );
  }
  return <rect width="400" height="400" fill={color} />;
}

// ---------------------------------------------------------------------------
// SVG part libraries
// ---------------------------------------------------------------------------

function Clothing({ idx, outline, skin, primary, secondary }: { idx: number; outline: string; skin: string; primary: string; secondary: string }) {
  const torso = "M 110 400 Q 110 295 200 275 Q 290 295 290 400 Z";
  switch (idx) {
    case 0: // Hoodie with chest logo
      return (
        <g>
          <path d={torso} fill={primary} stroke={outline} strokeWidth="6" strokeLinejoin="round" />
          <path d="M 175 280 Q 200 305 225 280" fill="none" stroke={outline} strokeWidth="4" />
          <circle cx="200" cy="355" r="14" fill="white" stroke={outline} strokeWidth="3" />
          <path d="M 195 350 L 200 360 L 207 348" stroke={outline} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="180" y="245" width="40" height="38" fill={skin} stroke={outline} strokeWidth="5" />
        </g>
      );
    case 1: // Striped tee
      return (
        <g>
          <path d={torso} fill={primary} stroke={outline} strokeWidth="6" strokeLinejoin="round" />
          {[315, 340, 365, 390].map((y, i) => (
            <rect key={i} x="115" y={y} width="170" height="10" fill={secondary} opacity="0.85" />
          ))}
          <rect x="180" y="245" width="40" height="38" fill={skin} stroke={outline} strokeWidth="5" />
        </g>
      );
    case 2: // Suit + tie
      return (
        <g>
          <path d={torso} fill="#1f2937" stroke={outline} strokeWidth="6" strokeLinejoin="round" />
          <path d="M 200 285 L 165 305 L 200 400 L 235 305 Z" fill="white" stroke={outline} strokeWidth="4" />
          <path d="M 200 295 L 188 310 L 200 325 L 212 310 Z" fill={primary} stroke={outline} strokeWidth="3" />
          <path d="M 200 325 L 192 395 L 208 395 Z" fill={primary} stroke={outline} strokeWidth="3" />
          <rect x="180" y="245" width="40" height="38" fill={skin} stroke={outline} strokeWidth="5" />
        </g>
      );
    case 3: // Leather jacket
      return (
        <g>
          <path d={torso} fill="#0f172a" stroke={outline} strokeWidth="6" strokeLinejoin="round" />
          <path d="M 165 290 L 200 305 L 235 290 L 235 400 L 165 400 Z" fill="#1e293b" stroke={outline} strokeWidth="4" />
          <line x1="200" y1="305" x2="200" y2="400" stroke={outline} strokeWidth="4" />
          <circle cx="180" cy="335" r="3" fill={primary} />
          <circle cx="180" cy="360" r="3" fill={primary} />
          <circle cx="220" cy="335" r="3" fill={primary} />
          <circle cx="220" cy="360" r="3" fill={primary} />
          <rect x="180" y="245" width="40" height="38" fill={skin} stroke={outline} strokeWidth="5" />
        </g>
      );
    case 4: // Tank top
      return (
        <g>
          <path d={torso} fill={skin} stroke={outline} strokeWidth="6" strokeLinejoin="round" />
          <path d="M 145 305 L 175 290 L 175 400 L 145 400 Z" fill={primary} stroke={outline} strokeWidth="4" strokeLinejoin="round" />
          <path d="M 255 305 L 225 290 L 225 400 L 255 400 Z" fill={primary} stroke={outline} strokeWidth="4" strokeLinejoin="round" />
          <path d="M 175 290 Q 200 320 225 290" fill="none" stroke={outline} strokeWidth="4" />
          <rect x="180" y="245" width="40" height="38" fill={skin} stroke={outline} strokeWidth="5" />
        </g>
      );
    case 5: // Turtleneck sweater
      return (
        <g>
          <path d={torso} fill={primary} stroke={outline} strokeWidth="6" strokeLinejoin="round" />
          <ellipse cx="200" cy="278" rx="46" ry="22" fill={primary} stroke={outline} strokeWidth="5" />
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={i} x1={140 + i * 30} y1="320" x2={140 + i * 30} y2="395" stroke={outline} strokeWidth="2" opacity="0.25" />
          ))}
          <rect x="180" y="245" width="40" height="38" fill={skin} stroke={outline} strokeWidth="5" />
        </g>
      );
  }
  return null;
}

function Head({ idx, skin, outline }: { idx: number; skin: string; outline: string }) {
  switch (idx) {
    case 0: // Ape — proper primate silhouette: heavy brow, broad jaw, muzzle
      return (
        <g>
          {/* Big curved ears tucked behind */}
          <path d="M 95 145 Q 70 150 75 195 Q 85 215 110 200 Z" fill={skin} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <path d="M 305 145 Q 330 150 325 195 Q 315 215 290 200 Z" fill={skin} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <path d="M 88 165 Q 92 185 105 195" fill="none" stroke={outline} strokeWidth="3" opacity="0.5" />
          <path d="M 312 165 Q 308 185 295 195" fill="none" stroke={outline} strokeWidth="3" opacity="0.5" />

          {/* Skull — wider at top (forehead), narrower jaw */}
          <path d="M 105 175 Q 105 80 200 75 Q 295 80 295 175 Q 295 250 270 270 Q 240 285 200 285 Q 160 285 130 270 Q 105 250 105 175 Z"
                fill={skin} stroke={outline} strokeWidth="6" strokeLinejoin="round" />

          {/* Heavy brow ridge — sits high so eyes render just below it */}
          <path d="M 125 135 Q 200 110 275 135 Q 275 150 200 145 Q 125 150 125 135 Z"
                fill={skin} stroke={outline} strokeWidth="4" strokeLinejoin="round" opacity="0.9" />
          <path d="M 140 142 L 165 138 M 235 138 L 260 142" stroke={outline} strokeWidth="3" opacity="0.6" strokeLinecap="round" />

          {/* Muzzle — set forward of the eye line, lighter skin */}
          <ellipse cx="200" cy="240" rx="68" ry="42" fill="#f5d4a8" stroke={outline} strokeWidth="4" />

          {/* Nostrils */}
          <ellipse cx="184" cy="220" rx="3.5" ry="5" fill={outline} />
          <ellipse cx="216" cy="220" rx="3.5" ry="5" fill={outline} />
        </g>
      );
    case 1: // Cat
      return (
        <g>
          {/* Ears */}
          <path d="M 100 80 L 130 145 L 165 110 Z" fill={skin} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <path d="M 300 80 L 270 145 L 235 110 Z" fill={skin} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <ellipse cx="200" cy="180" rx="105" ry="100" fill={skin} stroke={outline} strokeWidth="6" />
          {/* Whiskers */}
          <path d="M 100 220 L 150 215 M 100 235 L 150 230 M 300 220 L 250 215 M 300 235 L 250 230" stroke={outline} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 2: // Skull
      return (
        <g>
          <path d="M 100 175 Q 100 70 200 70 Q 300 70 300 175 Q 300 250 270 270 L 280 295 L 250 285 L 240 305 L 220 285 L 200 305 L 180 285 L 160 305 L 150 285 L 120 295 L 130 270 Q 100 250 100 175 Z" fill={skin} stroke={outline} strokeWidth="6" strokeLinejoin="round" />
        </g>
      );
    case 3: // Alien
      return (
        <g>
          <ellipse cx="200" cy="160" rx="95" ry="120" fill={skin} stroke={outline} strokeWidth="6" />
          {/* Antenna */}
          <line x1="200" y1="40" x2="200" y2="65" stroke={outline} strokeWidth="5" strokeLinecap="round" />
          <circle cx="200" cy="35" r="10" fill="#fde047" stroke={outline} strokeWidth="4" />
        </g>
      );
    case 4: // Zombie
      return (
        <g>
          <ellipse cx="200" cy="170" rx="110" ry="105" fill={skin} stroke={outline} strokeWidth="6" />
          {/* Stitches */}
          <line x1="120" y1="220" x2="160" y2="220" stroke={outline} strokeWidth="3" />
          <line x1="125" y1="215" x2="125" y2="225" stroke={outline} strokeWidth="3" />
          <line x1="135" y1="215" x2="135" y2="225" stroke={outline} strokeWidth="3" />
          <line x1="145" y1="215" x2="145" y2="225" stroke={outline} strokeWidth="3" />
          <line x1="155" y1="215" x2="155" y2="225" stroke={outline} strokeWidth="3" />
        </g>
      );
    case 5: // Bunny
      return (
        <g>
          {/* Long ears */}
          <ellipse cx="155" cy="80" rx="14" ry="50" fill={skin} stroke={outline} strokeWidth="5" />
          <ellipse cx="245" cy="80" rx="14" ry="50" fill={skin} stroke={outline} strokeWidth="5" />
          <ellipse cx="155" cy="80" rx="6" ry="38" fill="#fda4af" />
          <ellipse cx="245" cy="80" rx="6" ry="38" fill="#fda4af" />
          <ellipse cx="200" cy="180" rx="105" ry="100" fill={skin} stroke={outline} strokeWidth="6" />
        </g>
      );
  }
  return null;
}

function Eyes({ idx, outline, fill }: { idx: number; outline: string; fill: string }) {
  switch (idx) {
    case 0: // Sunglasses
      return (
        <g>
          <rect x="130" y="160" width="65" height="32" rx="6" fill={outline} />
          <rect x="205" y="160" width="65" height="32" rx="6" fill={outline} />
          <rect x="195" y="170" width="10" height="6" fill={outline} />
          <line x1="135" y1="166" x2="155" y2="166" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <line x1="210" y1="166" x2="230" y2="166" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
        </g>
      );
    case 1: // Bored / half-lidded — heavy upper eyelid with pupil peeking out
      return (
        <g>
          <ellipse cx="165" cy="180" rx="22" ry="18" fill="white" stroke={outline} strokeWidth="4" />
          <ellipse cx="235" cy="180" rx="22" ry="18" fill="white" stroke={outline} strokeWidth="4" />
          <path d="M 143 180 Q 165 168 187 180 L 187 175 Q 165 158 143 175 Z" fill={outline} />
          <path d="M 213 180 Q 235 168 257 180 L 257 175 Q 235 158 213 175 Z" fill={outline} />
          <ellipse cx="165" cy="186" rx="6" ry="7" fill={outline} />
          <ellipse cx="235" cy="186" rx="6" ry="7" fill={outline} />
        </g>
      );
    case 2: // Dollar signs
      return (
        <g>
          <circle cx="165" cy="175" r="22" fill="white" stroke={outline} strokeWidth="4" />
          <circle cx="235" cy="175" r="22" fill="white" stroke={outline} strokeWidth="4" />
          <text x="165" y="184" textAnchor="middle" fontSize="26" fontWeight="800" fontFamily="Inter, sans-serif" fill="#16a34a">$</text>
          <text x="235" y="184" textAnchor="middle" fontSize="26" fontWeight="800" fontFamily="Inter, sans-serif" fill="#16a34a">$</text>
        </g>
      );
    case 3: // X-eyes
      return (
        <g stroke={outline} strokeWidth="5" strokeLinecap="round">
          <line x1="150" y1="160" x2="180" y2="190" />
          <line x1="180" y1="160" x2="150" y2="190" />
          <line x1="220" y1="160" x2="250" y2="190" />
          <line x1="250" y1="160" x2="220" y2="190" />
        </g>
      );
    case 4: // Fire/glowing
      return (
        <g>
          <circle cx="165" cy="175" r="18" fill={fill} />
          <circle cx="165" cy="175" r="18" fill="none" stroke={outline} strokeWidth="4" />
          <circle cx="165" cy="175" r="8" fill={outline} />
          <circle cx="235" cy="175" r="18" fill={fill} />
          <circle cx="235" cy="175" r="18" fill="none" stroke={outline} strokeWidth="4" />
          <circle cx="235" cy="175" r="8" fill={outline} />
        </g>
      );
    case 5: // Wide round
      return (
        <g>
          <circle cx="165" cy="175" r="22" fill="white" stroke={outline} strokeWidth="4" />
          <circle cx="235" cy="175" r="22" fill="white" stroke={outline} strokeWidth="4" />
          <circle cx="170" cy="178" r="9" fill={outline} />
          <circle cx="240" cy="178" r="9" fill={outline} />
          <circle cx="173" cy="174" r="3" fill="white" />
          <circle cx="243" cy="174" r="3" fill="white" />
        </g>
      );
    case 6: // Side-eye — both pupils glance left, suspicious vibe
      return (
        <g>
          <ellipse cx="165" cy="178" rx="22" ry="16" fill="white" stroke={outline} strokeWidth="4" />
          <ellipse cx="235" cy="178" rx="22" ry="16" fill="white" stroke={outline} strokeWidth="4" />
          <circle cx="152" cy="180" r="8" fill={outline} />
          <circle cx="222" cy="180" r="8" fill={outline} />
          <circle cx="155" cy="177" r="2.5" fill="white" />
          <circle cx="225" cy="177" r="2.5" fill="white" />
        </g>
      );
  }
  return null;
}

function Mouth({ idx, outline }: { idx: number; outline: string }) {
  switch (idx) {
    case 0: // Smirk
      return <path d="M 170 235 Q 200 250 230 232" stroke={outline} strokeWidth="5" fill="none" strokeLinecap="round" />;
    case 1: // Wide smile
      return (
        <g>
          <path d="M 165 230 Q 200 270 235 230 Z" fill={outline} stroke={outline} strokeWidth="3" strokeLinejoin="round" />
          <path d="M 175 240 L 225 240" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 2: // Tongue out
      return (
        <g>
          <path d="M 175 230 Q 200 250 225 230" stroke={outline} strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="200" cy="252" rx="14" ry="20" fill="#ec4899" stroke={outline} strokeWidth="3" />
        </g>
      );
    case 3: // Cigar
      return (
        <g>
          <path d="M 170 232 Q 195 245 220 232" stroke={outline} strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="220" y="225" width="50" height="14" rx="3" fill="#7c3a1a" stroke={outline} strokeWidth="3" />
          <rect x="265" y="225" width="8" height="14" rx="2" fill="#fb923c" />
          <path d="M 270 220 Q 280 210 275 200 Q 285 195 280 185" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" fill="none" />
        </g>
      );
    case 4: // Frown
      return <path d="M 170 245 Q 200 225 230 245" stroke={outline} strokeWidth="5" fill="none" strokeLinecap="round" />;
    case 5: // Open / shock
      return (
        <g>
          <ellipse cx="200" cy="240" rx="20" ry="22" fill={outline} />
          <ellipse cx="200" cy="246" rx="14" ry="14" fill="#ec4899" />
        </g>
      );
  }
  return null;
}

function Hat({ idx, outline, color }: { idx: number; outline: string; color: string }) {
  switch (idx) {
    case 0: // Crown
      return (
        <g>
          <path d="M 110 110 L 130 60 L 165 95 L 200 50 L 235 95 L 270 60 L 290 110 Z" fill="#fbbf24" stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <rect x="110" y="105" width="180" height="14" fill="#f59e0b" stroke={outline} strokeWidth="4" />
          <circle cx="130" cy="60" r="6" fill="#ef4444" stroke={outline} strokeWidth="3" />
          <circle cx="200" cy="50" r="6" fill={color} stroke={outline} strokeWidth="3" />
          <circle cx="270" cy="60" r="6" fill="#3b82f6" stroke={outline} strokeWidth="3" />
        </g>
      );
    case 1: // Backward cap
      return (
        <g>
          <path d="M 100 130 Q 100 60 200 60 Q 300 60 300 130 Z" fill={color} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <rect x="305" y="115" width="30" height="20" rx="6" fill={color} stroke={outline} strokeWidth="5" />
          <line x1="100" y1="105" x2="300" y2="105" stroke={outline} strokeWidth="3" opacity="0.5" />
          <text x="200" y="100" textAnchor="middle" fontSize="22" fontWeight="800" fontFamily="JetBrains Mono, monospace" fill="white">DCR</text>
        </g>
      );
    case 2: // Beanie
      return (
        <g>
          <path d="M 100 140 Q 100 50 200 45 Q 300 50 300 140 Z" fill={color} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <rect x="100" y="125" width="200" height="20" fill={color} stroke={outline} strokeWidth="4" opacity="0.7" />
          <circle cx="200" cy="40" r="14" fill="white" stroke={outline} strokeWidth="4" />
        </g>
      );
    case 3: // Bandana
      return (
        <g>
          <path d="M 95 110 Q 200 75 305 110 L 305 130 Q 200 105 95 130 Z" fill={color} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="140" cy="118" r="5" fill="white" />
          <circle cx="180" cy="105" r="5" fill="white" />
          <circle cx="220" cy="105" r="5" fill="white" />
          <circle cx="260" cy="118" r="5" fill="white" />
          <path d="M 305 110 L 360 95 L 350 130 L 305 130 Z" fill={color} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        </g>
      );
    case 4: // Fire crown
      return (
        <g>
          <path d="M 105 130 Q 130 50 155 100 Q 175 30 200 90 Q 220 30 245 100 Q 270 50 295 130 Z" fill="#f97316" stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <path d="M 130 110 Q 155 80 165 110 M 195 100 Q 215 70 225 105" fill="#fde047" stroke={outline} strokeWidth="3" />
          <ellipse cx="200" cy="125" rx="105" ry="12" fill={color} stroke={outline} strokeWidth="4" />
        </g>
      );
    case 5: // Propeller cap
      return (
        <g>
          <path d="M 110 130 Q 110 60 200 55 Q 290 60 290 130 Z" fill={color} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <path d="M 110 120 L 290 120" stroke={outline} strokeWidth="3" opacity="0.5" />
          <line x1="200" y1="60" x2="200" y2="35" stroke={outline} strokeWidth="4" />
          <ellipse cx="200" cy="33" rx="35" ry="6" fill="#fbbf24" stroke={outline} strokeWidth="3" />
          <path d="M 200 55 Q 110 60 110 130 L 145 130 Q 145 80 200 65 Z" fill="#ef4444" stroke={outline} strokeWidth="4" strokeLinejoin="round" />
          <path d="M 200 55 Q 290 60 290 130 L 255 130 Q 255 80 200 65 Z" fill="#22c55e" stroke={outline} strokeWidth="4" strokeLinejoin="round" />
        </g>
      );
    case 6: // Halo (no hat — saintly)
      return (
        <g>
          <ellipse cx="200" cy="50" rx="80" ry="12" fill="none" stroke="#fde047" strokeWidth="6" />
          <ellipse cx="200" cy="50" rx="80" ry="12" fill="none" stroke={outline} strokeWidth="2" />
        </g>
      );
  }
  return null;
}

function Extras({ idx, outline }: { idx: number; outline: string }) {
  switch (idx) {
    case 0:
    case 1:
      return null; // No extra — keeps roughly 25% of mascots clean.
    case 2: // Gold earring
      return (
        <g>
          <circle cx="105" cy="220" r="8" fill="#fbbf24" stroke={outline} strokeWidth="3" />
          <circle cx="105" cy="220" r="3" fill={outline} />
        </g>
      );
    case 3: // Pink blush
      return (
        <g opacity="0.55">
          <ellipse cx="135" cy="215" rx="18" ry="10" fill="#fb7185" />
          <ellipse cx="265" cy="215" rx="18" ry="10" fill="#fb7185" />
        </g>
      );
    case 4: // Freckles
      return (
        <g fill={outline}>
          <circle cx="145" cy="210" r="2.5" />
          <circle cx="155" cy="218" r="2.5" />
          <circle cx="135" cy="220" r="2.5" />
          <circle cx="245" cy="210" r="2.5" />
          <circle cx="255" cy="218" r="2.5" />
          <circle cx="265" cy="220" r="2.5" />
        </g>
      );
    case 5: // Mole
      return <circle cx="245" cy="225" r="4" fill={outline} />;
    case 6: // Sweat drop
      return (
        <g>
          <path d="M 100 180 Q 95 200 100 215 Q 110 200 105 180 Z" fill="#7dd3fc" stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    case 7: // Scar
      return (
        <g stroke={outline} strokeWidth="3" strokeLinecap="round" fill="none">
          <line x1="245" y1="135" x2="265" y2="160" />
          <line x1="248" y1="142" x2="252" y2="146" />
          <line x1="256" y1="150" x2="260" y2="154" />
        </g>
      );
  }
  return null;
}
