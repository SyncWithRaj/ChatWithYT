
from qdrant_client import QdrantClient
client = QdrantClient("http://localhost:6333")
print(dir(client))
try:
    print(client.search)
except Exception as e:
    print(f"Error accessing search: {e}")
