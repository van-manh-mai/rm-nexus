// Bank chrome: a red utility bar + white nav, evoking a real institutional online-banking
// shell so the dashboard reads as "lives inside an enterprise" rather than a demo page.

const BANK_RED = '#C8102E'

interface WbcNavProps {
  title?: string
}

export function WbcNav({ title = 'Next Best Conversation' }: WbcNavProps) {
  return (
    <div className="sticky top-0 z-20">
      <div
        className="flex h-8 items-center px-4 text-xs font-semibold tracking-wide text-white"
        style={{ backgroundColor: BANK_RED }}
      >
        AUSSIE BANK
        <span className="ml-auto font-normal opacity-90">Institutional Banking</span>
      </div>
      <div className="flex h-16 items-center gap-4 border-b border-zinc-200 bg-white px-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-sm font-bold text-white"
          style={{ backgroundColor: BANK_RED }}
        >
          WBC
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-zinc-900">RM Nexus</span>
          <span className="text-[11px] text-zinc-500">Aussie Bank</span>
        </div>
        <h1 className="flex-1 text-center text-base font-semibold text-zinc-900 sm:text-lg">
          {title}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/rm-nexus-documentation.html"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Documentation ↗
          </a>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
            RM Book: 8 clients
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
            Sarah Chen
          </span>
        </div>
      </div>
    </div>
  )
}
