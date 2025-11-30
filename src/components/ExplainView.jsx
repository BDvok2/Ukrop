import React from 'react';

export default function ExplainView({
  input,
  setInput,
  shown,
  setShown,
  locked,
  setLocked,
  text,
  onWord,
  scrollToTop,
  onSubmit,
  onUnlock,
}) {
  const words = React.useMemo(() => (input.trim().length ? input.trim().split(/\s+/) : []), [input]);

  const send = React.useCallback(() => {
    const value = input.trim();
    if (!value) return;
    setShown(true);
    setLocked(true);
    onSubmit?.(value);
    scrollToTop?.();
  }, [input, onSubmit, scrollToTop, setLocked, setShown]);

  const onKeyDown = React.useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    },
    [send]
  );

  return (
    <section className="view explain">
      <div className="info-card" id="explain-box" hidden={!shown}>
        <div className="title">Значення:</div>
        <p id="explain-text">{text}</p>
      </div>
      <div className="card input-card">
        {locked ? (
          <div className="tokenized-wrapper">
            <div className="tokenized" aria-label="введене речення">
              {words.map((word, index) => (
                <button key={index} type="button" className="word" onClick={() => onWord(word)}>
                  {word}
                </button>
              ))}
            </div>
            <button type="button" className="secondary-btn" onClick={onUnlock}>
              Змінити речення
            </button>
          </div>
        ) : (
          <>
            <textarea
              id="explain-input"
              className="input-area"
              placeholder="Напишіть щось для пояснення..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <button id="send-explain" className="send-btn" aria-label="надіслати" onClick={send}>
              →
            </button>
          </>
        )}
      </div>
    </section>
  );
}
