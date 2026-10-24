import React, {
  useEffect,
  useState,
} from "react";
import {
  Volume2,
  VolumeX,
} from "lucide-react";

function HindiAudioButton({
  text = "",
  children,
  className = "",
  label = "Listen in Hindi",
  stopLabel = "Stop",
  disabled = false,
}) {
  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const speechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  const resolvedText =
    text ||
    (typeof children === "string"
      ? children
      : "");

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!speechSupported) {
      return undefined;
    }

    const handleEnd = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.addEventListener(
      "end",
      handleEnd
    );

    window.speechSynthesis.addEventListener(
      "cancel",
      handleEnd
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "end",
        handleEnd
      );

      window.speechSynthesis.removeEventListener(
        "cancel",
        handleEnd
      );
    };
  }, [speechSupported]);

  const stopSpeaking = () => {
    if (!speechSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const startSpeaking = () => {
    if (
      !speechSupported ||
      !resolvedText.trim()
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        resolvedText
      );

    utterance.lang = "hi-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(
      utterance
    );
  };

  const handleClick = () => {
    if (
      disabled ||
      !speechSupported ||
      !resolvedText.trim()
    ) {
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
    } else {
      startSpeaking();
    }
  };

  const isDisabled =
    disabled ||
    !speechSupported ||
    !resolvedText.trim();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={
        isSpeaking ? stopLabel : label
      }
      title={
        !speechSupported
          ? "Hindi audio is not supported by this browser"
          : isSpeaking
            ? stopLabel
            : label
      }
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
        isDisabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
          : isSpeaking
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      } ${className}`}
    >
      {isSpeaking ? (
        <VolumeX size={16} />
      ) : (
        <Volume2 size={16} />
      )}

      <span>
        {isSpeaking
          ? stopLabel
          : label}
      </span>
    </button>
  );
}

export default HindiAudioButton;