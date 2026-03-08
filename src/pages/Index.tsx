import { useState, useEffect } from 'react';
import { getQuestions, deleteQuestion } from '@/lib/store';
import { Question, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';

function DifficultyBadge({ difficulty }: { difficulty: Question['difficulty'] }) {
  const colors = {
    easy: 'bg-easy/15 text-easy border-easy/30',
    medium: 'bg-medium/15 text-medium border-medium/30',
    hard: 'bg-hard/15 text-hard border-hard/30',
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${colors[difficulty]}`}>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

export default function Index() {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    setQuestions(getQuestions());
  }, []);

  const handleDelete = (id: string) => {
    deleteQuestion(id);
    setQuestions(getQuestions());
    toast.success('Question deleted');
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
        <p className="mt-1 text-muted-foreground">
          {questions.length} question{questions.length !== 1 ? 's' : ''} in your bank
        </p>
      </div>

      {questions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">No questions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add questions to start generating exams</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {questions.map((q, i) => (
            <Card key={q.id} className="flex items-start gap-4 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs font-bold text-secondary-foreground">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug">{q.text}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <DifficultyBadge difficulty={q.difficulty} />
                  <Badge variant="outline" className="text-xs">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                  {q.subtype && <Badge variant="secondary" className="text-xs">{q.subtype}</Badge>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(q.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
