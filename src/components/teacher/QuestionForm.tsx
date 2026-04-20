// EXAMPLE INTEGRATION - Teacher Side (Creating Questions)
// File: src/components/teacher/QuestionForm.tsx

'use client';

import { useState } from 'react';
import ScienceKeyboard from '@/components/common/ScienceKeyboard';
import { MathText } from '@/components/common/LatexRenderer';

export default function QuestionForm() {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('short_answer');

  return (
    <div className="space-y-6">
      {/* Question Type Selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Асуултын төрөл
        </label>
        <select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
          className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
        >
          <option value="multiple_choice">Сонгох</option>
          <option value="short_answer">Богино хариулт</option>
          <option value="essay">Эссэ</option>
          <option value="math">Математик</option>
          <option value="chemistry">Хими</option>
          <option value="physics">Физик</option>
        </select>
      </div>

      {/* Question Text with Science Keyboard */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Асуултын текст
        </label>
        
        {/* Show science keyboard for science subjects */}
        {['math', 'chemistry', 'physics'].includes(questionType) ? (
          <ScienceKeyboard
            value={questionText}
            onChange={setQuestionText}
            placeholder="Томъёо ашиглан асуулт бичих..."
          />
        ) : (
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Асуултын текстийг бичнэ үү..."
            rows={4}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg"
          />
        )}
      </div>

      {/* Preview Card */}
      {questionText && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Урьдчилан харах:</p>
          <div className="bg-white p-4 rounded-lg">
            <MathText>{questionText}</MathText>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        type="button"
        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
      >
        Асуулт нэмэх
      </button>
    </div>
  );
}