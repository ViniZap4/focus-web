import "../App.css";

import Epub, { Book } from "epubjs";
import { createSignal } from "solid-js";
import { effect } from "solid-js/web";

const Test = () => {
  const [text, setText] = createSignal("");
  const [currentSectionHtml, setCurrentSectionHtml] = createSignal("");
  const [currentWorldIndex, setCurrentWorldIndex] = createSignal<number>(0);
  const [currentSpeechTextRange, setCurrentSpeechTextRange] =
    createSignal<number>(0);

  let divRef: HTMLDivElement | undefined;

  const speakOutLoud = () => {
    const speech = new SpeechSynthesisUtterance(text());
    speech.lang = "en-US";
    setCurrentWorldIndex(0);

    let synth = window.speechSynthesis;
    let voices = synth.getVoices();

    console.log(voices.filter((item) => item.lang === "en-US"));

    // speech.voice = voices.filter((item)=> item.lang === "en-US")[4]
    speech.voice = voices.filter((item) => item.lang === "en-US")[0];
    console.log(voices);
    console.log(speech);
    window.speechSynthesis.speak(speech);

    speech.addEventListener("boundary", function (e) {
      console.log("boundary event", e);

      let start = e.charIndex;
      let end = start + e.charLength;
      // Exibe o texto atual sendo falado
      const currentText = text().substring(start, end);
      console.log("Texto atual:", currentText);
      setCurrentSpeechTextRange(currentText.split(" ").length);
      console.log(currentText.split(" ").length, "length of currentText");
      setCurrentWorldIndex((old) => old + currentText.split(" ").length);
    });
    speech.addEventListener("error", function (e) {
      console.log("boundary error", e);
    });
    speech.addEventListener("mark", function (e) {
      console.log("boundary mark", e);
    });
    speech.addEventListener("mark", function (e) {
      console.log("boundary mark", e);
    });
  };

  const [book, setBook] = createSignal<Book>();

  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input || !input.files || input.files?.length <= 0) return;

    const file = input?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const epubBook = Epub(e.target?.result || "");
        setBook(epubBook);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  effect(() => {
    if (!book()) return;
    book()?.ready.then(() => {
      console.log("book", book());

      book()?.loaded.navigation.then((navigation) => {
        console.log("navigation", navigation);
        navigation.toc?.forEach((element) => {
          console.log(element);

          const section = book()?.section(element.id);
          console.log("section" + element.id, section);

          book()
            ?.load(section?.url || "")
            .then((contents) => {
              console.log("contents", contents);
              const htmlContent = contents as Node;

              const serializer = new XMLSerializer();
              const sectionHtml = serializer.serializeToString(htmlContent);
              console.log("sectionHtml", sectionHtml);

              setCurrentSectionHtml(sectionHtml);
            });
        });

        return;
      });

      console.log(book()?.section(0));
    });
  });

  const getTextRender = () => {
    // const textArray = text().replace(/\s+/g, " ").trim().split(/\b/);
    const textArray = text().replace(/\s+/g, " ").trim().split(" ");
    // .filter((word) => word.trim().length > 0);

    console.log("textArray", textArray);

    return textArray;
  };

  return (
    <div class="container" ref={divRef}>
      <input type="file" accept=".epub" onChange={handleFileChange} />

      <textarea
        placeholder="type something..."
        onInput={(e) => setText(e.target.value)}
      />
      <button onClick={speakOutLoud}>Speech</button>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
        }}
      >
        {getTextRender().map((item, key) => {
          console.table([
            { type: "item", item },
            { type: "key", item: key },
            { type: "currentWorldIndex", item: currentWorldIndex() },
          ]);
          if (
            key === currentWorldIndex() - 1 ||
            key === currentWorldIndex() - currentSpeechTextRange()
          ) {
            // if (currentSpeechText().includes(item)) {
            return (
              <span
                style={{
                  color: "orange",
                  scale: 1.1,
                }}
              >
                {item}
              </span>
            );
          }
          return <span>{item}</span>;
        })}
        <div class="placeholder"></div>
        <div innerHTML={currentSectionHtml()} />
      </div>
    </div>
  );
};

export default Test;
