import React from 'react';

function useStructuredExplanation(text) {
  return React.useMemo(() => {
    if (!text?.trim()) return null;
    const sectionRegex = /^(\d+)\.\s*(.+?):\s*(.*)$/i;
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const sections = [];
    let current = null;

    lines.forEach((line) => {
      const match = line.match(sectionRegex);
      if (match) {
        if (current) {
          sections.push(current);
        }
        const [, , rawTitle, rawBody] = match;
        current = {
          title: rawTitle.trim(),
          bodyParts: rawBody ? [rawBody.trim()] : [],
        };
      } else if (current) {
        current.bodyParts.push(line);
      }
    });

    if (current) {
      sections.push(current);
    }

    const normalized = sections
      .map(({ title, bodyParts }) => ({
        title,
        body: bodyParts.join(' ').replace(/\s+/g, ' ').trim(),
      }))
      .filter((section) => section.body.length);

    return normalized.length ? normalized : null;
  }, [text]);
}

function formatTextWithBold(text) {
  if (!text) return text;
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  if (segments.length === 0) return text;

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**') && segment.length > 4) {
      return (
        <strong key={`bold-${index}`}>
          {segment.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`text-${index}`}>{segment}</React.Fragment>;
  });
}

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
  const structuredExplanation = useStructuredExplanation(text);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const collapseInnerRef = React.useRef(null);
  const [collapseHeight, setCollapseHeight] = React.useState(0);

  React.useEffect(() => {
    if (!shown) {
      setIsExpanded(false);
    }
  }, [shown]);

  React.useEffect(() => {
    if (shown) {
      setIsExpanded(false);
    }
  }, [text, shown]);

  React.useLayoutEffect(() => {
    if (!shown) {
      setCollapseHeight(0);
      return;
    }
    if (collapseInnerRef.current) {
      setCollapseHeight(collapseInnerRef.current.scrollHeight);
    }
  }, [structuredExplanation, text, shown]);

  const toggleExplanation = React.useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

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
        <div className="info-card-header">
          <div className="title">Значення:</div>
          <button
            type="button"
            className="explain-toggle"
            onClick={toggleExplanation}
            aria-expanded={isExpanded}
            aria-controls="explain-text"
          >
            <span>{isExpanded ? 'Сховати' : 'Показати'}</span>
            <span className="explain-toggle__icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" role="img" focusable="false">
                <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        </div>
        <div
          id="explain-text"
          className={`explain-collapse ${isExpanded ? 'explain-collapse--open' : ''}`}
          style={{ maxHeight: isExpanded ? `${collapseHeight}px` : '0px' }}
        >
          <div className="explain-collapse__inner" ref={collapseInnerRef}>
            {structuredExplanation ? (
              <div className="explain-sections">
                {structuredExplanation.map((section, index) => (
                  <article
                    key={section.title || index}
                    className={`explain-section ${
                      section.title?.toLowerCase().includes('фразеолог') ? 'explain-section--idiom' : ''
                    }`}
                  >
                    {section.title && <div className="explain-section__title">{section.title}</div>}
                    <p className="explain-section__body">{formatTextWithBold(section.body)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="explain-plain">{formatTextWithBold(text)}</p>
            )}
          </div>
        </div>
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
