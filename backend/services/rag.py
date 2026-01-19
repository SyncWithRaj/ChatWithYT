
import os
import uuid
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = "yt_chat_v2" 

qdrant_client = QdrantClient(url=QDRANT_URL)

def get_models():
    if not os.getenv("GOOGLE_API_KEY"):
         raise Exception("GOOGLE_API_KEY not set")
    # Using 'models/text-embedding-004' for better rate limits and 768 dimensions
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    # User requested gemini-2.5-flash
    # chat = ChatGoogleGenerativeAI(model="gemini-2.0-flash-exp") 
    chat = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
    return embeddings, chat

async def process_video(data: dict):
    video_id = data['video_id']
    text = data['text']
    
    # Split
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = splitter.create_documents([text], metadatas=[{"video_id": video_id}])
    
    # Embed
    embeddings_model, _ = get_models()
    embeddings = embeddings_model.embed_documents([d.page_content for d in docs])
    
    if not embeddings:
        return {"status": "error", "message": "No embeddings generated"}
        
    dim = len(embeddings[0])
    
    # Check if exists and Create Collection if needed
    collections = qdrant_client.get_collections()
    if not any(c.name == COLLECTION_NAME for c in collections.collections):
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
    
    # Check for existing points
    count = qdrant_client.count(
        collection_name=COLLECTION_NAME,
        count_filter={"must": [{"key": "metadata.video_id", "match": {"value": video_id}}]}
    )
    if count.count > 0:
        return {"status": "exists", "video_id": video_id}

    
    # Upsert
    points = []
    for i, (doc, vector) in enumerate(zip(docs, embeddings)):
        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={"text": doc.page_content, "metadata": doc.metadata}
        ))
    
    qdrant_client.upsert(
        collection_name=COLLECTION_NAME,
        wait=True,
        points=points
    )
    
    return {"status": "success", "video_id": video_id, "chunks": len(points)}

async def chat_with_video(video_id: str, messages: list):
    embeddings_model, chat_model = get_models()
    
    # Get last user message
    query = messages[-1]['content']
    
    # Embed query
    query_vector = embeddings_model.embed_query(query)
    
    # Search
    search_result = qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter={"must": [{"key": "metadata.video_id", "match": {"value": video_id}}]},
        limit=4
    ).points
    
    context = "\n\n".join([hit.payload['text'] for hit in search_result])
    
    # Generate
    template = """You are a chill friend who has just watched this YouTube video. 
Answer the question in a normal, conversational tone, like you're talking to a friend. 
Be direct and helpful, but don't be over-enthusiastic or dramatic. Keep it grounded.
Base your answer ONLY on the following transcript segments.
If the answer is not in the transcript, just say "I didn't catch that in the video."

Context:
{context}

Question: {question}
Answer:"""

    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | chat_model | StrOutputParser()
    
    return chain.invoke({"context": context, "question": query})
