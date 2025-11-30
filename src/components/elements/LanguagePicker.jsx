import React from 'react';
import { LANGS, SUPPORTED_LANGS } from '../../lib/api.js';

export default function LanguagePicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;

    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  return (
    <div className="lang-picker" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((prev) => !prev)}>
        {LANGS[value]}
      </button>
      {open && (
        <div className="dropdown">
          {SUPPORTED_LANGS.map((code) => (
            <button
              key={code}
              className={`item ${code === value ? 'active' : ''}`}
              onClick={() => {
                onChange(code);
                setOpen(false);
              }}
            >
              {LANGS[code]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
