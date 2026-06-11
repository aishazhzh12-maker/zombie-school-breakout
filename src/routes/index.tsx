import { createFileRoute } from "@tanstack/react-router";
import EscapeGame from "@/game/EscapeGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DOLLS OF THE SCHOOL — хоррор-квест" },
      { name: "description", content: "Хоррор-квест: школа захвачена ожившими куклами. Помоги Лане найти друзей, решить простые задания и выбраться." },
      { property: "og:title", content: "DOLLS OF THE SCHOOL" },
      { property: "og:description", content: "Школьный хоррор-квест с куклами и простыми заданиями." },
    ],
  }),
  component: EscapeGame,
});
