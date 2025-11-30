const SUPPORTED = ['en', 'uk', 'de', 'es', 'fr'];

export async function translateText(text, from, to, signal) {
  if (!SUPPORTED.includes(from) || !SUPPORTED.includes(to)) {
    throw new Error('Unsupported language');
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error('API error');
  }
  const data = await res.json();
  return data?.responseData?.translatedText || '';
}

export async function analyzeWord(sentence, word, signal) {
  const res = await fetch('/api/analyze-word', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sentence, word }),
    signal,
  });

  if (!res.ok) {
    throw new Error('Failed to analyze word');
  }

  const data = await res.json();
  return {
    analysis: data?.analysis ?? null,
    content: data?.content ?? '',
  };
}

export const LANGS = {
  en: 'Англійська',
  uk: 'Українська',
  de: 'Німецька',
  es: 'Іспанська',
  fr: 'Французька',
};

export const SUPPORTED_LANGS = SUPPORTED;
