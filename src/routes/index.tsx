import { createFileRoute } from "@tanstack/react-router";
import EscapeGame from "@/game/EscapeGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Сбеги из школы — игра-квест с загадками на логику" },
      { name: "description", content: "Хоррор-квест: школа захвачена зомби. Решай логические загадки, открывай двери и победи босса, чтобы сбежать." },
      { property: "og:title", content: "Сбеги из школы" },
      { property: "og:description", content: "Зомби-квест с загадками на логику." },
    ],
  }),
  component: EscapeGame,
});
