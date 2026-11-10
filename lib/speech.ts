/**
 * Web Speech API text-to-speech utility for word and example sentence pronunciation
 */

export class SpeechService {
  private static synth: SpeechSynthesis | null = null;
  private static defaultVoice: SpeechSynthesisVoice | null = null;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private static init() {
    if (!this.isSupported()) return;
    this.synth = window.speechSynthesis;

    const setVoice = () => {
      const voices = this.synth?.getVoices() || [];
      // Prefer standard US or UK English voices
      this.defaultVoice =
        voices.find(v => v.lang.startsWith('en-US') && !v.name.includes('Google')) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices.find(v => v.lang.startsWith('en-GB')) ||
        voices[0] ||
        null;
    };

    setVoice();
    if (this.synth?.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = setVoice;
    }
  }

  public static speak(text: string, rate: number = 0.9): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported()) {
        resolve();
        return;
      }

      if (!this.synth) {
        this.init();
      }

      if (this.synth) {
        this.synth.cancel(); // Stop any pending utterance
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.defaultVoice) {
          utterance.voice = this.defaultVoice;
        }
        utterance.rate = rate; // slightly slower for clear educational articulation
        utterance.pitch = 1.0;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        this.synth.speak(utterance);
      } else {
        resolve();
      }
    });
  }
}
