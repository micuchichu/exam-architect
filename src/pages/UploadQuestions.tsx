import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveQuestion } from '@/lib/store';
import { saveImage } from '@/lib/idb';
import { QuestionType, Difficulty, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Upload, FolderOpen, Check, AlertCircle, Image } from 'lucide-react';

interface ParsedFile {
  file: File;
  difficulty: Difficulty;
  type: QuestionType;
  label: string;
  preview?: string;
  error?: string;
}

const TYPE_ALIASES: Record<string, QuestionType> = {
  'multiple-choice': 'multiple-choice',
  'mc': 'multiple-choice',
  'multiplechoice': 'multiple-choice',
  'true-false': 'true-false',
  'tf': 'true-false',
  'truefalse': 'true-false',
  'short-answer': 'short-answer',
  'sa': 'short-answer',
  'shortanswer': 'short-answer',
  'fill-blank': 'fill-blank',
  'fb': 'fill-blank',
  'fillblank': 'fill-blank',
  'fill': 'fill-blank',
};

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  easy: 'easy',
  e: 'easy',
  medium: 'medium',
  med: 'medium',
  m: 'medium',
  hard: 'hard',
  h: 'hard',
};

function parseFilename(name: string): { difficulty: Difficulty; type: QuestionType } | null {
  // Remove extension
  const base = name.replace(/\.\w+$/, '').toLowerCase();
  // Split by _ or -
  const parts = base.split(/[_\-]+/);

  let difficulty: Difficulty | null = null;
  let type: QuestionType | null = null;

  for (const part of parts) {
    if (!difficulty && DIFFICULTY_ALIASES[part]) {
      difficulty = DIFFICULTY_ALIASES[part];
    }
    if (!type && TYPE_ALIASES[part]) {
      type = TYPE_ALIASES[part];
    }
  }

  // Try combining adjacent parts for multi-word types like "multiple-choice"
  if (!type) {
    for (let i = 0; i < parts.length - 1; i++) {
      const combined = parts[i] + '-' + parts[i + 1];
      if (TYPE_ALIASES[combined]) {
        type = TYPE_ALIASES[combined];
        break;
      }
    }
  }

  if (!difficulty || !type) return null;
  return { difficulty, type };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function UploadQuestions() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f =>
      f.type.startsWith('image/')
    );

    if (files.length === 0) {
      toast.error('No image files found in folder');
      return;
    }

    const parsed: ParsedFile[] = [];
    for (const file of files) {
      const result = parseFilename(file.name);
      const preview = URL.createObjectURL(file);
      if (result) {
        parsed.push({ file, ...result, label: file.name, preview });
      } else {
        parsed.push({
          file,
          difficulty: 'medium',
          type: 'multiple-choice',
          label: file.name,
          preview,
          error: 'Could not parse filename. Expected format: difficulty_type_number.png (e.g., hard_mc_01.png)',
        });
      }
    }

    setParsedFiles(parsed);
  };

  const handleUpload = async () => {
    const valid = parsedFiles.filter(f => !f.error);
    if (valid.length === 0) {
      toast.error('No valid files to upload');
      return;
    }

    setUploading(true);
    try {
      for (const pf of valid) {
        const id = crypto.randomUUID();
        const dataUrl = await readFileAsDataUrl(pf.file);
        await saveImage(id, dataUrl);
        saveQuestion({
          id,
          text: pf.file.name,
          type: pf.type,
          difficulty: pf.difficulty,
          correctAnswer: '',
          createdAt: new Date().toISOString(),
          hasImage: true,
        });
      }
      toast.success(`Uploaded ${valid.length} question${valid.length !== 1 ? 's' : ''}!`);
      navigate('/');
    } catch (err) {
      toast.error('Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Upload Questions</h1>
        <p className="text-muted-foreground mb-8">
          Select a folder of question images. Name files like: <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">hard_mc_01.png</code>
        </p>

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Filename format:</p>
              <p><code className="rounded bg-secondary px-1 py-0.5 text-xs font-mono">{'{difficulty}_{type}_{number}.png'}</code></p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="font-medium text-foreground text-xs mb-1">Difficulty codes</p>
                  <p className="text-xs">easy / e, medium / med / m, hard / h</p>
                </div>
                <div>
                  <p className="font-medium text-foreground text-xs mb-1">Type codes</p>
                  <p className="text-xs">mc, tf, sa, fb (or full names)</p>
                </div>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              // @ts-ignore - webkitdirectory is not in TS types
              webkitdirectory=""
              multiple
              className="hidden"
              onChange={handleFolderSelect}
            />
            <Button
              variant="outline"
              className="w-full gap-2 h-20 border-dashed text-muted-foreground"
              onClick={() => inputRef.current?.click()}
            >
              <FolderOpen className="h-5 w-5" />
              Select Folder
            </Button>
          </div>
        </Card>

        {parsedFiles.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {parsedFiles.filter(f => !f.error).length} of {parsedFiles.length} files ready
              </p>
              <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload All Valid'}
              </Button>
            </div>

            <div className="grid gap-3">
              {parsedFiles.map((pf, i) => (
                <Card key={i} className={`p-3 flex items-center gap-3 ${pf.error ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  {pf.preview ? (
                    <img src={pf.preview} alt="" className="h-12 w-12 rounded object-cover bg-secondary" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center">
                      <Image className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pf.label}</p>
                    {pf.error ? (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3" /> {pf.error}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5">{DIFFICULTY_LABELS[pf.difficulty]}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5">{QUESTION_TYPE_LABELS[pf.type]}</Badge>
                        <Check className="h-3 w-3 text-easy" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
