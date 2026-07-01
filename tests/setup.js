// 模拟 wx-server-sdk 的 cloud.database().collection().doc().get() 等链式调用
const createMockCollection = (name, initialData = []) => {
  let data = [...initialData];
  let nextId = 1;

  const chain = {
    _data: data,
    _name: name,

    doc(id) {
      const record = data.find(r => r._id === id);
      return {
        get() {
          return Promise.resolve(record ? { data: [record] } : { data: [] });
        },
        update(payload) {
          const updateData = payload.data || {};
          const idx = data.findIndex(r => r._id === id);
          if (idx >= 0) {
            data[idx] = { ...data[idx], ...updateData };
            return Promise.resolve({ stats: { updated: 1 } });
          }
          return Promise.resolve({ stats: { updated: 0 } });
        },
        remove() {
          data = data.filter(r => r._id !== id);
          return Promise.resolve({ stats: { removed: 1 } });
        },
        set(payload) {
          const setData = payload.data || {};
          const idx = data.findIndex(r => r._id === id);
          if (idx >= 0) {
            data[idx] = setData;
          } else {
            setData._id = id;
            data.push(setData);
          }
          return Promise.resolve({ stats: { updated: 1 } });
        }
      };
    },

    add(payload) {
      const newRecord = {
        _id: `${name}_${nextId++}_${Date.now()}`,
        ...(payload.data || {})
      };
      data.push(newRecord);
      return Promise.resolve({ _id: newRecord._id });
    },

    where(condition) {
      const filtered = data.filter(r => {
        return Object.keys(condition).every(k => r[k] === condition[k]);
      });
      return createWhereChain(filtered, data);
    },

    get() {
      return Promise.resolve({ data: [...data] });
    },

    limit(n) {
      return {
        get() { return Promise.resolve({ data: data.slice(0, n) }); }
      };
    },

    _reset(newData) {
      data.length = 0;
      data.push(...newData);
      chain._data = data;
      nextId = 1;
    }
  };

  return chain;
};

function createWhereChain(filtered, data) {
  return {
    get() { return Promise.resolve({ data: [...filtered] }); },
    count() { return Promise.resolve({ total: filtered.length }); },
    remove() {
      // Remove filtered items from data
      const ids = new Set(filtered.map(r => r._id));
      const newData = data.filter(r => !ids.has(r._id));
      data.length = 0;
      data.push(...newData);
      return Promise.resolve({ stats: { removed: filtered.length } });
    },
    update(payload) {
      const updateData = payload.data || {};
      filtered.forEach(r => {
        const idx = data.findIndex(d => d._id === r._id);
        if (idx >= 0) data[idx] = { ...data[idx], ...updateData };
      });
      return Promise.resolve({ stats: { updated: filtered.length } });
    },
    orderBy(field, direction) {
      return createOrderedChain(field, direction, filtered);
    }
  };
}

function createOrderedChain(field, direction, filtered) {
  const sorted = [...filtered].sort((a, b) => {
    const va = a[field] || '', vb = b[field] || '';
    return direction === 'desc' ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
  });
  return {
    get() { return Promise.resolve({ data: sorted }); },
    limit(n) {
      return {
        get() { return Promise.resolve({ data: sorted.slice(0, n) }); }
      };
    }
  };
}

// 全局 mock 数据库
global.__mockDB = {};
const mockDB = {
  collection(name) {
    if (!global.__mockDB[name]) {
      global.__mockDB[name] = createMockCollection(name);
    }
    return global.__mockDB[name];
  }
};

// 模拟 cloud 对象
jest.mock('wx-server-sdk', () => {
  return {
    init: jest.fn(),
    database: () => mockDB,
    callFunction: jest.fn(),
    getWXContext: () => ({
      OPENID: 'test_openid_' + Math.random().toString(36).slice(2, 8),
      APPID: 'test_appid',
      UNIONID: 'test_unionid'
    })
  };
});

// 辅助函数：重置所有 mock 数据库
global.resetMockDB = () => {
  Object.keys(global.__mockDB).forEach(key => {
    global.__mockDB[key]._reset([]);
  });
};

// 辅助函数：预填充数据
global.seedDB = (collection, records) => {
  if (!global.__mockDB[collection]) {
    global.__mockDB[collection] = createMockCollection(collection);
  }
  global.__mockDB[collection]._reset(records);
};

// 辅助函数：获取 collection 当前数据
global.getDB = (collection) => {
  return global.__mockDB[collection] ? global.__mockDB[collection]._data : [];
};