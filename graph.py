from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional
from openai import AzureOpenAI
import os
from dotenv import load_dotenv
load_dotenv()
# LangGraph state
class GraphState(TypedDict):
      query: Optional[str]
      lang: Optional[str]   # target_lang (used for multilingual)
      response: Optional[str]

# Azure OpenAI client
client = AzureOpenAI(
      api_key=os.environ["AZURE_OPENAI_KEY"],
      azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
      api_version="2024-02-15-preview"
)

AZURE_DEPLOYMENT_NAME = os.environ["AZURE_DEPLOYMENT_NAME"]

# Language label map
lang_map = {
      "en": "English",
      "hi": "Hindi",
      "ja": "Japanese",
      "ko": "Korean",
      "zh": "Chinese"
}

# Multilingual agent tool
def ask_agent_in_language(state: GraphState) -> GraphState:
      query = state["query"]
      target_lang = state.get("lang", "en")
      lang_label = lang_map.get(target_lang, "English")

      system_prompt = f"You are a helpful AI assistant. Respond only in {lang_label}."

      chat_completion = client.chat.completions.create(
            model=AZURE_DEPLOYMENT_NAME,
            messages=[
                  {"role": "system", "content": system_prompt},
                  {"role": "user", "content": query}
            ]
      )

      reply = chat_completion.choices[0].message.content
      return {"response": reply}

# LangGraph workflow
graph = StateGraph(GraphState)
graph.add_node("agent", ask_agent_in_language)
graph.set_entry_point("agent")
graph.add_edge("agent", END)
wf = graph.compile()
