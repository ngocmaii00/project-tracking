/**
 * Azure AI Speech Service
 * Hỗ trợ Speech-to-Text và Speaker Diarization
 */

const SDK = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');

const SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

async function transcribeWithDiarization(audioPath) {
  if (!SPEECH_KEY || !SPEECH_REGION) {
    throw new Error('Azure AI Speech credentials missing. Real-time transcription is disabled.');
  }

  return new Promise((resolve, reject) => {
    const audioConfig = SDK.AudioConfig.fromWavFileInput(fs.readFileSync(audioPath));
    const speechConfig = SDK.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
    
    // Enable Diarization
    speechConfig.setProperty(SDK.PropertyId.SpeechServiceResponse_DiarizationOption, 'Simple');
    
    const recognizer = new SDK.ConversationTranscriber(speechConfig, audioConfig);
    
    let fullTranscript = [];

    recognizer.transcribed = (s, e) => {
      if (e.result.reason === SDK.ResultReason.RecognizedSpeech) {
        fullTranscript.push({
          speaker: e.result.speakerId || 'Unknown',
          text: e.result.text,
          timestamp: new Date().toISOString()
        });
      }
    };

    recognizer.sessionStopped = (s, e) => {
      recognizer.stopTranscribingAsync();
      resolve(fullTranscript);
    };

    recognizer.canceled = (s, e) => {
      reject(e.errorDetails);
    };

    recognizer.startTranscribingAsync();
  });
}


module.exports = { transcribeWithDiarization };
