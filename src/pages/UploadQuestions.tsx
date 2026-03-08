import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveQuestionsBulk, uploadQuestionImage } from '@/lib/store';
import { Difficulty, DIFFICULTY_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Upload, FolderOpen, Check, AlertCircle, Image } from 'lucide-react';

interface ParsedFile {
  file: File;
  difficulty: Difficulty;
  type: string;
  subtype?: string;
  label: string;
  preview?: string;
  error?: string;
}

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  a: 'easy',
  b: 'medium',
  c: 'hard',
};

function parseFilename(name: string): { difficulty: Difficulty; type: string; subtype: string; id: string } | null {
  const base = name.replace(/\.\w+$/, '').toLowerCase();
  const parts = base.split(/\-/);
  if (parts.length < 4) return null;
  const [id, diff, type, ...subtypeParts] = parts;
  const rawSubtype = subtypeParts.join('-');
  const subtype = rawSubtype.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  const difficulty = DIFFICULTY_ALIASES[diff];
  if (!difficulty) return null;
  return { difficulty, type, subtype, id };
}

export default function UploadQuestions() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error('No image files found in folder');
      return;
    }

    const parsed: ParsedFile[] = [];
    for (const file of files) {
      const result = parseFilename(file.name);
      const preview = URL.createObjectURL(file);
      if (result) {
        parsed.push({ file, difficulty: result.difficulty, type: result.type, subtype: result.subtype, label: file.name, preview });
      } else {
        parsed.push({
          file, difficulty: 'medium', type: 'multiple-choice', label: file.name, preview,
          error: 'Could not parse filename. Expected format: id-diff-type-subtype.png',
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
      const BATCH_SIZE = 10;
      for (let i = 0; i < valid.length; i += BATCH_SIZE) {
        const batch = valid.slice(i, i + BATCH_SIZE);
        const questions = await Promise.all(batch.map(async (pf) => {
          const id = crypto.randomUUID();
          const imageUrl = await uploadQuestionImage(id, pf.file);
          return {
            id,
            text: pf.file.name,
            type: pf.type,
            subtype: pf.subtype,
            difficulty: pf.difficulty,
            correctAnswer: '',
            createdAt: new Date().toISOString(),
            hasImage: true,
            imageUrl,
          };
        }));
        await saveQuestionsBulk(questions);
      }
      toast.success(`Uploaded ${valid.length} question${valid.length !== 1 ? 's' : ''}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
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
          Select a folder of question images. Name files like: <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">001-c-algebra-polynomial.png</code>
        </p>

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Filename format:</p>
              <p><code className="rounded bg-secondary px-1 py-0.5 text-xs font-mono">{'{id}-{diff}-{type}-{subtype}.png'}</code></p>
              <div className="mt-3">
                <p className="font-medium text-foreground text-xs mb-1">Difficulty codes</p>
                <p className="text-xs">a = Easy, b = Medium, c = Hard</p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              // @ts-ignore
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
              <FolderOpen className="h-5 w-5" /> Select Folder
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
                        <Badge variant="outline" className="text-[10px] px-1.5">{pf.type}</Badge>
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
