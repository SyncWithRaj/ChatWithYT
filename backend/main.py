
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from services.transcript import fetch_transcript
from services.rag import process_video, chat_with_video

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    video_id: str
    messages: list[dict]

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.post("/api/ingest")
async def ingest_video(request: IngestRequest):
    try:
        data = fetch_transcript(request.url)
        result = await process_video(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        response = await chat_with_video(request.video_id, request.messages)
        return {"response": response}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
