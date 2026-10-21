import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [color, setColor] = useState("red");

  const [text, setText] = useState("Hello world");
  const [textColor, setTextColor] = useState("#ff1493");

  const [count, setCount] = useState(1);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--text-preview-color",
      textColor,
    );
  }, [textColor]);

  return (
    <main className="app">
      <section className="color-section">
        <button
          className={`color-button color-button--${color}`}
          onClick={() => setColor(color === "red" ? "blue" : "red")}
        >
          {color === "red" ? "Go Blue" : "Go Red"}
        </button>
      </section>

      <section className="text-section">
        <p className="text-preview">{text}</p>

        <input
          className="text-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <input
          className="color-picker"
          type="color"
          value={textColor}
          onChange={(e) =>
            setTextColor(e.target.value)
          }
        />
      </section>

      <section className="counter-section">
        <h2>{count}</h2>

        <button
          className="counter-button"
          onClick={() => setCount(count + 1)}
        >
          Count Up
        </button>

        <button
          className="counter-button"
          onClick={() => setCount(count - 1)}
        >
          Count Down
        </button>
      </section>
    </main>
  );
}

export default App;
