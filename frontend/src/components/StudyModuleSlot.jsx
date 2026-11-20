import { Puzzle } from "lucide-react";

/**
 * Extension point for the upcoming detailed embeddable learning module.
 * When the custom study module is added, mount it inside this component
 * receiving `topic` and `selectedFormat`.
 */
export default function StudyModuleSlot({ topic, selectedFormat }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <Puzzle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            Интерактивный модуль изучения — «{topic.title}»
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Слот готов для подключения подробного встраиваемого модуля изучения
            {selectedFormat
              ? ` (выбран формат: ${
                  selectedFormat === "video" ? "Видео" : "Презентация"
                })`
              : ""}
            . Вы уже можете ознакомиться с материалами выше и перейти к практике.
          </p>
        </div>
      </div>
    </div>
  );
}
