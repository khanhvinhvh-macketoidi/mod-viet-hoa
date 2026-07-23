import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function ImmortalInput({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="im-field">
      {label && <span className="im-field-label">{label}</span>}
      <input className={`im-input ${className}`} {...props} />
    </label>
  );
}

export function ImmortalTextarea({
  label,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="im-field">
      {label && <span className="im-field-label">{label}</span>}
      <textarea className={`im-textarea ${className}`} {...props} />
    </label>
  );
}

export function ImmortalSelect({
  label,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="im-field">
      {label && <span className="im-field-label">{label}</span>}
      <select className={`im-select ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
