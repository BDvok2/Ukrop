import React from 'react';

function safeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.trim().length);
}

function normalizeMorpheme(value) {
  if (Array.isArray(value)) {
    return safeArray(value);
  }
  if (typeof value === 'string' && value.trim().length) {
    return [value.trim()];
  }
  return [];
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export default function WordDetailView({ word, sentence, data, loading, error, onRetry }) {
  const parsed = React.useMemo(() => {
    if (data?.analysis && typeof data.analysis === 'object') {
      return data.analysis;
    }
    if (data?.content) {
      try {
        return JSON.parse(data.content);
      } catch (parseError) {
        const match = data.content.match(/\{[\s\S]*\}$/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch (innerError) {
            return null;
          }
        }
      }
    }
    return null;
  }, [data]);

  if (!word) return null;

  const synonyms = parsed?.synonyms ?? {};
  const modernSynonyms = safeArray(synonyms.modern);
  const archaicSynonyms = safeArray(synonyms.archaic);

  const grammar = parsed?.grammar ?? {};
  const cases = safeArray(grammar.cases).map((item) => {
    const [label, value] = item.split(/\s—\s|\s-\s|—|-/);
    if (!label || !value) return { label: item.trim(), value: '' };
    return { label: label.trim(), value: value.trim() };
  });
  const normalizedPartOfSpeech = (grammar.part_of_speech || '').toLowerCase();
  const isVerb = normalizedPartOfSpeech.includes('дієсл');
  const genderDisplay = grammar.gender?.trim();
  const numberDisplay = grammar.number?.trim();

  const structure = parsed?.structure ?? {};
  const structureEntries = [
    ['Префікс', structure.prefix],
    ['Корінь', structure.root],
    ['Суфікс', structure.suffix],
    ['Закінчення', structure.ending],
    ['Основа', structure.base],
  ]
    .map(([label, rawValue]) => ({ label, values: normalizeMorpheme(rawValue) }))
    .filter((entry) => entry.values.length > 0);

  const meanings = Array.isArray(parsed?.meanings)
    ? parsed.meanings.filter((item) => item && typeof item === 'object')
    : [];
  const primaryMeaning = meanings[0]?.definition;

  const quiz = Array.isArray(parsed?.quiz) ? parsed.quiz : [];
  const rawContent = data?.content?.trim();

  return (
    <section className="view word" style={{ display: 'block' }}>
      <div className="word-hero">{word}</div>

      {(sentence || rawContent) && (
        <aside className="card analysis-card">
          {sentence && (
            <p className="analysis-meta">
              <strong>Контекст:</strong> {sentence}
            </p>
          )}
          {rawContent && !parsed && (
            <details className="analysis-meta">
              <summary>Показати відповідь ШІ</summary>
              <pre className="analysis-raw">{rawContent}</pre>
            </details>
          )}
        </aside>
      )}

      {loading && (
        <div className="card analysis-card loading-card" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="analysis-status">Готуємо пояснення слова…</p>
        </div>
      )}

      {error && !loading && (
        <div className="card analysis-card analysis-card--error">
          <p className="analysis-status">{error}</p>
          {onRetry && (
            <button type="button" className="secondary-btn" onClick={onRetry}>
              Спробувати знову
            </button>
          )}
        </div>
      )}

      {!loading && !error && parsed && (
        <div className="word-analysis">
          <div className="card analysis-card word-summary">
            <h3 className="analysis-title">Коротко</h3>
            <p className="analysis-summary-text">
              {primaryMeaning || 'Це слово потребує додаткового пояснення.'}
            </p>
            {(grammar.part_of_speech || grammar.number) && (
              <ul className="analysis-pills">
                {grammar.part_of_speech && <li>{grammar.part_of_speech}</li>}
                {grammar.number && <li>{grammar.number}</li>}
              </ul>
            )}
          </div>

          {(modernSynonyms.length > 0 || archaicSynonyms.length > 0) && (
            <div className="card analysis-card">
              <h3 className="analysis-title">Синоніми</h3>
              <div className="analysis-chip-groups">
                {modernSynonyms.length > 0 && (
                  <div>
                    <h4 className="analysis-subtitle">Сучасні</h4>
                    <div className="analysis-chips">
                      {modernSynonyms.map((item, index) => (
                        <span key={`modern-${index}`} className="analysis-chip">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {archaicSynonyms.length > 0 && (
                  <div>
                    <h4 className="analysis-subtitle">Застарілі</h4>
                    <div className="analysis-chips">
                      {archaicSynonyms.map((item, index) => (
                        <span key={`archaic-${index}`} className="analysis-chip archaic">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(grammar.part_of_speech || genderDisplay || numberDisplay || cases.length > 0 || isVerb) && (
            <div className="card analysis-card">
              <h3 className="analysis-title">Морфологія</h3>
              <dl className="analysis-definition">
                {grammar.part_of_speech && (
                  <React.Fragment>
                    <dt>Частина мови</dt>
                    <dd>{grammar.part_of_speech}</dd>
                  </React.Fragment>
                )}
                {(genderDisplay || isVerb) && (
                  <React.Fragment>
                    <dt>Рід</dt>
                    <dd>
                      {genderDisplay || (
                        <span className="muted-italic">інфінітив</span>
                      )}
                    </dd>
                  </React.Fragment>
                )}
                {(numberDisplay || isVerb) && (
                  <React.Fragment>
                    <dt>Число</dt>
                    <dd>
                      {numberDisplay || (
                        <span className="muted-italic">інфінітив</span>
                      )}
                    </dd>
                  </React.Fragment>
                )}
              </dl>
              {cases.length > 0 && (
                <table className="cases-table">
                  <thead>
                    <tr>
                      <th>Відмінок</th>
                      <th>Форма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map(({ label, value }, index) => (
                      <tr key={`case-${index}`}>
                        <td>{label}</td>
                        <td>{value || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {structureEntries.length > 0 && (
            <div className="card analysis-card">
              <h3 className="analysis-title">Будова слова</h3>
              
              <dl className="analysis-definition two-columns">
                {structureEntries.map(({ label, values }) => (
                  <React.Fragment key={label}>
                    <dt>{label}</dt>
                    <dd>{values.join(', ')}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}

          {parsed.origin && (
            <div className="card analysis-card">
              <h3 className="analysis-title">Походження</h3>
              <p className="analysis-text-block">{parsed.origin}</p>
            </div>
          )}

          {meanings.length > 0 && (
            <div className="card analysis-card">
              <h3 className="analysis-title">Значення та приклади</h3>
              <ol className="meaning-list">
                {meanings.map((meaning, index) => {
                  const examples = safeArray(meaning.examples);
                  return (
                    <li key={`meaning-${index}`}>
                      {meaning.definition && <p className="meaning-definition">{meaning.definition}</p>}
                      {examples.length > 0 && (
                        <ul className="meaning-examples">
                          {examples.map((example, exampleIndex) => (
                            <li key={`example-${index}-${exampleIndex}`}>{example}</li>
                          ))}
                        </ul>
                      )}
                      {meaning.notes && <p className="meaning-notes">{meaning.notes}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {quiz.length > 0 && (
            <div className="card analysis-card">
              <h3 className="analysis-title">Міні‑тест</h3>
              <ol className="quiz-list">
                {quiz.map((item, index) => {
                  if (!item || typeof item !== 'object') return null;
                  const options = safeArray(item.options);
                  const answerIndex = toNumber(item.answer);
                  return (
                    <li key={`quiz-${index}`}>
                      {item.question && <p className="quiz-question">{item.question}</p>}
                      {options.length > 0 && (
                        <ul className="quiz-options">
                          {options.map((option, optionIndex) => {
                            const isCorrect = answerIndex === optionIndex;
                            return (
                              <li key={`quiz-${index}-option-${optionIndex}`} className={isCorrect ? 'correct' : ''}>
                                <span className="quiz-bullet">{isCorrect ? '✅' : '•'}</span>
                                {option}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}

      {!loading && !error && !parsed && rawContent && (
        <div className="card analysis-card">
          <h3 className="analysis-title">Відповідь ШІ</h3>
          <pre className="analysis-raw">{rawContent}</pre>
        </div>
      )}

      
    </section>
  );
}
