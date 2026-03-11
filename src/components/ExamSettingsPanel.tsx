import { ExamSettings } from '@/lib/types';
import { DIFFICULTY_LEVEL_LABELS } from '@/lib/templateGenerator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['algebra', 'analiza', 'geometrie'];

interface ExamSettingsPanelProps {
  settings: Partial<ExamSettings> & { difficultyLevel?: number };
  onChange: (s: Partial<ExamSettings> & { difficultyLevel?: number }) => void;
}

const ExamSettingsPanel = ({ settings, onChange }: ExamSettingsPanelProps) => {
  const diffLevel = settings.difficultyLevel ?? 2;

  return (
    <div className="space-y-6 p-4 rounded-xl border bg-card">
      {/* Difficulty Level (from Excel templates) */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          Dificultate Examen:{" "}
          <span className="text-primary">
            {DIFFICULTY_LEVEL_LABELS[diffLevel]}
          </span>
        </Label>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[diffLevel]}
          onValueChange={([v]) =>
            onChange({ ...settings, difficultyLevel: v })
          }
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {Object.entries(DIFFICULTY_LEVEL_LABELS).map(([k, v]) => (
            <span key={k}>{v}</span>
          ))}
        </div>
      </div>

      {/* Excluded Categories */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Exclude Categorii</Label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => {
            const excluded = (settings.excludedTypes ?? []).includes(cat);
            return (
              <button
                key={cat}
                onClick={() => {
                  const current = settings.excludedTypes ?? [];
                  const next = excluded
                    ? current.filter((c) => c !== cat)
                    : [...current, cat];
                  onChange({ ...settings, excludedTypes: next });
                }}
              >
                <Badge
                  variant={excluded ? "destructive" : "outline"}
                  className="cursor-pointer capitalize"
                >
                  {cat}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExamSettingsPanel;
