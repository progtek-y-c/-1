import { useState, useEffect } from 'react';
import { Lightbulb, Music, Search, RefreshCcw, Sparkles, HelpCircle, Info, ChevronLeft } from 'lucide-react';

// Main App component for the song guessing game
function App() {
  const [view, setView] = useState('genre'); // 'genre', 'topic', 'game'
  const [genre, setGenre] = useState('');
  const [topic, setTopic] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [displayLyrics, setDisplayLyrics] = useState('');
  const [guessTitle, setGuessTitle] = useState('');
  const [guessArtist, setGuessArtist] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // New states for Gemini features
  const [hint, setHint] = useState('');
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [songExplanation, setSongExplanation] = useState('');
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

  const genres = [
    { name: 'חסידי', emoji: '🎶' },
    { name: 'מזרחי', emoji: '🎤' },
    { name: 'ישראלי', emoji: '🇮🇱' },
    { name: 'רגוע', emoji: '🌙' },
    { name: 'קצבי', emoji: '🕺' },
    { name: 'שירי שבת', emoji: '🕯️' }
  ];

  const handleGenreSelect = (selectedGenre) => {
    setGenre(selectedGenre);
    setView('topic');
  };

  // Function to fetch song lyrics from the Gemini API with updated prompt
  const fetchLyrics = async (suggestedTopic = '') => {
    const currentTopic = suggestedTopic || topic;
    if (!currentTopic || !genre) return;

    setIsLoading(true);
    setFeedback('');
    setShowAnswer(false);
    setHint('');
    setSongExplanation('');

    const prompt = `
      מצא שיר ואמן מהז'אנר '${genre}' הקשורים לנושא: '${currentTopic}'.
      תן עדיפות לשירים מוכרים מהשנים האחרונות (2015-2025).
      השיר צריך להיות מהמוזיקה היהודית, חרדית, דתית או מסורתית ישראלית.
      אמנים כמו ישי ריבו, חנן בן ארי, עקיבא תורג'מן, שולי רנד, אברהם פריד, ויעקב שוואקי הם דוגמאות טובות.
      ספק את שם השיר, שם האמן, והמילים.
      החלף בין 2 ל-4 מילים במילים '_____' כך שהמשתמש יוכל לנחש.
      החזר את התוצאה כ-JSON במבנה הבא: 
      { "title": "שם השיר", "artist": "שם האמן", "lyrics": "המילים המלאות", "displayLyrics": "המילים עם הרווחים" }
    `;

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          artist: { type: 'STRING' },
          lyrics: { type: 'STRING' },
          displayLyrics: { type: 'STRING' },
        },
        propertyOrdering: ['title', 'artist', 'lyrics', 'displayLyrics'],
      },
    };

    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory, generationConfig };
    const apiKey = ''; // Leave as-is
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const songData = JSON.parse(text);
        setTopic(currentTopic);
        setSongTitle(songData.title);
        setArtist(songData.artist);
        setLyrics(songData.lyrics);
        setDisplayLyrics(songData.displayLyrics);
        setView('game');
      } else {
        setFeedback('אופס, לא הצלחתי למצוא שיר בנושא הזה. נסה נושא אחר.');
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      setFeedback('אופס, אירעה שגיאה. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestTopic = async () => {
    setIsLoading(true);
    const prompt = `
      הצע נושא יצירתי למשחק ניחוש שירים, שמתאים למוזיקה מז'אנר '${genre}'.
      ספק רק את שם הנושא בעברית.
    `;
    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = ''; // Leave as-is
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        const suggested = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (suggested) {
            setTopic(suggested);
            fetchLyrics(suggested);
        } else {
            setFeedback('לא הצלחתי להציע נושא. נסה שוב.');
            setIsLoading(false);
        }
    } catch (error) {
        console.error('Error suggesting topic:', error);
        setFeedback('אופס, אירעה שגיאה בהצעת נושא.');
        setIsLoading(false);
    }
  };

  const getHint = async () => {
    if (!songTitle || !artist) return;
    setIsHintLoading(true); setHint('');
    const prompt = `ספק רמז במשפט אחד על השיר "${songTitle}" של "${artist}". הרמז לא צריך לכלול את שם השיר או שם האמן.`;
    const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = ''; // Leave as-is
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        const hintText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        setHint(hintText || 'לא הצלחתי לייצר רמז כרגע.');
    } catch (error) {
        console.error('Error fetching hint:', error); setHint('שגיאה בקבלת רמז.');
    } finally {
        setIsHintLoading(false);
    }
  };

  const getExplanation = async () => {
      if (!songTitle || !artist) return;
      setIsExplanationLoading(true); setSongExplanation('');
      const prompt = `הסבר בקצרה את המשמעות של השיר "${songTitle}" של "${artist}" ומדוע הוא מתקשר לנושא "${topic}". שמור על 2-3 משפטים.`;
      const chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      const apiKey = ''; // Leave as-is
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
      try {
          const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const result = await response.json();
          const explanationText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          setSongExplanation(explanationText || 'לא הצלחתי לייצר הסבר כרגע.');
      } catch (error) {
          console.error('Error fetching explanation:', error); setSongExplanation('שגיאה בקבלת הסבר.');
      } finally {
          setIsExplanationLoading(false);
      }
  };

  const handleGuess = () => {
    const isTitleCorrect = guessTitle.trim().toLowerCase() === songTitle.trim().toLowerCase();
    const isArtistCorrect = guessArtist.trim().toLowerCase() === artist.trim().toLowerCase();
    if (isTitleCorrect && isArtistCorrect) {
      setFeedback('כל הכבוד! צדקת!'); setShowAnswer(true);
    } else {
      setFeedback('אופס, טעות. נסה שוב או בקש רמז.');
    }
  };

  const resetGame = () => {
    setView('genre');
    setGenre('');
    setTopic('');
    setLyrics('');
    setSongTitle('');
    setArtist('');
    setDisplayLyrics('');
    setGuessTitle('');
    setGuessArtist('');
    setFeedback('');
    setShowAnswer(false);
    setHint('');
    setSongExplanation('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-lg space-y-6 border border-gray-700">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-yellow-400 flex items-center justify-center gap-2">
            <Music size={40} className="text-yellow-400" />
            נחש את השיר!
          </h1>
          <p className="mt-2 text-gray-400">
            {view === 'genre' && 'בחר את סגנון המוזיקה המועדף עליך'}
            {view === 'topic' && `נבחר ז'אנר: ${genre}. עכשיו, בחר נושא`}
            {view === 'game' && `נושא: ${topic} | ז'אנר: ${genre}`}
          </p>
        </div>

        {view === 'genre' && (
          <div className="space-y-4">
            <h2 className="text-xl text-center font-semibold text-gray-300">בחר ז'אנר</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {genres.map((g) => (
                <button
                  key={g.name}
                  onClick={() => handleGenreSelect(g.name)}
                  className="bg-gray-700 text-gray-200 font-bold py-4 px-2 rounded-xl shadow-md hover:bg-yellow-500 hover:text-gray-900 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'topic' && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="topic-input" className="text-sm font-semibold text-gray-300">
                הכנס נושא לשיר או קבל הצעה
              </label>
              <div className="relative">
                <input id="topic-input" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-700 text-gray-200 p-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors" placeholder="לדוגמה: אמונה, ירושלים, שמחה"/>
                <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => fetchLyrics()} disabled={isLoading || !topic} className="w-full bg-yellow-500 text-gray-900 font-bold py-3 px-4 rounded-xl shadow-md hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Lightbulb size={20} /> התחל משחק
              </button>
              <button onClick={suggestTopic} disabled={isLoading} className="w-full sm:w-auto bg-purple-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-purple-500 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Sparkles size={20} /> ✨ הצע לי נושא
              </button>
            </div>
            {isLoading && <div className="text-center text-yellow-400">טוען...</div>}
            <button onClick={() => { setView('genre'); setTopic(''); }} className="w-full mt-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-gray-500 transition-colors flex items-center justify-center gap-2">
              <ChevronLeft size={20} /> חזור לבחירת ז'אנר
            </button>
          </div>
        )}

        {view === 'game' && (
          <div className="space-y-6">
            <div className="bg-gray-700 p-5 rounded-xl shadow-inner text-center">
              <p className="text-lg font-light text-gray-200 whitespace-pre-line leading-relaxed">{displayLyrics}</p>
            </div>
            {!showAnswer && (
              <>
                <div className="space-y-4">
                  <input type="text" value={guessTitle} onChange={(e) => setGuessTitle(e.target.value)} className="w-full bg-gray-700 text-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors" placeholder="נחש את שם השיר"/>
                  <input type="text" value={guessArtist} onChange={(e) => setGuessArtist(e.target.value)} className="w-full bg-gray-700 text-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors" placeholder="נחש את שם האמן"/>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <button onClick={handleGuess} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-500 transition-all duration-300 transform hover:scale-105">שלח ניחוש</button>
                  <button onClick={getHint} disabled={isHintLoading || hint} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-indigo-500 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isHintLoading ? 'חושב...' : <><HelpCircle size={20} /> ✨ קבל רמז</>}
                  </button>
                </div>
                {hint && <div className="p-4 rounded-xl text-center font-semibold bg-indigo-800 text-indigo-100">{hint}</div>}
                {feedback && <div className={`p-4 rounded-xl text-center font-bold ${feedback.includes('כל הכבוד') ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>{feedback}</div>}
                <button onClick={() => setShowAnswer(true)} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-red-500 transition-all duration-300 transform hover:scale-105">
                  וותר והצג תשובה
                </button>
              </>
            )}
            {showAnswer && (
              <div className="bg-gray-700 p-5 rounded-xl shadow-inner text-center space-y-4">
                <h3 className="text-xl font-bold text-yellow-400">התשובה הנכונה היא:</h3>
                <p className="text-lg text-gray-100"><span className="font-semibold">{songTitle}</span> מאת <span className="font-semibold">{artist}</span></p>
                <p className="mt-2 text-sm text-gray-300 whitespace-pre-line">{lyrics}</p>
                <button onClick={getExplanation} disabled={isExplanationLoading || songExplanation} className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-teal-500 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isExplanationLoading ? 'מסביר...' : <><Info size={20} /> ✨ הסבר על השיר</>}
                </button>
                {songExplanation && <div className="p-4 rounded-xl text-center font-semibold bg-teal-800 text-teal-100">{songExplanation}</div>}
              </div>
            )}
            <button onClick={resetGame} className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-blue-500 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
              <RefreshCcw size={20} /> התחל משחק חדש
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
