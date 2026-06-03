const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

export function ProductPhone() {
  return (
    <div className="mx-auto max-h-[220px] w-full max-w-[300px] overflow-hidden sm:max-h-none sm:max-w-[360px]">
      <div className="rounded-[38px] border border-black/15 bg-[#101010] p-3 shadow-[0_26px_80px_rgba(0,0,0,0.22)]">
        <div className="paper-surface overflow-hidden rounded-[30px] border border-white/35 px-5 pb-6 pt-5">
          <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-black/20" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Today</p>
              <p className="editorial text-2xl text-black">Welcome back</p>
            </div>
            <div className="size-10 rounded-full border border-black/15 bg-white/70" />
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {weekDays.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="grid h-10 place-items-center rounded-full border border-black/10 bg-white/64 text-xs font-medium text-black"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="editorial text-[2.55rem] leading-none text-black">
              Check-In
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Name what is here, then see the pattern with care.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-black/10 bg-white/72 p-4">
              <div className="h-1.5 w-12 rounded-full bg-[#f9bc2c]" />
              <p className="mt-4 text-sm font-medium text-black">Glimmer</p>
              <p className="mt-1 text-xs leading-5 text-muted">Tracked joy</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white/72 p-4">
              <div className="h-1.5 w-12 rounded-full bg-[#f45253]" />
              <p className="mt-4 text-sm font-medium text-black">Trigger</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Seen clearly
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-black/10 bg-[#101010] p-4 text-white">
            <p className="text-xs text-white/58">Daily Zenfulnote</p>
            <p className="editorial mt-2 text-xl leading-6">
              “Return to yourself gently.”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
