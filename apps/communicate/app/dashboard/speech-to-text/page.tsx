import type { Metadata } from "next";
import { SpeechToTextClient } from "./SpeechToTextClient";

export const metadata: Metadata = { title: "Speech to Text — SignSpeak" };

export default function SpeechToTextPage() {
  return <SpeechToTextClient />;
}
