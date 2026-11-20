export default function CharacterIllustration({ imageKey }) {
  switch (imageKey) {
    case "clever":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#EEF2FF" />
          <circle cx="60" cy="44" r="22" fill="#FDE68A" />
          <path d="M38 40 C40 20, 80 20, 82 40 Z" fill="#4338CA" />
          <circle cx="51" cy="45" r="7" fill="none" stroke="#1E293B" strokeWidth="2.5" />
          <circle cx="69" cy="45" r="7" fill="none" stroke="#1E293B" strokeWidth="2.5" />
          <line x1="58" y1="45" x2="62" y2="45" stroke="#1E293B" strokeWidth="2.5" />
          <circle cx="51" cy="45" r="1.8" fill="#1E293B" />
          <circle cx="69" cy="45" r="1.8" fill="#1E293B" />
          <path d="M54 55 Q60 60 66 55" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M34 74 L60 82 L86 74 L86 104 L60 110 L34 104 Z" fill="#FFFFFF" stroke="#6366F1" strokeWidth="2.5" />
          <line x1="60" y1="82" x2="60" y2="110" stroke="#6366F1" strokeWidth="2" />
          <line x1="41" y1="84" x2="54" y2="87" stroke="#94A3B8" strokeWidth="2" />
          <line x1="66" y1="87" x2="79" y2="84" stroke="#94A3B8" strokeWidth="2" />
        </svg>
      );
    case "shy":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#FDF2F8" />
          <path d="M34 48 C32 22, 88 22, 86 48 L88 80 L32 80 Z" fill="#92400E" />
          <circle cx="60" cy="48" r="20" fill="#FED7AA" />
          <path d="M44 36 C52 28, 68 28, 76 36" fill="#92400E" />
          <path d="M49 48 Q52 51 55 48" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M65 48 Q68 51 71 48" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <circle cx="46" cy="54" r="4" fill="#FDA4AF" />
          <circle cx="74" cy="54" r="4" fill="#FDA4AF" />
          <rect x="42" y="56" width="14" height="22" rx="7" fill="#FED7AA" stroke="#F97316" strokeWidth="1.5" />
          <rect x="64" y="56" width="14" height="22" rx="7" fill="#FED7AA" stroke="#F97316" strokeWidth="1.5" />
          <path d="M38 82 Q60 76 82 82 L86 112 L34 112 Z" fill="#EC4899" />
        </svg>
      );
    case "polite":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#ECFDF5" />
          <rect x="74" y="20" width="30" height="84" rx="4" fill="#FDE68A" stroke="#D97706" strokeWidth="2.5" />
          <circle cx="80" cy="64" r="3" fill="#B45309" />
          <circle cx="44" cy="40" r="15" fill="#FED7AA" />
          <path d="M29 36 C32 22, 56 22, 59 36 Z" fill="#1E293B" />
          <circle cx="39" cy="40" r="1.8" fill="#1E293B" />
          <circle cx="49" cy="40" r="1.8" fill="#1E293B" />
          <path d="M39 46 Q44 50 49 46" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 58 L62 58 L66 104 L22 104 Z" fill="#10B981" />
          <path d="M58 66 L76 64" stroke="#FED7AA" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case "stubborn":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#FEF2F2" />
          <circle cx="60" cy="42" r="20" fill="#FED7AA" />
          <path d="M40 36 C44 20, 78 20, 80 38 Z" fill="#78350F" />
          <line x1="46" y1="36" x2="55" y2="40" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="74" y1="36" x2="65" y2="40" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="51" cy="44" r="2" fill="#1E293B" />
          <circle cx="69" cy="44" r="2" fill="#1E293B" />
          <path d="M52 54 Q60 49 68 54" fill="none" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M34 68 L86 68 L90 108 L30 108 Z" fill="#EF4444" />
          <rect x="34" y="76" width="52" height="14" rx="7" fill="#DC2626" stroke="#991B1B" strokeWidth="2" />
        </svg>
      );
    case "curious":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#F0FDF4" />
          <circle cx="42" cy="44" r="18" fill="#FED7AA" />
          <path d="M24 40 C26 20, 58 20, 60 40 Z" fill="#B45309" />
          <circle cx="37" cy="44" r="2" fill="#1E293B" />
          <circle cx="47" cy="44" r="2" fill="#1E293B" />
          <circle cx="42" cy="52" r="2.2" fill="#1E293B" />
          <path d="M24 64 L60 64 L64 108 L20 108 Z" fill="#22C55E" />
          <circle cx="80" cy="52" r="14" fill="#E0F2FE" stroke="#0284C7" strokeWidth="3.5" />
          <line x1="68" y1="64" x2="54" y2="82" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="77" cy="50" rx="4" ry="7" fill="#F59E0B" />
          <ellipse cx="84" cy="50" rx="4" ry="7" fill="#F59E0B" />
          <line x1="80" y1="45" x2="80" y2="57" stroke="#1E293B" strokeWidth="2" />
        </svg>
      );
    case "patient":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#EFF6FF" />
          <circle cx="88" cy="36" r="12" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2.5" />
          <polyline points="88,29 88,36 93,39" fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="46" cy="42" r="17" fill="#FED7AA" />
          <path d="M29 38 C32 22, 60 22, 63 38 Z" fill="#334155" />
          <circle cx="40" cy="42" r="2" fill="#1E293B" />
          <circle cx="52" cy="42" r="2" fill="#1E293B" />
          <path d="M40 49 Q46 53 52 49" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 62 L64 62 L66 108 L26 108 Z" fill="#3B82F6" />
          <line x1="76" y1="74" x2="104" y2="74" stroke="#94A3B8" strokeWidth="3" />
          <line x1="80" y1="74" x2="80" y2="108" stroke="#64748B" strokeWidth="3" />
          <line x1="100" y1="74" x2="100" y2="108" stroke="#64748B" strokeWidth="3" />
        </svg>
      );
    case "spiky":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#FFFBEB" />
          <polygon
            points="35,44 38,24 48,34 56,16 64,33 74,18 78,35 88,26 84,46"
            fill="#1E293B"
          />
          <circle cx="60" cy="54" r="21" fill="#FED7AA" />
          <circle cx="52" cy="52" r="2.2" fill="#1E293B" />
          <circle cx="68" cy="52" r="2.2" fill="#1E293B" />
          <path d="M52 62 Q60 68 68 62" fill="none" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M36 78 L84 78 L88 112 L32 112 Z" fill="#F59E0B" />
        </svg>
      );
    case "well_built":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#ECFEFF" />
          <circle cx="60" cy="34" r="16" fill="#FED7AA" />
          <path d="M44 30 C46 18, 74 18, 76 30 Z" fill="#334155" />
          <circle cx="54" cy="34" r="2" fill="#1E293B" />
          <circle cx="66" cy="34" r="2" fill="#1E293B" />
          <path d="M54 41 Q60 44 66 41" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 58 Q60 48 102 58 L92 108 L28 108 Z" fill="#0891B2" />
          <rect x="44" y="66" width="32" height="22" rx="4" fill="#06B6D4" opacity="0.5" />
        </svg>
      );
    case "pigtails":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#FAF5FF" />
          <ellipse cx="28" cy="56" rx="8" ry="18" fill="#7C2D12" />
          <ellipse cx="92" cy="56" rx="8" ry="18" fill="#7C2D12" />
          <circle cx="34" cy="40" r="5" fill="#EC4899" />
          <circle cx="86" cy="40" r="5" fill="#EC4899" />
          <circle cx="60" cy="48" r="21" fill="#FED7AA" />
          <path d="M39 44 C42 22, 78 22, 81 44 Z" fill="#7C2D12" />
          <circle cx="52" cy="48" r="2.2" fill="#1E293B" />
          <circle cx="68" cy="48" r="2.2" fill="#1E293B" />
          <path d="M53 58 Q60 63 67 58" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 74 L84 74 L88 112 L32 112 Z" fill="#A855F7" />
        </svg>
      );
    case "moustache":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#F1F5F9" />
          <circle cx="60" cy="48" r="22" fill="#FED7AA" />
          <path d="M38 42 C40 20, 80 20, 82 42 Z" fill="#475569" />
          <circle cx="52" cy="45" r="2.2" fill="#1E293B" />
          <circle cx="68" cy="45" r="2.2" fill="#1E293B" />
          <path
            d="M42 56 C46 50, 56 52, 60 56 C64 52, 74 50, 78 56 C74 62, 64 60, 60 58 C56 60, 46 62, 42 56 Z"
            fill="#1E293B"
          />
          <path d="M34 74 L86 74 L90 112 L30 112 Z" fill="#475569" />
        </svg>
      );
    case "curly":
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#FFF7ED" />
          <circle cx="36" cy="40" r="11" fill="#9A3412" />
          <circle cx="48" cy="28" r="12" fill="#9A3412" />
          <circle cx="64" cy="26" r="12" fill="#9A3412" />
          <circle cx="80" cy="34" r="12" fill="#9A3412" />
          <circle cx="84" cy="52" r="11" fill="#9A3412" />
          <circle cx="34" cy="56" r="10" fill="#9A3412" />
          <circle cx="60" cy="50" r="20" fill="#FED7AA" />
          <circle cx="52" cy="48" r="2.2" fill="#1E293B" />
          <circle cx="68" cy="48" r="2.2" fill="#1E293B" />
          <path d="M53 58 Q60 63 67 58" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 74 L84 74 L88 112 L32 112 Z" fill="#F97316" />
        </svg>
      );
    case "freckles":
    default:
      return (
        <svg viewBox="0 0 120 120" className="h-24 w-24">
          <rect width="120" height="120" rx="18" fill="#FEFCE8" />
          <circle cx="60" cy="48" r="22" fill="#FED7AA" />
          <path d="M38 42 C42 20, 78 20, 82 42 Z" fill="#EA580C" />
          <circle cx="51" cy="45" r="2.2" fill="#1E293B" />
          <circle cx="69" cy="45" r="2.2" fill="#1E293B" />
          <circle cx="45" cy="52" r="1.4" fill="#B45309" />
          <circle cx="49" cy="54" r="1.4" fill="#B45309" />
          <circle cx="53" cy="51" r="1.4" fill="#B45309" />
          <circle cx="67" cy="51" r="1.4" fill="#B45309" />
          <circle cx="71" cy="54" r="1.4" fill="#B45309" />
          <circle cx="75" cy="52" r="1.4" fill="#B45309" />
          <path d="M52 60 Q60 65 68 60" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <path d="M34 74 L86 74 L90 112 L30 112 Z" fill="#EAB308" />
        </svg>
      );
  }
}
