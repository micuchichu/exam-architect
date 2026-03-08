import { useState, useMemo } from 'react';
import { Question, ExamSettings, QUESTION_TYPE_LABELS } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface ExamSettingsPanelProps {
  questions: Question[];
  settings: ExamSettings;
  onChange: (settings: ExamSettings) => void;
}

const BIAS_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Balanced',
  4: 'Hard',
  5: 'Very Hard',
};

export default function ExamSettingsPanel({ questions, settings, onChange }: ExamSettingsPanelProps) {
  const [open, setOpen] = useState(false);

  const types = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => set.add(q.type));
    return Array.from(set).sort();
  }, [questions]);

  const subtypes = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => { if (q.subtype) set.add(q.subtype); });
    return Array.from(set).sort();
  }, [questions]);

  const toggleType = (type: string) => {
    const excluded = settings.excludedTypes.includes(type)
      ? settings.excludedTypes.filter(t => t !== type)
      : [...settings.excludedTypes, type];
    onChange({ ...settings, excludedTypes: excluded });
  };

  const toggleSubtype = (subtype: string) => {
    const excluded = settings.excludedSubtypes.includes(subtype)
      ? settings.excludedSubtypes.filter(s => s !== subtype)
      : [...settings.excludedSubtypes, subtype];
    onChange({ ...settings, excludedSubtypes: excluded });
  };

  const setDifficultyBias = (value: number[]) => {
    onChange({ ...settings, difficultyBias: value[0] });
  };

  const setTypeWeight = (type: string, value: number) => {
    onChange({ ...settings, typeWeights: { ...settings.typeWeights, [type]: value } });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="gap-2 mb-4">
          <Settings2 className="h-4 w-4" />
          Exam Settings
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="p-5 mb-6 space-y-6">
          {/* Difficulty Bias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Difficulty</Label>
              <Badge variant="outline" className="text-xs">
                {BIAS_LABELS[settings.difficultyBias]}
              </Badge>
            </div>
            <Slider
              value={[settings.difficultyBias]}
              onValueChange={setDifficultyBias}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Mostly easy</span>
              <span>Mostly hard</span>
            </div>
          </div>

          {/* Exclude Types */}
          {types.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Include Types</Label>
              <div className="flex flex-wrap gap-3">
                {types.map(type => (
                  <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={!settings.excludedTypes.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    {QUESTION_TYPE_LABELS[type as keyof typeof QUESTION_TYPE_LABELS] || type}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Exclude Subtypes */}
          {subtypes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Include Subtypes</Label>
              <div className="flex flex-wrap gap-3">
                {subtypes.map(subtype => (
                  <label key={subtype} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={!settings.excludedSubtypes.includes(subtype)}
                      onCheckedChange={() => toggleSubtype(subtype)}
                    />
                    {subtype}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Type Weights */}
          {types.length > 1 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Type Proportions</Label>
              <p className="text-xs text-muted-foreground">Drag to make certain types more or less common</p>
              <div className="space-y-3">
                {types
                  .filter(t => !settings.excludedTypes.includes(t))
                  .map(type => (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {QUESTION_TYPE_LABELS[type as keyof typeof QUESTION_TYPE_LABELS] || type}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {settings.typeWeights[type] ?? 50}%
                        </span>
                      </div>
                      <Slider
                        value={[settings.typeWeights[type] ?? 50]}
                        onValueChange={(v) => setTypeWeight(type, v[0])}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
