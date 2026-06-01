import { useMemo, useState } from "react";
import { stages, bossExtraPuzzles, type Puzzle } from "./data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skull, DoorOpen, Brain, Heart, Lightbulb, Trophy, RefreshCw } from "lucide-react";
import bgImage from "@/assets/school-bg.jpg";
import lanaImage from "@/assets/lana.jpg";

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
        <div className="grid md:grid-cols-[1fr_280px] gap-8 items-center">
          <div className="space-y-6 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start text-xs uppercase tracking-[0.3em] text-[var(--toxic)]">
              <Skull className="w-4 h-4" /> День X · 14:30
            </div>
            <h1 className="title-glow text-5xl md:text-7xl leading-none">
              СБЕГИ<br />ИЗ ШКОЛЫ
            </h1>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
              Меня зовут <span className="text-[var(--toxic)] font-bold">Лана</span>. Сегодня был обычный урок химии — пока кто-то не разбил колбу.
              Через десять минут половина школы уже выла за дверью. Учителя. Одноклассники. Все.
            </p>
            <p className="text-sm md:text-base text-muted-foreground italic">
              У меня три жизни, рюкзак с тетрадями и пять дверей между мной и улицей.
              Если зомби меня не съедят — может, логика спасёт.
            </p>
            <Button
              size="lg"
              onClick={() => setScreen("stage")}
              className="text-lg px-8 py-6 blood-border bg-[var(--blood)] hover:bg-[var(--blood)]/80 text-white"
            >
              <DoorOpen className="mr-2" /> Помочь Лане сбежать
            </Button>
          </div>
          <div className="relative mx-auto md:mx-0">
            <div className="absolute inset-0 rounded-2xl bg-[var(--toxic)]/30 blur-2xl" />
            <img
              src={lanaImage}
              alt="Лана — главная героиня"
              width={1024}
              height={1024}
              className="relative w-56 md:w-72 rounded-2xl border-2 border-[var(--toxic)]/60 shadow-2xl"
            />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background/90 border border-border px-3 py-1 rounded text-xs uppercase tracking-widest">
              Лана · 16 лет
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (screen === "win") {
    return (
      <Shell>
        <div className="text-center space-y-6">
          <Trophy className="w-24 h-24 mx-auto text-[var(--toxic)]" />
          <h1 className="title-glow text-5xl md:text-7xl">ЛАНА ВЫЖИЛА</h1>
          <p className="text-lg md:text-xl text-foreground/90 max-w-xl mx-auto leading-relaxed">
            Главные двери школы со скрипом распахнулись. Свежий воздух. Сирены вдалеке.
            Лана делает шаг наружу — и впервые за день дышит.
          </p>
          <p className="text-sm text-muted-foreground italic">Король-зомби повержен. Школа осталась позади.</p>
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
            ЛАНУ СЪЕЛИ
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Последнее, что она услышала — звонок с урока. Школа победила.
          </p>
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
        <div className="text-xs md:text-sm uppercase tracking-widest text-[var(--toxic)]">
          {stage.location} {isBoss && `· Раунд ${bossStep + 1}/3`}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase text-muted-foreground hidden sm:inline">Лана</span>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 ${i < hp ? "fill-[var(--blood)] text-[var(--blood)]" : "text-muted"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <Card className={`p-6 md:p-8 bg-card/85 backdrop-blur-md border-2 ${wrong ? "shake border-destructive" : "border-border"} ${isBoss ? "blood-border" : ""}`}>
        <h2 className="title-glow text-3xl md:text-4xl mb-4">{stage.title}</h2>
        <p className="text-foreground/85 italic mb-6 leading-relaxed">{stage.story}</p>

        <div className="bg-background/70 rounded-lg p-5 border border-border mb-6">
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
              className="justify-start text-left h-auto py-4 px-5 text-base bg-background/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
            >
              <span className="mr-3 font-bold text-[var(--toxic)]">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </Button>
          ))}
        </div>

        {currentPuzzle.hint && (
          <div className="mt-5">
            {showHint ? (
              <div className="flex items-start gap-2 text-sm text-[var(--toxic)] bg-background/60 p-3 rounded border border-[var(--toxic)]/30">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                {currentPuzzle.hint}
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} className="text-muted-foreground">
                <Lightbulb className="w-4 h-4 mr-1" /> Подсказка Ланы
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
    <main
      className="min-h-screen flex items-center justify-center p-4 md:p-8 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(8,14,10,0.78), rgba(8,14,10,0.92)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-3xl relative z-10">{children}</div>
    </main>
  );
}
