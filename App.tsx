
import React, { useState, useCallback, useMemo } from 'react';
import { extractTextFromPdf } from './services/pdfService';
import { analyzeGuideText, AnalysisResult } from './services/geminiService';

// --- Helper & UI Components ---

const Loader: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <svg className="animate-spin h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-sm text-slate-500 dark:text-slate-400">Аналізуємо документ... Це може зайняти деякий час.</p>
  </div>
);

interface HighlightedTextProps {
  text: string;
  highlight: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <p className="whitespace-pre-wrap break-words">{text}</p>;
  }
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-sky-300 dark:bg-sky-700 rounded px-1">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </p>
  );
};

const IconCheck: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);
  
const IconWrenchScrewdriver: React.FC<{ className?: string }> = ({ className }) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-4.243-4.243l3.275-3.275a4.5 4.5 0 0 0-6.336 4.486c.046.58.106 1.157.14 1.743m-.044 5.206a4.5 4.5 0 0 1-6.336-6.336l3.276 3.276a3.004 3.004 0 0 0 4.243 4.243l-3.275 3.275Z" />
      </svg>
);
  
const IconChip: React.FC<{ className?: string }> = ({ className }) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
);


// --- Main App Component ---

const App: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'summary' | 'fulltext'>('summary');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setFileName(file.name);
      setError(null);
      // Reset previous results
      setExtractedText('');
      setAnalysisResult(null);
      setSearchKeyword('');
    } else {
      setError('Будь ласка, виберіть файл у форматі PDF.');
      setPdfFile(null);
      setFileName('');
    }
  };

  const processDocument = useCallback(async () => {
    if (!pdfFile) {
      setError('Файл не вибрано.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setExtractedText('');
    setActiveTab('summary');

    try {
      const text = await extractTextFromPdf(pdfFile);
      setExtractedText(text);

      if (text.length > 50) { // Only analyze if there's enough text
        const result = await analyzeGuideText(text);
        setAnalysisResult(result);
      } else {
        setError("Документ занадто короткий для аналізу.");
      }

    } catch (err: any) {
      setError(err.message || 'Сталася невідома помилка.');
    } finally {
      setIsLoading(false);
    }
  }, [pdfFile]);

  const hasResults = useMemo(() => analysisResult || extractedText, [analysisResult, extractedText]);

  return (
    <div className="min-h-screen font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
            AI Аналізатор Інструкцій
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Отримайте структурований аналіз ваших технічних посібників та інструкцій.
          </p>
        </header>

        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label htmlFor="pdf-upload" className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors">
              <span>Обрати PDF</span>
              <input id="pdf-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} disabled={isLoading} />
            </label>
            <span className="text-slate-500 dark:text-slate-400 truncate flex-1 text-center sm:text-left" title={fileName}>
              {fileName || 'Файл не вибрано'}
            </span>
            <button
              onClick={processDocument}
              disabled={!pdfFile || isLoading}
              className="w-full sm:w-auto px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              Аналізувати
            </button>
          </div>

          {error && <div className="mt-4 text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-md">{error}</div>}
        </div>

        {isLoading && <div className="mt-8 text-center"><Loader /></div>}
        
        {hasResults && !isLoading && (
          <div className="mt-8 max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="flex -mb-px" aria-label="Tabs">
                    <button onClick={() => setActiveTab('summary')} className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'summary' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'}`}>
                        Результати Аналізу
                    </button>
                    <button onClick={() => setActiveTab('fulltext')} className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'fulltext' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'}`}>
                        Повний Текст та Пошук
                    </button>
                </nav>
            </div>
            
            <div className="p-6 md:p-8">
              {activeTab === 'summary' && (
                analysisResult ? (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">Загальний Огляд</h2>
                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {analysisResult.overview}
                            </p>
                        </div>
    
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white flex items-center">
                                    <IconChip className="h-6 w-6 mr-2 text-sky-500" />
                                    Необхідні Компоненти
                                </h3>
                                <ul className="space-y-2">
                                    {(analysisResult.components.length > 0) ? analysisResult.components.map((item, index) => (
                                        <li key={index} className="flex items-start">
                                            <IconCheck className="h-5 w-5 mt-1 mr-2 text-green-500 flex-shrink-0" />
                                            <span className="text-slate-600 dark:text-slate-300">{item}</span>
                                        </li>
                                    )) : <li className="text-slate-500 italic">Компоненти не знайдено.</li>}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white flex items-center">
                                    <IconWrenchScrewdriver className="h-6 w-6 mr-2 text-sky-500" />
                                    Необхідні Інструменти
                                </h3>
                                <ul className="space-y-2">
                                    {(analysisResult.tools.length > 0) ? analysisResult.tools.map((item, index) => (
                                        <li key={index} className="flex items-start">
                                            <IconCheck className="h-5 w-5 mt-1 mr-2 text-green-500 flex-shrink-0" />
                                            <span className="text-slate-600 dark:text-slate-300">{item}</span>
                                        </li>
                                    )) : <li className="text-slate-500 italic">Інструменти не знайдено.</li>}
                                </ul>
                            </div>
                        </div>
    
                        <div>
                            <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Основні Кроки Збірки</h3>
                            {(analysisResult.steps.length > 0) ? (
                                <ol className="list-decimal list-inside space-y-3 text-slate-600 dark:text-slate-300">
                                    {analysisResult.steps.map((item, index) => (
                                        <li key={index}><span className="font-medium text-slate-700 dark:text-slate-200">Крок {index+1}:</span> {item}</li>
                                    ))}
                                </ol>
                            ) : <p className="text-slate-500 italic">Кроки збірки не знайдено.</p>}
                        </div>
                    </div>
                ) : <p className="text-slate-500">Результати аналізу відсутні. Можливо, документ занадто короткий або має непідтримуваний формат.</p>
              )}
              {activeTab === 'fulltext' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">Повний Текст Документа</h2>
                   <div className="mb-4">
                     <input
                       type="search"
                       placeholder="Введіть ключове слово для пошуку..."
                       value={searchKeyword}
                       onChange={(e) => setSearchKeyword(e.target.value)}
                       className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-sky-500 focus:border-sky-500"
                     />
                   </div>
                   <div className="max-h-[60vh] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                     <HighlightedText text={extractedText} highlight={searchKeyword} />
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <footer className="text-center p-4 text-xs text-slate-500">
        Створено за допомогою React та Gemini API.
      </footer>
    </div>
  );
};

export default App;
