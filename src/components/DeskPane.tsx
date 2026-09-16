import { useRef, type PointerEvent, type ReactNode } from 'react'

type Props = {
  title: string
  extra?: ReactNode
  open: boolean
  height: number
  min?: number
  max?: number
  onToggle: () => void
  onHeight: (height: number) => void
  children: ReactNode
}

export function DeskPane({ title, extra, open, height, min = 120, max = 520, onToggle, onHeight, children }: Props) {
  const drag = useRef<{ y: number; h: number } | null>(null)

  function onGripDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    drag.current = { y: event.clientY, h: height }
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  function onGripMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start) return
    onHeight(Math.round(Math.min(max, Math.max(min, start.h + (event.clientY - start.y)))))
  }

  function onGripUp() {
    if (!drag.current) return
    drag.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  return (
    <section className={open ? 'desk-pane' : 'desk-pane shut'} style={open ? { height } : undefined}>
      <div className="desk-pane-bar">
        <button type="button" className="desk-pane-toggle" aria-expanded={open} onClick={onToggle}>
          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          {title}
        </button>
        {extra}
      </div>
      {open ? <div className="desk-pane-body">{children}</div> : null}
      {open ? (
        <div
          className="desk-pane-grip"
          role="separator"
          aria-orientation="horizontal"
          aria-label={`Cambiar tamaño de ${title}`}
          title="Arrastrá para cambiar el tamaño"
          tabIndex={0}
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
        />
      ) : null}
    </section>
  )
}
