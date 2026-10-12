type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export default function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  if (compact) {
    return (
      <svg viewBox="0 0 92 56" aria-label="ATR Anzak Tours and Resorts" className={className} role="img">
        <rect width="92" height="56" rx="8" fill="#FDB913" />
        <text x="8" y="40" fill="#FFFFFF" fontFamily="Arial Black, Arial, sans-serif" fontSize="32" fontWeight="900">ATR</text>
        <path d="M49 13c6 5 8 12 8 21M49 13c-4 3-6 6-7 10M49 13c1 0 4 3 6 7M49 13c-3-2-6-2-9-1M49 13c2-2 6-2 9 0" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 520 116" aria-label="ATR Anzak Tours and Resorts" className={className} role="img">
      <text x="12" y="82" fill="#FDB913" fontFamily="Arial Black, Arial, sans-serif" fontSize="78" fontWeight="900" letterSpacing="-5">ATR</text>
      <path d="M136 22c11 9 15 24 15 46M136 22c-8 4-13 12-15 22M136 22c6 3 11 10 13 18M136 22c-8-4-15-3-21 1M136 22c7-5 15-4 22 1" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M209 14v88" stroke="#1B1B1B" strokeWidth="3" />
      <text x="232" y="60" fill="#1B1B1B" fontFamily="Arial, sans-serif" fontSize="48" fontWeight="500" letterSpacing="1">ANZAK</text>
      <text x="235" y="89" fill="#1B1B1B" fontFamily="Arial, sans-serif" fontSize="21" fontWeight="700" letterSpacing="1.2">TOURS &amp; RESORTS</text>
    </svg>
  );
}
