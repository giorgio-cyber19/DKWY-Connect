export function MotifCluster({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="210" viewBox="0 0 300 210" fill="none" aria-hidden="true" className={className} style={style}>
      <path d="M26 182V108a30 30 0 0 1 60 0v74z" stroke="currentColor" strokeOpacity=".5" strokeWidth="2.5" />
      <path d="M56 78v104M26 136h60" stroke="currentColor" strokeOpacity=".35" strokeWidth="2.5" />
      <g transform="translate(118 82)">
        <path d="M10 0c15-12 41-12 58 0-17 12-43 12-58 0z" stroke="currentColor" strokeOpacity=".7" strokeWidth="2.5" />
        <path d="M10 0-5-12v24z" stroke="currentColor" strokeOpacity=".7" strokeWidth="2.5" />
      </g>
      <g transform="translate(232 124)" fill="currentColor" opacity=".75">
        <rect x="-5" y="-34" width="10" height="68" rx="4" />
        <rect x="-22" y="-14" width="44" height="10" rx="4" />
      </g>
      <g stroke="currentColor" strokeOpacity=".6" strokeWidth="2.5" strokeLinecap="round">
        <path d="M112 190v-40" />
        <path d="M112 166l-11-9M112 166l11-9M112 180l-11-9M112 180l11-9" />
      </g>
      <g fill="currentColor" opacity=".6">
        <path d="M176 34l2.8 7.6 7.6 2.8-7.6 2.8-2.8 7.6-2.8-7.6-7.6-2.8 7.6-2.8z" />
        <circle cx="272" cy="52" r="3.2" />
        <circle cx="150" cy="158" r="3.6" />
      </g>
    </svg>
  );
}
