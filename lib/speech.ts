/**
 * Web Speech API text-to-speech utility for word and example sentence pronunciation
 */

export class SpeechService {
  private static synth: SpeechSynthesis | null = null;
  private static voices: SpeechSynthesisVoice[] = [];

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private static init() {
    if (!this.isSupported()) return;
    this.synth = window.speechSynthesis;

    const loadVoices = () => {
      this.voices = this.synth?.getVoices() || [];
    };

    loadVoices();
    if (this.synth?.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  private static isVietnamese(text: string): boolean {
    return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
  }

  public static speak(text: string, rate: number = 0.9): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported() || !text?.trim()) {
        resolve();
        return;
      }

      if (!this.synth) {
        this.init();
      }

      if (this.synth) {
        try {
          this.synth.cancel(); // Stop any pending utterance
          if (this.synth.paused) {
            this.synth.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          const isVi = this.isVietnamese(text);

          if (isVi) {
            const viVoice = this.voices.find((v) => v.lang.startsWith('vi'));
            if (viVoice) utterance.voice = viVoice;
            utterance.lang = 'vi-VN';
          } else {
            const enVoice =
              this.voices.find((v) => v.lang.startsWith('en-US') && !v.name.includes('Google')) ||
              this.voices.find((v) => v.lang.startsWith('en-US')) ||
              this.voices.find((v) => v.lang.startsWith('en-GB'));
            if (enVoice) utterance.voice = enVoice;
            utterance.lang = 'en-US';
          }

          utterance.rate = rate;
          utterance.pitch = 1.0;

          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();

          this.synth.speak(utterance);
        } catch {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }
}
