import { useState, useEffect, useCallback } from 'react';
import { getQuestions, getExams, saveExam, deleteExam } from '@/lib/store';
import { generateExam } from '@/lib/generator';
import { getImages } from '@/lib/idb';
import { cropImageToContent } from '@/lib/cropImage';
import examHeaderSrc from '@/assets/exam-header.png';
import { GeneratedExam, ExamSettings, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import ExamSettingsPanel from '@/components/ExamSettingsPanel';

function DifficultyDot({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'bg-easy',
    medium: 'bg-medium',
    hard: 'bg-hard',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[difficulty]}`} />;
}

function ExamImageViewer({ exam }: { exam: GeneratedExam }) {
  const [stitchedUrl, setStitchedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const imageQuestionIds = exam.questions
    .filter(q => q.hasImage)
    .map(q => q.id);

  const buildStitched = useCallback(async () => {
    const images = await getImages(imageQuestionIds);
    if (images.size === 0) return null;

    const cropResults: { img: HTMLImageElement; avgRunLength: number }[] = [];
    for (const q of exam.questions) {
      const dataUrl = images.get(q.id);
      if (!dataUrl) continue;
      const cropped = await cropImageToContent(dataUrl);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = cropped.dataUrl;
      });
      cropResults.push({ img, avgRunLength: cropped.avgRunLength });
    }

    if (cropResults.length === 0) return null;

    // Normalize text size using avgRunLength, then shrink to ~65% for a compact left-aligned layout
    const runs = cropResults.map(r => r.avgRunLength).filter(r => r > 0);
    const sortedRuns = [...runs].sort((a, b) => a - b);
    const targetRun = sortedRuns[Math.floor(sortedRuns.length / 2)] || 1;
    const padding = 20;
    const shrinkFactor = 0.65;

    const scaledDims = cropResults.map(({ img, avgRunLength }) => {
      const scale = (avgRunLength > 0 ? targetRun / avgRunLength : 1) * shrinkFactor;
      return { width: Math.round(img.width * scale), height: Math.round(img.height * scale) };
    });

    // Load header image
    const headerImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = examHeaderSrc;
    });

    const canvasWidth = Math.max(headerImg.width, ...scaledDims.map(d => d.width)) + padding * 2;
    const headerScale = 1;
    const headerHeight = Math.round(headerImg.height * headerScale);
    const totalHeight = headerHeight + padding + scaledDims.reduce((sum, d) => sum + d.height + padding, padding);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw header
    ctx.drawImage(headerImg, padding, padding, headerImg.width, headerHeight);

    let y = padding + headerHeight + padding;
    for (let idx = 0; idx < cropResults.length; idx++) {
      const { img } = cropResults[idx];
      const dims = scaledDims[idx];
      ctx.drawImage(img, padding, y, dims.width, dims.height);
      y += dims.height + padding;

      // Draw separator line between questions
      if (idx < cropResults.length - 1) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, y - padding / 2);
        ctx.lineTo(canvas.width - padding, y - padding / 2);
        ctx.stroke();
      }
    }

    return canvas.toDataURL('image/png');
  }, [exam]);

  useEffect(() => {
    if (imageQuestionIds.length > 0) {
      setLoading(true);
      buildStitched().then(url => {
        setStitchedUrl(url);
        setLoading(false);
      });
    }
  }, [exam.id]);

  const handleDownload = () => {
    if (!stitchedUrl) return;
    const link = document.createElement('a');
    link.download = `exam-${new Date(exam.createdAt).toISOString().slice(0, 10)}.png`;
    link.href = stitchedUrl;
    link.click();
  };

  return (
    <div className="border-t px-4 pb-4">
      {imageQuestionIds.length > 0 && (
        <div className="mt-3 mb-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleDownload}
            disabled={!stitchedUrl}
          >
            <Download className="h-4 w-4" />
            Download Stitched Image
          </Button>
        </div>
      )}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Stitching images…</p>
      ) : stitchedUrl ? (
        <img src={stitchedUrl} alt="Full exam" className="mt-4 rounded-md max-w-full" />
      ) : (
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
                  <Badge variant="outline" className="text-[10px] px-1.5">{QUESTION_TYPE_LABELS[q.type] || q.type}</Badge>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function Exams() {
  const [exams, setExams] = useState<GeneratedExam[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ReturnType<typeof getQuestions>>([]);
  const [settings, setSettings] = useState<ExamSettings>({
    excludedTypes: [],
    excludedSubtypes: [],
    difficultyBias: 3,
    typeWeights: {},
  });

  useEffect(() => {
    setExams(getExams());
    setQuestions(getQuestions());
  }, []);

  const handleGenerate = () => {
    const result = generateExam(questions, settings);
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

      <ExamSettingsPanel questions={questions} settings={settings} onChange={setSettings} />

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
