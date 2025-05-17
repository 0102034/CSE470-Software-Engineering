"""
In-memory database fallback for when MongoDB is not available.
This is a simple implementation that mimics the basic MongoDB operations.
"""

class Collection:
    def __init__(self, name):
        self.name = name
        self.data = []
        self._id_counter = 1
    
    def insert_one(self, document):
        if '_id' not in document:
            document['_id'] = self._id_counter
            self._id_counter += 1
        self.data.append(document)
        return {'inserted_id': document['_id']}
    
    def insert_many(self, documents):
        inserted_ids = []
        for doc in documents:
            result = self.insert_one(doc)
            inserted_ids.append(result['inserted_id'])
        return {'inserted_ids': inserted_ids}
    
    def find_one(self, query=None, *args, **kwargs):
        if query is None:
            query = {}
        
        for doc in self.data:
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                return doc
        return None
    
    def find(self, query=None, *args, **kwargs):
        if query is None:
            query = {}
        
        results = []
        for doc in self.data:
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                results.append(doc)
        
        return results
    
    def update_one(self, query, update, *args, **kwargs):
        doc = self.find_one(query)
        if doc:
            if '$set' in update:
                for key, value in update['$set'].items():
                    doc[key] = value
            return {'modified_count': 1}
        return {'modified_count': 0}
    
    def update_many(self, query, update, *args, **kwargs):
        docs = self.find(query)
        modified_count = 0
        for doc in docs:
            if '$set' in update:
                for key, value in update['$set'].items():
                    doc[key] = value
            modified_count += 1
        return {'modified_count': modified_count}
    
    def delete_one(self, query):
        for i, doc in enumerate(self.data):
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                self.data.pop(i)
                return {'deleted_count': 1}
        return {'deleted_count': 0}
    
    def delete_many(self, query):
        original_length = len(self.data)
        self.data = [doc for doc in self.data if not all(
            key in doc and doc[key] == value for key, value in query.items()
        )]
        return {'deleted_count': original_length - len(self.data)}
    
    def count_documents(self, query=None):
        if query is None:
            query = {}
        return len(self.find(query))


class MemoryDB:
    def __init__(self):
        self.collections = {}
    
    def get_collection(self, name):
        if name not in self.collections:
            self.collections[name] = Collection(name)
        return self.collections[name]
    
    def list_collection_names(self):
        return list(self.collections.keys())
