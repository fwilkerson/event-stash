import cuid from "cuid";

let _collection = "events";
let _context;

export function commit(event) {
  return new Promise((res, rej) => {
    event.createdAt = +Date.now();

    if (!event.aggregateId) {
      event.aggregateId = cuid();
    }

    const transaction = _context.transaction(_collection, "readwrite");
    const store = transaction.objectStore(_collection);
    const saveRequest = store.add(event);

    let result;

    saveRequest.onerror = rej;
    saveRequest.onsuccess = e => {
      const getRequest = store.get(e.target.result);
      getRequest.onerror = rej;
      getRequest.onsuccess = e => (result = e.target.result);
    };

    transaction.onerror = rej;
    transaction.oncomplete = e => res(result);
  });
}

export function getByAggregateId(ids) {
  return new Promise((res, rej) => {
    ids.sort(); // ensure ids are sorted in ascending order
    const request = _context
      .transaction(_collection, "readonly")
      .objectStore(_collection)
      .index("aggregateId")
      .getAll(IDBKeyRange.bound(ids[0], ids[ids.length - 1]));

    request.onerror = rej;
    request.onsuccess = e => res(e.target.result);
  });
}

export function getByType(type) {
  return new Promise((res, rej) => {
    const request = _context
      .transaction(_collection, "readonly")
      .objectStore(_collection)
      .index("type")
      .getAll(type);

    request.onerror = rej;
    request.onsuccess = e => res(e.target.result);
  });
}

export function open(version = 1) {
  return new Promise((res, rej) => {
    const request = indexedDB.open("EVENT_STASH", version);
    request.onerror = rej;
    request.onupgradeneeded = initializeSchema;
    request.onsuccess = function() {
      _context = this.result;
      res();
    };
  });
}

function initializeSchema(e) {
  const { result } = e.currentTarget;

  const store = result.createObjectStore(_collection, {
    keyPath: "_id",
    autoIncrement: true
  });

  store.createIndex("aggregateId", "aggregateId", { unique: false });
  store.createIndex("createdAt", "createdAt", { unique: false });
  store.createIndex("type", "type", { unique: false });
}
