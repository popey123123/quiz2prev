import React, { useState } from "react";
import axios from "axios";

// URL твого бекенду
const API_URL = "https://quiz.loveplay.in.ua/api";

// Питання квізу (приклад, додай/скорегуй за своїм побажанням)
const QUIZ_STEPS = [
  {
    question: "Для кого ви шукаєте товар?",
    options: [
      { label: "Для себе" },
      { label: "Для нас обох" },
      { label: "Для гігієни та здоров'я" },
      { label: "Для подарунка" },
    ],
  },
  {
    question: "Яка ваша стать?",
    options: [
      { label: "Жінка" },
      { label: "Чоловік" },
    ],
    showIf: (answers) => answers[0] === "Для себе",
  },
  // ... Додай свої питання по аналогії!
];

function App() {
  // СТАН
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [swipeProducts, setSwipeProducts] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [likedProducts, setLikedProducts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("quiz"); // quiz | swipe | results
  const [error, setError] = useState(null);

  // Вибір відповіді
  const handleAnswer = (label) => {
    const newAnswers = [...answers, label];
    setAnswers(newAnswers);

    // Визначаємо наступний step (з урахуванням showIf)
    let nextStep = step + 1;
    while (
      nextStep < QUIZ_STEPS.length &&
      QUIZ_STEPS[nextStep].showIf &&
      !QUIZ_STEPS[nextStep].showIf(newAnswers)
    ) {
      nextStep++;
    }

    if (nextStep < QUIZ_STEPS.length) {
      setStep(nextStep);
    } else {
      fetchSwipeProducts(newAnswers);
    }
  };

  // Запит для свайпу
  const fetchSwipeProducts = async (quizAnswers) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axios.post(`${API_URL}/products/swipe`, {
        answers: quizAnswers,
        excluded_ids: [],
      });
      setSwipeProducts(resp.data.products);
      setStage("swipe");
      setCurrentIdx(0);
      setLikedProducts([]);
    } catch (err) {
      setError("Не вдалося завантажити товари для свайпу");
    } finally {
      setLoading(false);
    }
  };

  // Свайп
  const handleSwipe = (isLiked) => {
    const product = swipeProducts[currentIdx];
    if (isLiked) {
      setLikedProducts((prev) => [...prev, product]);
    }
    if (currentIdx + 1 < swipeProducts.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      fetchRecommendations();
    }
  };

  // Рекомендації
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axios.post(`${API_URL}/products/recommendations`, {
        liked_products: likedProducts,
        gender: answers[1] || undefined, // Якщо є вибір статі
      });
      setResult(resp.data);
      setStage("results");
    } catch (err) {
      setError("Не вдалося отримати рекомендації");
    } finally {
      setLoading(false);
    }
  };

  // Перезапуск тесту
  const restart = () => {
    setStep(0);
    setAnswers([]);
    setSwipeProducts([]);
    setCurrentIdx(0);
    setLikedProducts([]);
    setResult(null);
    setStage("quiz");
    setError(null);
  };

  // UI — КВІЗ
  if (stage === "quiz") {
    const q = QUIZ_STEPS[step];
    if (!q) return null;
    if (loading) return <p>Завантаження...</p>;
    return (
      <div className="max-w-md mx-auto py-8">
        <h2 className="text-xl font-bold mb-4">{q.question}</h2>
        <div className="space-y-4">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className="block w-full p-4 border rounded-xl bg-white hover:bg-pink-50"
              onClick={() => handleAnswer(opt.label)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
    );
  }

  // UI — SWIPE
  if (stage === "swipe") {
    if (loading) return <p>Завантаження...</p>;
    const product = swipeProducts[currentIdx];
    if (!product)
      return (
        <div className="text-center py-8">
          <p>Ти переглянув всі товари!</p>
          <button onClick={fetchRecommendations} className="bg-pink-600 text-white px-6 py-2 rounded-lg mt-4">
            Переглянути добірку
          </button>
        </div>
      );
    return (
      <div className="max-w-md mx-auto py-8 text-center">
        <h2 className="text-xl font-bold mb-4">Свайпай товари</h2>
        <img src={product.picture?.[0]} alt={product.name} className="w-full max-h-60 object-contain mx-auto mb-2" />
        <h3 className="font-semibold text-lg">{product.name}</h3>
        <p className="text-pink-600">{product.price} грн</p>
        <div className="flex justify-center space-x-8 mt-4">
          <button onClick={() => handleSwipe(false)} className="text-2xl">❌</button>
          <button onClick={() => handleSwipe(true)} className="text-2xl">❤️</button>
        </div>
        <div className="text-sm text-gray-500 mt-2">{currentIdx + 1} / {swipeProducts.length}</div>
      </div>
    );
  }

  // UI — РЕЗУЛЬТАТ
  if (stage === "results") {
    if (loading) return <p>Готуємо добірку...</p>;
    if (error) return <p className="text-red-600">{error}</p>;
    return (
      <div className="max-w-3xl mx-auto py-8">
        <h2 className="text-2xl font-bold mb-6">Твоя персональна добірка</h2>
        {likedProducts.length > 0 && (
          <>
            <h3 className="text-xl mb-2">Твої вибрані товари:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {likedProducts.map((p, i) => (
                <ProductCard product={p} key={p.id || i} />
              ))}
            </div>
          </>
        )}
        <h3 className="text-xl mb-2">Рекомендації:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {(result?.gender_recommendations || []).map((p, i) => (
            <ProductCard product={p} key={p.id || i} />
          ))}
        </div>
        <h3 className="text-xl mb-2">Додатково:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(result?.additional_recommendations || []).map((p, i) => (
            <ProductCard product={p} key={p.id || i} />
          ))}
        </div>
        <button onClick={restart} className="bg-gray-600 text-white px-6 py-2 rounded-lg mt-6">
          Пройти ще раз
        </button>
      </div>
    );
  }

  return null;
}

// Проста карточка товару
function ProductCard({ product }) {
  return (
    <div className="border rounded-xl p-3 text-center bg-white shadow">
      <img src={product.picture?.[0]} alt={product.name} className="w-full max-h-36 object-contain mb-2" />
      <div className="font-semibold">{product.name}</div>
      <div className="text-pink-600">{product.price} грн</div>
      <a href={product.url} className="text-blue-500 underline text-sm block mt-1" target="_blank" rel="noopener noreferrer">
        Перейти
      </a>
    </div>
  );
}

export default App;
