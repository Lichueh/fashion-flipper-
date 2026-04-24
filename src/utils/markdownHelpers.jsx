// src/utils/markdownHelpers.js

export function getHeadingStyle(text) {
  const lower = String(text).toLowerCase().trim();
  if (lower.startsWith("tip"))
    return { emoji: "💡", className: "text-amber-300 font-semibold" };
  if (lower.startsWith("note"))
    return { emoji: "📝", className: "text-sky-300 font-semibold" };
  if (lower.startsWith("warning") || lower.startsWith("caution"))
    return { emoji: "⚠️", className: "text-orange-300 font-semibold" };
  return null;
}

export function makeHeading(Tag, baseClass) {
  return function HeadingRenderer({ children }) {
    const rawText = Array.isArray(children)
      ? children.map((c) => (typeof c === "string" ? c : "")).join("")
      : String(children ?? "");
    const special = getHeadingStyle(rawText);
    if (special) {
      return (
        <Tag className={`${special.className} mb-2 mt-3 first:mt-0`}>
          {special.emoji} {children}
        </Tag>
      );
    }
    return (
      <Tag className={`${baseClass} mb-2 mt-4 first:mt-0`}>{children}</Tag>
    );
  };
}

const CALLOUT_TAGS = [
  { tag: "Tip", emoji: "💡", label: "Tip" },
  { tag: "Note", emoji: "📝", label: "Note" },
  { tag: "Warning", emoji: "⚠️", label: "Warning" },
  { tag: "Caution", emoji: "⚠️", label: "Caution" },
];

export function preprocessFreesewingMarkdown(md) {
  if (!md) return md;
  let result = md;
  for (const { tag, emoji, label } of CALLOUT_TAGS) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    result = result.replace(regex, (_, inner) => {
      const lines = inner.trim().split("\n").map(l => `> ${l}`).join("\n");
      return `> ${emoji} **${label}:**\n>\n${lines}\n`;
    });
  }
  return result;
}
