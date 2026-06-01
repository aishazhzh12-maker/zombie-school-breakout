import { useMemo, useState } from "react";
import { stages, bossExtraPuzzles, type Puzzle } from "./data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skull, DoorOpen, Brain, Heart, Lightbulb, Trophy, RefreshCw } from "lucide-react";

type Screen = "intro" | "stage" | "win" | "dead";

export default function EscapeGame() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [stageIdx, setStageIdx] = useState(0);
  const [bossStep, setBossStep] = useState(0);
  const [hp, setHp] = useState(3);
  const [showHint, setShowHint] = useState(false);
  const [wrong, setWrong] = useState(false);

  const stage = stages[stageIdx];
  const isBoss = stage?.id === "gym";

  const currentPuzzle: Puzzle = useMemo(() => {
    if (!isBoss) return stage.puzzle;
    if (bossStep === 0) return stage.puzzle;
    return bossExtraPuzzles[bossStep - 1];
  }, [stage, isBoss, bossStep]);

  function reset() {
    setScreen("intro");
    setStageIdx(0);
    setBossStep(0);
    setHp(3);
    setShowHint(false);
    setWrong(false);
  }

  function answer(i: number) {
    setShowHint(false);
    if (i === currentPuzzle.answer) {
      setWrong(false);
      if (isBoss) {
        if (bossStep < bossExtraPuzzles.length) {
          setBossStep((b) => b + 1);
        } else {
          setScreen("win");
        }
      } else if (stageIdx < stages.length - 1) {
        setStageIdx((s) => s + 1);
      } else {
        setScreen("win");
      }
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 500);
      setHp((h) => {
        const nh = h - 1;
        if (nh <= 0) setScreen("dead");
        return nh;
      });
    }
  }

  if (screen === "intro") {
    return (
      <Shell>
        <div className="text-center space-y-8">
          <Skull className="w-24 h-24 mx-auto text-[var(--toxic)] drop-shadow-[0_0_20px_var(--toxic)]" />
          <h1 className="title-glow text-6xl md:text-8xl">СБЕГИ ИЗ ШКОЛЫ</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Обычный школьный день закончился криком. По коридорам бредут <span className="text-[var(--blood)] font-bold">зомби</span>.
            Учителя превратились в монстров. У тебя три жизни, пять испытаний и одна цель —
            <span className="text-[var(--toxic)] font-bold"> выбраться живым</span>.
          </p>
          <Button
            size="lg"
            onClick={() => setScreen("stage")}
            className="text-xl px-10 py-7 blood-border bg-[var(--blood)] hover:bg-[var(--blood)]/80 text-white"
          >
            <DoorOpen className="mr-2" /> Начать побег
          </Button>
        </div>
      </Shell>
    );
  }

  if (screen === "win") {
    return (
      <Shell>
        <div className="text-center space-y-6">
          <Trophy className="w-24 h-24 mx-auto text-[var(--toxic)]" />
          <h1 className="title-glow text-5xl md:text-7xl">ТЫ ВЫЖИЛ!</h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Двери школы распахнулись. За забором ждёт армия. Король-зомби повержен логикой.
            Ты — последний выпускник этой школы.
          </p>
          <Button size="lg" onClick={reset} className="bg-primary text-primary-foreground">
            <RefreshCw className="mr-2" /> Сыграть снова
          </Button>
        </div>
      </Shell>
    );
  }

  if (screen === "dead") {
    return (
      <Shell>
        <div className="text-center space-y-6">
          <Skull className="w-24 h-24 mx-auto text-[var(--blood)] animate-pulse" />
          <h1 className="title-glow text-5xl md:text-7xl" style={{ color: "var(--blood)" }}>
            ТЕБЯ СЪЕЛИ
          </h1>
          <p className="text-lg text-muted-foreground">Зомби пируют. Школа победила.</p>
          <Button size="lg" onClick={reset} variant="destructive">
            <RefreshCw className="mr-2" /> Попробовать снова
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm uppercase tracking-widest text-muted-foreground">
          {stage.location} {isBoss && `· Раунд ${bossStep + 1}/3`}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-6 h-6 ${i < hp ? "fill-[var(--blood)] text-[var(--blood)]" : "text-muted"}`}
            />
          ))}
        </div>
      </div>

      <Card className={`p-6 md:p-8 bg-card/80 backdrop-blur border-2 ${wrong ? "shake border-destructive" : "border-border"} ${isBoss ? "blood-border" : ""}`}>
        <h2 className="title-glow text-3xl md:text-4xl mb-4">{stage.title}</h2>
        <p className="text-muted-foreground italic mb-6 leading-relaxed">{stage.story}</p>

        <div className="bg-background/60 rounded-lg p-5 border border-border mb-6">
          <div className="flex items-start gap-3">
            <Brain className="w-6 h-6 text-[var(--toxic)] mt-1 shrink-0" />
            <p className="text-lg font-medium">{currentPuzzle.question}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentPuzzle.options.map((opt, i) => (
            <Button
              key={i}
              variant="outline"
              onClick={() => answer(i)}
              className="justify-start text-left h-auto py-4 px-5 text-base hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
            >
              <span className="mr-3 font-bold text-[var(--toxic)]">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </Button>
          ))}
        </div>

        {currentPuzzle.hint && (
          <div className="mt-5">
            {showHint ? (
              <div className="flex items-start gap-2 text-sm text-[var(--toxic)] bg-background/40 p-3 rounded border border-[var(--toxic)]/30">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                {currentPuzzle.hint}
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} className="text-muted-foreground">
                <Lightbulb className="w-4 h-4 mr-1" /> Подсказка (без штрафа)
              </Button>
            )}
          </div>
        )}
      </Card>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Этап {isBoss ? stages.length : stageIdx + 1} из {stages.length}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl">{children}</div>
    </main>
  );
}
