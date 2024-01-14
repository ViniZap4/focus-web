
import './App.css'

import Epub, { Book } from 'epubjs';
import { createSignal } from "solid-js";
import { effect } from 'solid-js/web';

const Test = () => {
  const [text, setText] = createSignal("");

  const speakOutLoud = () => {
    const speech = new SpeechSynthesisUtterance(text());
    speech.lang = "en-US"
    console.log(speech);
    window.speechSynthesis.speak(speech);

    let synth = window.speechSynthesis;
    let voices = synth.getVoices();
    console.log(voices);

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
     console.log("book", book()?.section("/EPUB/_preface_by_scott_chacon.xhtml"));

    // console.log("book", book()?.section());
  })

  return (
    <div class='container'>
      <input type="file" accept=".epub" onChange={handleFileChange} />

      <textarea
        placeholder="type something..."
        onInput={(e) => setText(e.target.value)}
      />
      <button onClick={speakOutLoud}>Speech</button>
    </div>
  );
};

export default Test 
