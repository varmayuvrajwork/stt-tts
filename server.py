from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import azure.cognitiveservices.speech as speechsdk
from openai import AzureOpenAI
import os
import time
from dotenv import load_dotenv
load_dotenv()
from graph import wf  # LangGraph workflow

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Azure keys
AZURE_SPEECH_KEY = os.environ["AZURE_SPEECH_KEY"]
AZURE_REGION = os.environ["AZURE_REGION"]
AZURE_OPENAI_KEY = os.environ["AZURE_OPENAI_KEY"]
AZURE_OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
AZURE_DEPLOYMENT_NAME = os.environ["AZURE_DEPLOYMENT_NAME"]

openai_client = AzureOpenAI(
      api_key=AZURE_OPENAI_KEY,
      api_version="2024-02-15-preview",
      azure_endpoint=AZURE_OPENAI_ENDPOINT
)

lang_map = {
      "en": "English",
      "hi": "Hindi",
      "ja": "Japanese",
      "ko": "Korean",
      "zh": "Chinese"
}

def get_stt_lang_code(lang_code):
      return {
            "en": "en-US",
            "hi": "hi-IN",
            "ja": "ja-JP",
            "ko": "ko-KR",
            "zh": "zh-CN"
      }.get(lang_code, "en-US")

def get_tts_voice(lang_code):
      return {
            "en": "en-US-AriaNeural",
            "hi": "hi-IN-SwaraNeural",
            "ja": "ja-JP-NanamiNeural",
            "ko": "ko-KR-SunHiNeural",
            "zh": "zh-CN-XiaoxiaoNeural"
      }.get(lang_code, "en-US-AriaNeural")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
      return templates.TemplateResponse("index.html", {"request": request})

@app.post("/translate")
async def translate_voice(request: Request):
      body = await request.json()
      source_lang = body.get("sourceLang", "en")
      target_lang = body.get("targetLang", "hi")

      speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_REGION)
      speech_config.speech_recognition_language = get_stt_lang_code(source_lang)
      speech_config.speech_synthesis_voice_name = get_tts_voice(target_lang)
      audio_config = speechsdk.AudioConfig(use_default_microphone=True)
      recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

      print("🎤 Listening...")

      result = recognizer.recognize_once()
      print("📥 STT Result:", result.text)

      if result.reason != speechsdk.ResultReason.RecognizedSpeech:
            return {
                  "original": "",
                  "translated_query": "",
                  "agent_response": "",
                  "translated_response": ""
            }

      original_text = result.text

      # Translate input to target_lang
      translation_prompt = f"Translate this from {lang_map[source_lang]} to {lang_map[target_lang]}: {original_text}"
      translation_response = openai_client.chat.completions.create(
            model=AZURE_DEPLOYMENT_NAME,
            messages=[{"role": "user", "content": translation_prompt}]
      )
      translated_query = translation_response.choices[0].message.content

      speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
      speech_synthesizer.speak_text_async(translated_query).get()
      time.sleep(1)

      # Agent responds in target_lang
      agent_result = wf.invoke({
      "query": translated_query,
      "lang": target_lang
      })
      agent_response = agent_result["response"]

      # Translate agent reply to source_lang
      reverse_translation_prompt = f"Translate this from {lang_map[target_lang]} to {lang_map[source_lang]}: {agent_response}"
      reverse_translation = openai_client.chat.completions.create(
            model=AZURE_DEPLOYMENT_NAME,
            messages=[{"role": "user", "content": reverse_translation_prompt}]
      )
      translated_response = reverse_translation.choices[0].message.content

      speech_config.speech_synthesis_voice_name = get_tts_voice(source_lang)
      speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
      speech_synthesizer.speak_text_async(translated_response).get()
      time.sleep(1)

      return {
            "original": original_text,
            "translated_query": translated_query,
            "agent_response": agent_response,
            "translated_response": translated_response
      }
