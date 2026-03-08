import { useState, useEffect } from 'react';
import { getQuestions, getExams, saveExam, deleteExam } from '@/lib/store';
import { generateExam } from '@/lib/generator';
import { GeneratedExam, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';

function DifficultyDot({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'bg-easy',
    medium: 'bg-medium',
    hard: 'bg-hard',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[difficulty]}`} />;
}

export default function Exams() {
  const [exams, setExams] = useState<GeneratedExam[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setExams(getExams());
  }, []);

  const handleGenerate = () => {
    const questions = getQuestions();
    const result = generateExam(questions);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    saveExam(result);
    setExams(getExams());
    setExpanded(result.id);
    toast.success('Exam generated!');
  };

  const handleDelete = (id: string) => {
    deleteExam(id);
    setExams(getExams());
    if (expanded === id) setExpanded(null);
    toast.success('Exam deleted');
  };

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
          <p className="mt-1 text-muted-foreground">{exams.length} exam{exams.length !== 1 ? 's' : ''} generated</p>
        </div>
        <Button onClick={handleGenerate} className="gap-2">
          <Sparkles className="h-4 w-4" /> Generate Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">No exams yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Generate your first exam from the question bank</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam, idx) => (
            <Card key={exam.id} className="overflow-hidden">
              <button
                className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                onClick={() => setExpanded(expanded === exam.id ? null : exam.id)}
              >
                <div>
                  <p className="font-semibold">Exam #{exams.length - idx}</p>
                  <p className="text-xs text-muted-foreground">{new Date(exam.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(exam.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {expanded === exam.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              {expanded === exam.id && (
                <div className="border-t px-4 pb-4">
                  <ol className="mt-4 space-y-3">
                    {exam.questions.map((q, i) => (
                      <li key={q.id} className="flex gap-3 rounded-lg bg-secondary/40 p-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{q.text}</p>
                          <div className="mt-1.5 flex gap-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <DifficultyDot difficulty={q.difficulty} />
                              {DIFFICULTY_LABELS[q.difficulty]}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
