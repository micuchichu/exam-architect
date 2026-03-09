import { useState, useMemo } from 'react';
import { loadStaticQuestions } from '@/lib/questionLoader';
import { Question, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS, Difficulty } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ArrowUpDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';

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

type SortField = 'date' | 'difficulty' | 'type' | 'subtype';
type SortDir = 'asc' | 'desc';

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export default function Index() {
  const { isAdmin } = useAuth();
  const [questions] = useState<Question[]>(() => loadStaticQuestions());
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubtype, setFilterSubtype] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const subtypes = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => { if (q.subtype) set.add(q.subtype); });
    return Array.from(set).sort();
  }, [questions]);

  const types = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => set.add(q.type));
    return Array.from(set).sort();
  }, [questions]);

  const filtered = useMemo(() => {
    let result = [...questions];
    if (filterDifficulty !== 'all') result = result.filter(q => q.difficulty === filterDifficulty);
    if (filterType !== 'all') result = result.filter(q => q.type === filterType);
    if (filterSubtype !== 'all') result = result.filter(q => q.subtype === filterSubtype);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'difficulty': cmp = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]; break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'subtype': cmp = (a.subtype || '').localeCompare(b.subtype || ''); break;
        case 'date': default: cmp = a.createdAt.localeCompare(b.createdAt); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [questions, filterDifficulty, filterType, filterSubtype, sortField, sortDir]);

  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  const toggleSortDir = () => setSortDir(d => d === 'asc' ? 'desc' : 'asc');

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
        <p className="mt-1 text-muted-foreground">
          {filtered.length} of {questions.length} question{questions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {questions.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={handleDeleteAll}>
              <Trash2 className="h-4 w-4" /> Delete All
            </Button>
          )}
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map(t => (
                <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t as keyof typeof QUESTION_TYPE_LABELS] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {subtypes.length > 0 && (
            <Select value={filterSubtype} onValueChange={setFilterSubtype}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Subtype" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subtypes</SelectItem>
                {subtypes.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date added</SelectItem>
                <SelectItem value="difficulty">Difficulty</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="subtype">Subtype</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={toggleSortDir} title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
              <ArrowUpDown className={`h-4 w-4 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">No questions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add questions to start generating exams</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">No matching questions</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((q, i) => (
            <Card key={q.id} className="flex items-start gap-4 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs font-bold text-secondary-foreground">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug">{q.text}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <DifficultyBadge difficulty={q.difficulty} />
                  <Badge variant="outline" className="text-xs">{QUESTION_TYPE_LABELS[q.type as keyof typeof QUESTION_TYPE_LABELS] || q.type}</Badge>
                  {q.subtype && <Badge variant="secondary" className="text-xs">{q.subtype}</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {q.hasImage && (
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => setPreviewQuestion(q)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!previewQuestion} onOpenChange={(open) => { if (!open) setPreviewQuestion(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewQuestion?.text}</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <DifficultyBadge difficulty={previewQuestion.difficulty} />
                <Badge variant="outline" className="text-xs">{QUESTION_TYPE_LABELS[previewQuestion.type as keyof typeof QUESTION_TYPE_LABELS] || previewQuestion.type}</Badge>
                {previewQuestion.subtype && <Badge variant="secondary" className="text-xs">{previewQuestion.subtype}</Badge>}
              </div>
              {previewQuestion.imageUrl && (
                <img src={previewQuestion.imageUrl} alt="Question" className="w-full rounded-md" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
