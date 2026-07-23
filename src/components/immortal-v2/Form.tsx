import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

type FieldShellProps = {
  label?: string;
  help?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function IV2Field({
  label,
  help,
  error,
  children,
  className = '',
}: FieldShellProps) {
  return (
    <div className={`iv2-field ${className}`}>
      {label && <span className="iv2-label">{label}</span>}
      {children}
      {error ? (
        <p className="iv2-error">{error}</p>
      ) : help ? (
        <p className="iv2-help">{help}</p>
      ) : null}
    </div>
  );
}

export function IV2Input({
  label,
  help,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  help?: string;
  error?: string;
}) {
  return (
    <IV2Field label={label} help={help} error={error}>
      <input
        className={`iv2-input ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </IV2Field>
  );
}

export function IV2Textarea({
  label,
  help,
  error,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  help?: string;
  error?: string;
}) {
  return (
    <IV2Field label={label} help={help} error={error}>
      <textarea
        className={`iv2-textarea ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </IV2Field>
  );
}

export function IV2Select({
  label,
  help,
  error,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  help?: string;
  error?: string;
}) {
  return (
    <IV2Field label={label} help={help} error={error}>
      <select
        className={`iv2-select ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
    </IV2Field>
  );
}

export function IV2Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="iv2-check">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function IV2Switch({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="iv2-switch">
      <input type="checkbox" {...props} />
      <span className="iv2-switch-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function IV2File({
  label,
  help,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  help?: string;
  error?: string;
}) {
  return (
    <IV2Field label={label} help={help} error={error}>
      <input
        type="file"
        className={`iv2-file ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </IV2Field>
  );
}
