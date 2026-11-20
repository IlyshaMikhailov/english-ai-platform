import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import CharacterIllustration from "./CharacterIllustrations";
import StudyModuleSlot from "./StudyModuleSlot";

const PRESENTATION_SLIDES = [
  {
    number: 1,
    word: "Clever",
    translation: "Умный, сообразительный",
    description: "Мальчик в очках, читающий книгу",
    imageKey: "clever",
    example: "Jack is a very clever boy who solves difficult problems easily.",
  },
  {
    number: 2,
    word: "Shy",
    translation: "Застенчивый, робкий",
    description: "Девочка, которая стеснительно смотрит вниз и прикрывает лицо руками",
    imageKey: "shy",
    example: "Anna doesn't like talking to new people. She is very shy.",
  },
  {
    number: 3,
    word: "Polite",
    translation: "Вежливый, учтивый",
    description: "Мальчик, который придерживает дверь для другого человека",
    imageKey: "polite",
    example: "Lisa always says «please» and «thank you». She is polite.",
  },
  {
    number: 4,
    word: "Stubborn",
    translation: "Упрямый, несговорчивый",
    description: "Ребёнок, который скрестил руки и сердито смотрит в сторону",
    imageKey: "stubborn",
    example: "Peter never changes his mind. He is very stubborn.",
  },
  {
    number: 5,
    word: "Curious",
    translation: "Любознательный, пытливый",
    description: "Девочка с увеличительным стеклом, рассматривающая бабочку",
    imageKey: "curious",
    example: "Ben always asks questions because he wants to know everything. He is curious.",
  },
  {
    number: 6,
    word: "Patient",
    translation: "Терпеливый",
    description: "Мальчик, спокойно ожидающий своей очереди",
    imageKey: "patient",
    example: "Tom always waits calmly for his turn. He is very patient.",
  },
  {
    number: 7,
    word: "Spiky",
    translation: "Торчащие (о волосах)",
    description: "Мальчик с короткими торчащими волосами",
    imageKey: "spiky",
    example: "He has cool spiky hair and blue eyes.",
  },
  {
    number: 8,
    word: "Well-built",
    translation: "Крепкого телосложения, атлетичный",
    description: "Спортивный мужчина с широкими плечами",
    imageKey: "well_built",
    example: "The gym coach is very well-built with broad shoulders.",
  },
  {
    number: 9,
    word: "Pigtails",
    translation: "Косички, хвостики",
    description: "Девочка с двумя заплетёнными хвостиками",
    imageKey: "pigtails",
    example: "The little girl with pigtails was smiling happily.",
  },
  {
    number: 10,
    word: "Moustache",
    translation: "Усы",
    description: "Мужчина с заметными усами",
    imageKey: "moustache",
    example: "Whose moustache is this? My grandfather has one.",
  },
  {
    number: 11,
    word: "Curly",
    translation: "Кудрявые (волосы)",
    description: "Девочка с кудрявыми пышными волосами",
    imageKey: "curly",
    example: "She has long curly hair and wears a red ribbon.",
  },
  {
    number: 12,
    word: "Freckles",
    translation: "Веснушки",
    description: "Ребёнок с веснушками на лице",
    imageKey: "freckles",
    example: "In summer, cute freckles appear on his nose and cheeks.",
  },
];

function isEmbeddableVideo(url) {
  if (!url) return false;
  return (
    url.includes("youtube.com/embed/") ||
    url.includes("player.vimeo.com/") ||
    url.endsWith(".mp4")
  );
}

export default function MaterialSelector({ topic }) {
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const activeUrl =
    selectedFormat === "video"
      ? topic.video_url
      : selectedFormat === "presentation"
        ? topic.presentation_url
        : null;

  const isPptx = activeUrl && activeUrl.toLowerCase().endsWith(".pptx");
  const currentSlide = PRESENTATION_SLIDES[currentSlideIndex];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelectedFormat("video")}
          className={`group flex flex-col justify-between rounded-2xl border p-6 text-left transition ${
            selectedFormat === "video"
              ? "border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200"
              : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
              <PlayCircle className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              Видеоурок
            </span>
          </div>
          <div className="mt-5">
            <h3 className="text-lg font-bold text-slate-900">Смотреть видео</h3>
            <p className="mt-1 text-sm text-slate-600">
              Разбор грамматики, живые примеры произношения и ключевые правила
              темы «{topic.title}».
            </p>
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelectedFormat("presentation")}
          className={`group flex flex-col justify-between rounded-2xl border p-6 text-left transition ${
            selectedFormat === "presentation"
              ? "border-violet-500 bg-violet-50/70 shadow-md ring-2 ring-violet-200"
              : "border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
              <FileText className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              Презентация
            </span>
          </div>
          <div className="mt-5">
            <h3 className="text-lg font-bold text-slate-900">
              Открыть презентацию
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              12 иллюстрированных слайдов по лексике внешности и характера,
              шпаргалка и примеры употребления.
            </p>
          </div>
        </motion.button>
      </div>

      {selectedFormat && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <BookOpenCheck className="h-5 w-5 text-indigo-600" />
              <h4 className="text-base font-semibold text-slate-900">
                {selectedFormat === "video"
                  ? "Видеоматериал урока"
                  : "Презентация к уроку"}
              </h4>
            </div>
            {activeUrl && (
              <div className="flex items-center gap-2">
                {isPptx ? (
                  <a
                    href={activeUrl}
                    download="Для_AI_репетитора.pptx"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Скачать .pptx (5.8 МБ)
                  </a>
                ) : (
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Открыть источник
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {selectedFormat === "video" && (
            <div className="mt-5">
              {isEmbeddableVideo(activeUrl) ? (
                <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-inner">
                  {activeUrl.endsWith(".mp4") ? (
                    <video
                      src={activeUrl}
                      controls
                      autoPlay={false}
                      className="h-full w-full"
                    >
                      Ваш браузер не поддерживает встроенное воспроизведение MP4.
                    </video>
                  ) : (
                    <iframe
                      src={activeUrl}
                      title={topic.title}
                      className="h-full w-full"
                      allowFullScreen
                    />
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{topic.title}</p>
                  <p className="mt-1 text-slate-600">{topic.description}</p>
                  {activeUrl && (
                    <p className="mt-3 text-xs text-indigo-600">
                      Видеофайл: {activeUrl}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedFormat === "presentation" && (
            <div className="mt-5 space-y-5">
              {isPptx ? (
                <>
                  {/* Interactive Slide Viewer */}
                  <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/40 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
                          <Eye className="h-3.5 w-3.5" />
                          Слайд {currentSlideIndex + 1} из {PRESENTATION_SLIDES.length}
                        </span>
                        <span className="text-xs text-slate-500">
                          «Для AI репетитора.pptx»
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentSlideIndex((prev) =>
                              prev > 0 ? prev - 1 : PRESENTATION_SLIDES.length - 1
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                          title="Предыдущий слайд"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentSlideIndex((prev) =>
                              prev < PRESENTATION_SLIDES.length - 1 ? prev + 1 : 0
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                          title="Следующий слайд"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide.number}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="mt-6 flex flex-col items-center justify-center rounded-xl bg-white p-6 text-center shadow-sm md:flex-row md:gap-8 md:text-left"
                      >
                        <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-100 p-2 shadow-sm">
                          <CharacterIllustration imageKey={currentSlide.imageKey} />
                        </div>
                        <div className="mt-4 md:mt-0">
                          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                            <h3 className="text-2xl font-black text-slate-900">
                              {currentSlide.word}
                            </h3>
                            <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                              Adjective
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-violet-700">
                            {currentSlide.translation}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            <strong>Описание на слайде:</strong> {currentSlide.description}
                          </p>
                          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-700">
                            💡 {currentSlide.example}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Quick navigation thumbnails / dots */}
                    <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                      {PRESENTATION_SLIDES.map((s, idx) => (
                        <button
                          key={s.number}
                          type="button"
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            idx === currentSlideIndex
                              ? "bg-violet-600 text-white shadow"
                              : "bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                          }`}
                        >
                          {idx + 1}. {s.word}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>
                        Оригинальный файл презентации сохранён в системе и доступен для загрузки
                      </span>
                    </div>
                    <a
                      href={activeUrl}
                      download="Для_AI_репетитора.pptx"
                      className="font-bold text-violet-700 hover:underline"
                    >
                      Скачать файл .pptx
                    </a>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{topic.title}</p>
                  <p className="mt-1 text-slate-600">{topic.description}</p>
                  {activeUrl && (
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block font-semibold text-indigo-600 hover:underline"
                    >
                      Открыть презентацию: {activeUrl}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      <StudyModuleSlot topic={topic} selectedFormat={selectedFormat} />
    </div>
  );
}
