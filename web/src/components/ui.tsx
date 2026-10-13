import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  ghost: 'border border-line text-ink hover:bg-surface-2',
  danger: 'border border-danger/60 text-danger hover:bg-danger/10',
}

export function Button({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-line bg-surface p-5', className)}>{children}</div>
}

const fieldBase = 'w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted'

/** La ayuda y el error van fuera del <label> para que el nombre accesible del campo sea solo su etiqueta. */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{label}</span>
        {children}
      </label>
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={cx(fieldBase, props.className)} />
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={cx(fieldBase, props.className)} />
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={cx(fieldBase, props.className)} />

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'rounded-lg border px-4 py-3 text-sm',
        tone === 'danger' ? 'border-danger/50 bg-danger/10 text-danger' : 'border-accent/40 bg-accent/10 text-ink',
      )}
    >
      {children}
    </div>
  )
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-muted">
      {label}
    </p>
  )
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 space-y-2">
      {eyebrow && <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
      {children && <div className="max-w-2xl text-muted">{children}</div>}
    </header>
  )
}
