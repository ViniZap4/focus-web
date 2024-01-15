
import './App.css'

import Epub, { Book } from 'epubjs';
import { createSignal } from "solid-js";
import { effect } from 'solid-js/web';

const Test = () => {
  const [text, setText] = createSignal("");
  const [currentSectionHtml, setCurrentSectionHtml] = createSignal("");

  let divRef: HTMLDivElement | undefined;

  const speakOutLoud = () => {
    const speech = new SpeechSynthesisUtterance(text());
    speech.lang = "en-US"

    let synth = window.speechSynthesis;
    let voices = synth.getVoices();

    console.log(voices.filter((item)=> item.lang === "en-US"));
    
    speech.voice = voices.filter((item)=> item.lang === "en-US")[4] 
    console.log(voices);
    console.log(speech);
    window.speechSynthesis.speak(speech);
  };

  const [book, setBook] = createSignal<Book>();

  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input || !input.files || input.files?.length <= 0) return

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
    if (!book()) return
    book()?.ready.then(() => {

      console.log("book", book());
      
      book()?.loaded.navigation.then(navigation => {
        console.log("navigation", navigation);
        navigation.toc?.forEach(element => {
          const section = book()?.section(element.id)
          console.log("section" + element.id, section);

          book()?.load(section?.url || "").then(contents => {
            console.log("contents", contents);
            const htmlContent = contents as Node

            const serializer = new XMLSerializer();
            const sectionHtml = serializer.serializeToString(htmlContent);
            console.log("sectionHtml", sectionHtml);
            
            setCurrentSectionHtml(sectionHtml);
          });

        });

        return
      });


      console.log(book()?.section(0))
    })

  });
  return (
    <div class='container' ref={divRef}>
      <input type="file" accept=".epub" onChange={handleFileChange} />

      <textarea
        placeholder="type something..."
        onInput={(e) => setText(e.target.value)}
      />
      <button onClick={speakOutLoud}>Speech</button>
      <div innerHTML={currentSectionHtml()} />

    </div>
  );
};

export default Test 
