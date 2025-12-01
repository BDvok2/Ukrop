import React from 'react';
import TranslateView from './components/TranslateView.jsx';
import ExplainView from './components/ExplainView.jsx';
import WordDetailView from './components/WordDetailView.jsx';
import TopBar from './components/TopBar.jsx';
import BottomBar from './components/BottomBar.jsx';
import { analyzeWord, explainSentence } from './lib/api.js';

const defaultExplainText = 'Ти кажеш, що написав щось дуже розумне (по-твоєму), але з іронією чи жартом. Тобто: «Я тут таке розумне написав» або «Я щось дуже мудре наговорив».';

export default function App() {
  const [page, setPage] = React.useState('translate');
  const [from, setFrom] = React.useState('en');
  const [to, setTo] = React.useState('uk');
  const [selectedWord, setSelectedWord] = React.useState('');

  const [exInput, setExInput] = React.useState('');
  const [exShown, setExShown] = React.useState(false);
  const [exLocked, setExLocked] = React.useState(false);
  const [exText, setExText] = React.useState(defaultExplainText);
  const [exSentence, setExSentence] = React.useState('');

  const [wordData, setWordData] = React.useState(null);
  const [wordLoading, setWordLoading] = React.useState(false);
  const [wordError, setWordError] = React.useState('');

  const mainRef = React.useRef(null);
  const savedScroll = React.useRef(0);
  const wordControllerRef = React.useRef(null);
  const sentenceControllerRef = React.useRef(null);

  const onSwap = React.useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const fetchSentenceExplanation = React.useCallback(async (sentence) => {
    if (!sentence) {
      setExText(defaultExplainText);
      return;
    }

    sentenceControllerRef.current?.abort?.();
    const controller = new AbortController();
    sentenceControllerRef.current = controller;
    setExText('Пояснюємо речення…');

    try {
      const { explanation } = await explainSentence(sentence, controller.signal);
      setExText(explanation || `Речення зафіксовано: ${sentence}`);
    } catch (error) {
      if (error.name === 'AbortError') return;
      setExText('Не вдалося пояснити речення. Спробуйте ще раз.');
    }
  }, []);

  const handleExplainSubmit = React.useCallback(
    (sentence) => {
      const trimmed = sentence.trim();
      setExInput(trimmed);
      setExSentence(trimmed);
      fetchSentenceExplanation(trimmed);
    },
    [fetchSentenceExplanation]
  );

  const handleUnlock = React.useCallback(() => {
    setExLocked(false);
    setExShown(false);
    setExSentence('');
    setExText(defaultExplainText);
    sentenceControllerRef.current?.abort?.();
    wordControllerRef.current?.abort?.();
  }, []);

  const fetchWordDetails = React.useCallback(
    async (word) => {
      if (!word) return;
      wordControllerRef.current?.abort?.();
      const controller = new AbortController();
      wordControllerRef.current = controller;

      setWordLoading(true);
      setWordError('');
      setWordData(null);

      try {
        const sentence = exSentence || exInput;
        const response = await analyzeWord(sentence, word, controller.signal);
        setWordData(response);
      } catch (error) {
        if (error.name === 'AbortError') return;
        setWordError('Не вдалося отримати пояснення. Спробуйте ще раз.');
      } finally {
        setWordLoading(false);
      }
    },
    [exSentence, exInput]
  );

  const goToWord = React.useCallback(
    (word) => {
      savedScroll.current = mainRef.current?.scrollTop || 0;
      setSelectedWord(word);
      setPage('word');
      fetchWordDetails(word);
    },
    [fetchWordDetails]
  );

  const goBackToExplain = React.useCallback(() => {
    wordControllerRef.current?.abort?.();
    setPage('explain');
    requestAnimationFrame(() => {
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: savedScroll.current, behavior: 'auto' });
      }
    });
  }, []);

  const scrollToTop = React.useCallback(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleRetry = React.useCallback(() => {
    if (selectedWord) {
      fetchWordDetails(selectedWord);
    }
  }, [fetchWordDetails, selectedWord]);

  React.useEffect(
    () => () => {
      sentenceControllerRef.current?.abort?.();
      wordControllerRef.current?.abort?.();
    },
    []
  );

  return (
    <div className={`app page-${page}`}>
      <TopBar
        page={page}
        from={from}
        to={to}
        setFrom={setFrom}
        setTo={setTo}
        onSwap={onSwap}
        onBack={goBackToExplain}
      />
      <main className="content" ref={mainRef}>
        {page === 'translate' && <TranslateView from={from} to={to} />}
        {page === 'explain' && (
          <ExplainView
            input={exInput}
            setInput={setExInput}
            shown={exShown}
            setShown={setExShown}
            locked={exLocked}
            setLocked={setExLocked}
            text={exText}
            onWord={goToWord}
            scrollToTop={scrollToTop}
            onSubmit={handleExplainSubmit}
            onUnlock={handleUnlock}
          />
        )}
        {page === 'word' && (
          <WordDetailView
            word={selectedWord}
            sentence={exSentence || exInput}
            data={wordData}
            loading={wordLoading}
            error={wordError}
            onRetry={handleRetry}
          />
        )}
      </main>
      <BottomBar page={page} onNav={setPage} />
    </div>
  );
}
