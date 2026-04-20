import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { codeAPI } from '@/lib/api/client';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'python' | 'java' | 'c' | 'cpp' | 'javascript';
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language, readOnly = false }: CodeEditorProps) {
  const [output, setOutput] = useState<string>('');
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setOutput('Running...');

    try {
      const response = await codeAPI.execute(value, language);
      const result = response.data;

      if (result.run) {
        setOutput(result.run.output || result.run.stdout || result.run.stderr || 'No output');
      } else {
        setOutput('Error: No output received');
      }
    } catch (error: any) {
      console.error('Code execution error:', error);
      setOutput(`Error: ${error.response?.data?.detail || error.message || 'Execution failed'}`);
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setOutput('');
  };

  const languageNames: Record<string, string> = {
    python: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    javascript: 'JavaScript',
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-700">
          Хэл: {languageNames[language]}
        </span>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={handleReset}
              disabled={running}
            >
              Цэвэрлэх
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Play}
              onClick={handleRun}
              loading={running}
            >
              Ажиллуулах
            </Button>
          </div>
        )}
      </div>

      {/* Code Input */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field font-mono text-sm"
        rows={15}
        placeholder={`// ${languageNames[language]} кодоо энд бичнэ үү...`}
        readOnly={readOnly}
        style={{
          tabSize: 4,
          whiteSpace: 'pre',
          overflowWrap: 'normal',
          overflowX: 'auto',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const newValue = value.substring(0, start) + '    ' + value.substring(end);
            onChange(newValue);
            // Set cursor position after tab
            setTimeout(() => {
              e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
            }, 0);
          }
        }}
      />

      {/* Output */}
      {output && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">Үр дүн:</span>
          </div>
          <div className="bg-neutral-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-x-auto">
            {output}
          </div>
        </div>
      )}
    </div>
  );
}