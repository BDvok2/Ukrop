import React from 'react';
import { translateText } from '../lib/api.js';

export default function TranslateView({ from, to }) {
  const [source, setSource] = React.useState('');
  const [target, setTarget] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const controllerRef = React.useRef(null);

  React.useEffect(() => {
    if (!source.trim()) {
      setTarget('');
      setError('');
      return;
    }

    const handle = setTimeout(async () => {
      try {
        controllerRef.current?.abort?.();
        controllerRef.current = new AbortController();
        setLoading(true);
        setError('');
        const translated = await translateText(source, from, to, controllerRef.current.signal);
        setTarget(translated);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Не вдалося перекласти. Спробуйте ще раз.');
        }
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(handle);
  }, [source, from, to]);

  return (
    <section className="view translate">
      <div className="card">
        <textarea
          placeholder="Введіть текст..."
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
      </div>
      <div className="card">
        <textarea
          placeholder={loading ? 'Переклад...' : 'Enter text...'}
          value={error ? error : target}
          readOnly
        />
      </div>
    </section>
  );
}
