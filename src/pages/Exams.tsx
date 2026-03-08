import { useState, useEffect, useCallback } from 'react';
import { getQuestions, getExams, saveExam, deleteExam } from '@/lib/store';
import { generateExam } from '@/lib/generator';
import { getImages } from '@/lib/idb';
import { cropImageToContent } from '@/lib/cropImage';
import { GeneratedExam, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';
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

function ExamImageViewer({ exam }: { exam: GeneratedExam }) {
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [stitching, setStitching] = useState(false);

  const imageQuestionIds = exam.questions
    .filter(q => q.hasImage)
    .map(q => q.id);

  useEffect(() => {
    if (imageQuestionIds.length > 0) {
      getImages(imageQuestionIds).then(async (urls) => {
        const cropped = new Map<string, string>();
        for (const [id, dataUrl] of urls) {
          cropped.set(id, await cropImageToContent(dataUrl));
        }
        setImageUrls(cropped);
      });
    }
  }, [exam.id]);

  const handleDownloadStitched = useCallback(async () => {
    const ids = exam.questions.filter(q => q.hasImage).map(q => q.id);
    const images = await getImages(ids);
    if (images.size === 0) return;

    setStitching(true);

    try {
      // Load all images to get dimensions
      const loadedImages: HTMLImageElement[] = [];
      for (const q of exam.questions) {
        const dataUrl = images.get(q.id);
        if (!dataUrl) continue;
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new window.Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = dataUrl;
        });
        loadedImages.push(img);
      }

      if (loadedImages.length === 0) return;

      const maxWidth = Math.max(...loadedImages.map(i => i.width));
      const padding = 20;
      const totalHeight = loadedImages.reduce((sum, img) => sum + img.height + padding, padding);

      const canvas = document.createElement('canvas');
      canvas.width = maxWidth + padding * 2;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d')!;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let y = padding;
      for (const img of loadedImages) {
        const x = Math.floor((maxWidth - img.width) / 2) + padding;
        ctx.drawImage(img, x, y);
        y += img.height + padding;
      }

      // Download
      const link = document.createElement('a');
      link.download = `exam-${new Date(exam.createdAt).toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setStitching(false);
    }
  }, [exam]);

  return (
    <div className="border-t px-4 pb-4">
      {imageQuestionIds.length > 0 && (
        <div className="mt-3 mb-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleDownloadStitched}
            disabled={stitching}
          >
            <Download className="h-4 w-4" />
            {stitching ? 'Stitching...' : 'Download Stitched Image'}
          </Button>
        </div>
      )}
      <ol className="mt-4 space-y-3">
        {exam.questions.map((q, i) => (
          <li key={q.id} className="flex gap-3 rounded-lg bg-secondary/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              {q.hasImage && imageUrls.has(q.id) ? (
                <img
                  src={imageUrls.get(q.id)}
                  alt={`Question ${i + 1}`}
                  className="rounded-md max-w-full"
                />
              ) : (
                <p className="text-sm font-medium">{q.text}</p>
              )}
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
  );
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
              {expanded === exam.id && <ExamImageViewer exam={exam} />}
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
