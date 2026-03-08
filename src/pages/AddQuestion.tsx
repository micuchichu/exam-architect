import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveQuestion } from '@/lib/store';
import { QuestionType, Difficulty, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { PlusCircle, X } from 'lucide-react';

export default function AddQuestion() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [type, setType] = useState<QuestionType>('multiple-choice');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !correctAnswer.trim()) {
      toast.error('Fill in the question and correct answer');
      return;
    }
    if (type === 'multiple-choice' && options.filter(o => o.trim()).length < 2) {
      toast.error('Provide at least 2 options');
      return;
    }

    try {
      await saveQuestion({
        id: crypto.randomUUID(),
        text: text.trim(),
        type,
        difficulty,
        correctAnswer: correctAnswer.trim(),
        options: type === 'multiple-choice' ? options.filter(o => o.trim()) : undefined,
        createdAt: new Date().toISOString(),
      });
      toast.success('Question added!');
      setText('');
      setCorrectAnswer('');
      setOptions(['', '', '', '']);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save question');
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Add Question</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Textarea id="question" value={text} onChange={e => setText(e.target.value)} placeholder="Enter your question..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={v => setType(v as QuestionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(t => (
                      <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={v => setDifficulty(v as Difficulty)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map(d => (
                      <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {type === 'multiple-choice' && (
              <div className="space-y-3">
                <Label>Options</Label>
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={opt} onChange={e => { const next = [...options]; next[i] = e.target.value; setOptions(next); }} placeholder={`Option ${i + 1}`} />
                    {options.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ''])}><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>
                )}
              </div>
            )}
            {type === 'true-false' && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="True">True</SelectItem>
                    <SelectItem value="False">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {type !== 'true-false' && (
              <div className="space-y-2">
                <Label htmlFor="answer">Correct Answer</Label>
                <Input id="answer" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} placeholder="Enter the correct answer..." />
              </div>
            )}
            <Button type="submit" className="w-full">Add Question</Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
