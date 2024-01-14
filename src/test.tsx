
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
    book()?.ready.then(() => {

      console.log("book", book());

      // console.log("book", book()?.section());

      book()?.loaded.navigation.then(navigation => {
        console.log("navigation", navigation); 
        navigation.toc?.forEach(element => {
          element.subitems?.forEach((subItem) => {

            const section = book()?.section(subItem.id)
            console.log("sub-section" + element.id, section);
          })
          const section = book()?.section(element.id)
          console.log("section" + element.id, section);

          book()?.load(section?.url|| "").then(contents => {
            console.log("contents", contents);
          });

        });


        return
      });


      console.log(book()?.section(0))
    })

  });
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
