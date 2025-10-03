import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { Text, Parent } from "mdast";

const remarkMarkdownV2: Plugin = () => {
  return (tree) => {
    visit(tree, "text", (node: Text, _index, parent) => {
      if (!parent || !("children" in parent)) return;
      const p = parent as Parent;

      let text = node.value;
      const children: Array<Text | { type: "html"; value: string }> = [];

      // Шаг 1: Обрабатываем подчеркивание (самый высокий приоритет)
      text = text.replace(
        /__([^_]+)__/g,
        '<span data-underline="true">$1</span>',
      );

      // Шаг 2: Обрабатываем жирный с **
      text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Шаг 3: Обрабатываем жирный с *
      text = text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

      // Шаг 4: Обрабатываем курсив
      text = text.replace(/_([^_]+)_/g, "<em>$1</em>");

      // Шаг 5: Обрабатываем зачеркивание
      text = text.replace(/~([^~]+)~/g, "<s>$1</s>");

      // Шаг 6: Обрабатываем код
      text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

      // Шаг 7: Обрабатываем ссылки
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

      // Разбиваем на узлы
      const parts = text.split(/(<[^>]+>)/g);
      for (const part of parts) {
        if (part.startsWith("<") && part.endsWith(">")) {
          children.push({ type: "html", value: part });
        } else if (part) {
          children.push({ type: "text", value: part });
        }
      }

      if (children.length > 0) {
        const idx = p.children.indexOf(node);
        p.children.splice(idx, 1, ...children);
      }
    });
  };
};

export default remarkMarkdownV2;
