export function YeahzzHeaderBadge({ className = "" }) {
  return (
    <div
      className={`inline-flex items-center justify-center gap-3 ${className}`}
    >
      <img
        src="/auth-assets/classcom.svg"
        alt="Classroom"
        className="h-8 w-24 object-contain"
      />

      <img
        src="/auth-assets/yeahzz-mark.svg"
        alt="Yeahzz"
        className="h-8 w-24 object-contain"
      />
    </div>
  );
}

export function PoweredByYeahzz({
  className = "",
  textClassName = "",
  logoClassName = "h-8 w-24",
  showText = true,
  showClassroomLogo = true,
}) {
  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      {showText ? (
        <span className={`whitespace-nowrap text-[10px] font-medium tracking-wide text-slate-500 ${textClassName}`}>
          Classroom collaboration with <span className="font-semibold">Yeahzz</span>
        </span>
      ) : null}
      <div className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1">
        {showClassroomLogo ? (
          <img src="/auth-assets/classcom.svg" alt="Classroom logo" className="h-8 w-24 object-contain" />
        ) : null}
        {showClassroomLogo ? <span className="text-xs font-bold text-slate-400">+</span> : null}
        <img src="/auth-assets/yeahzz-mark.svg" alt="Yeahzz logo" className={`${logoClassName} object-contain`} />
      </div>
    </div>
  );
}
