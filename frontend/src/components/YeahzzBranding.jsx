export function YeahzzHeaderBadge({ className = "" }) {
  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <img src="/auth-assets/classcom.svg" alt="Classroom" className="h-7 w-24 object-contain" />
      <img src="/auth-assets/yeahzz-mark.svg" alt="Yeahzz" className="h-7 w-24 object-contain" />
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
    <div className={`inline-flex flex-col items-center justify-center gap-1.5 ${className}`}>
      {showText ? (
        <span className={`text-center text-[11px] font-medium tracking-wide text-slate-600 ${textClassName}`}>
          Classroom collaboration with <span className="font-semibold">Yeahzz</span>
        </span>
      ) : null}
      <div className="flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
        {showClassroomLogo ? (
          <img src="/auth-assets/classcom.svg" alt="Classroom logo" className="h-7 w-24 object-contain" />
        ) : null}
        <img src="/auth-assets/yeahzz-mark.svg" alt="Yeahzz logo" className="h-7 w-24 object-contain" />
      </div>
    </div>
  );
}
