import { User, Client, Receipt, Expense, Activity, Notification } from '../types';

class DatabaseService {
  private dbName = 'TaxOfficeDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
        }

        // Clients store
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientStore.createIndex('cnic', 'cnic', { unique: true });
          clientStore.createIndex('name', 'name');
        }

        // Receipts store
        if (!db.objectStoreNames.contains('receipts')) {
          const receiptStore = db.createObjectStore('receipts', { keyPath: 'id' });
          receiptStore.createIndex('clientCnic', 'clientCnic');
          receiptStore.createIndex('date', 'date');
        }

        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expenseStore.createIndex('date', 'date');
          expenseStore.createIndex('category', 'category');
        }

        // Activities store
        if (!db.objectStoreNames.contains('activities')) {
          const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
          activityStore.createIndex('userId', 'userId');
          activityStore.createIndex('timestamp', 'timestamp');
        }

        // Notifications store
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notificationStore.createIndex('createdAt', 'createdAt');
        }

        // Whiteboards store
        if (!db.objectStoreNames.contains('whiteboards')) {
          const whiteboardStore = db.createObjectStore('whiteboards', { keyPath: 'id' });
          whiteboardStore.createIndex('createdBy', 'createdBy');
          whiteboardStore.createIndex('updatedAt', 'updatedAt');
          whiteboardStore.createIndex('isFavorite', 'isFavorite');
        }
      };
    });
  }

  private async getObjectStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init();
    }
    const transaction = this.db!.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // User operations
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const store = await this.getObjectStore('users', 'readwrite');
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newUser);
      request.onsuccess = () => resolve(newUser);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const store = await this.getObjectStore('users');
    const index = store.index('username');
    
    return new Promise((resolve, reject) => {
      const request = index.get(username);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers(): Promise<User[]> {
    const store = await this.getObjectStore('users');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateUser(user: User): Promise<void> {
    const store = await this.getObjectStore('users', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(user);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Client operations
  async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    if (!this.db) {
      await this.init();
    }
    
    // Create transaction for both clients and notifications
    const transaction = this.db!.transaction(['clients', 'notifications'], 'readwrite');
    const clientStore = transaction.objectStore('clients');
    const notificationStore = transaction.objectStore('notifications');
    
    const newClient: Client = {
      ...client,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const notification: Notification = {
      id: crypto.randomUUID(),
      message: `New client registered: ${client.name} (${client.cnic})`,
      type: 'info',
      read: false,
      createdAt: new Date(),
    };
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      
      const clientRequest = clientStore.add(newClient);
      const notificationRequest = notificationStore.add(notification);
      
      let clientAdded = false;
      let notificationAdded = false;
      
      const checkComplete = () => {
        if (clientAdded && notificationAdded) {
          resolve(newClient);
        }
      };
      
      clientRequest.onsuccess = () => {
        clientAdded = true;
        checkComplete();
      };
      
      notificationRequest.onsuccess = () => {
        notificationAdded = true;
        checkComplete();
      };
      
      clientRequest.onerror = () => reject(clientRequest.error);
      notificationRequest.onerror = () => reject(notificationRequest.error);
    });
  }

  async getClientByCnic(cnic: string): Promise<Client | null> {
    const store = await this.getObjectStore('clients');
    const index = store.index('cnic');
    
    return new Promise((resolve, reject) => {
      const request = index.get(cnic);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllClients(): Promise<Client[]> {
    const store = await this.getObjectStore('clients');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateClient(client: Client): Promise<void> {
    const store = await this.getObjectStore('clients', 'readwrite');
    const updatedClient = { ...client, updatedAt: new Date() };
    
    return new Promise((resolve, reject) => {
      const request = store.put(updatedClient);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Receipt operations
  async createReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
    if (!this.db) {
      await this.init();
    }
    
    // Create transaction for both receipts and notifications
    const transaction = this.db!.transaction(['receipts', 'notifications'], 'readwrite');
    const receiptStore = transaction.objectStore('receipts');
    const notificationStore = transaction.objectStore('notifications');
    
    const newReceipt: Receipt = {
      ...receipt,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    const notification: Notification = {
      id: crypto.randomUUID(),
      message: `New receipt created: ₨${receipt.amount.toLocaleString()} for ${receipt.clientName}`,
      type: 'info',
      read: false,
      createdAt: new Date(),
    };
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      
      const receiptRequest = receiptStore.add(newReceipt);
      const notificationRequest = notificationStore.add(notification);
      
      let receiptAdded = false;
      let notificationAdded = false;
      
      const checkComplete = () => {
        if (receiptAdded && notificationAdded) {
          resolve(newReceipt);
        }
      };
      
      receiptRequest.onsuccess = () => {
        receiptAdded = true;
        checkComplete();
      };
      
      notificationRequest.onsuccess = () => {
        notificationAdded = true;
        checkComplete();
      };
      
      receiptRequest.onerror = () => reject(receiptRequest.error);
      notificationRequest.onerror = () => reject(notificationRequest.error);
    });
  }

  async getReceiptsByClient(clientCnic: string): Promise<Receipt[]> {
    const store = await this.getObjectStore('receipts');
    const index = store.index('clientCnic');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(clientCnic);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllReceipts(): Promise<Receipt[]> {
    const store = await this.getObjectStore('receipts');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateReceipt(receipt: Receipt): Promise<void> {
    const store = await this.getObjectStore('receipts', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(receipt);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReceipt(id: string): Promise<void> {
    const store = await this.getObjectStore('receipts', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Expense operations
  async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newExpense);
      request.onsuccess = () => resolve(newExpense);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllExpenses(): Promise<Expense[]> {
    const store = await this.getObjectStore('expenses');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateExpense(expense: Expense): Promise<void> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(expense);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteExpense(id: string): Promise<void> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteClient(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    
    // Delete client and all associated receipts
    const transaction = this.db!.transaction(['clients', 'receipts'], 'readwrite');
    const clientStore = transaction.objectStore('clients');
    const receiptStore = transaction.objectStore('receipts');
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      
      // First get the client to find their CNIC
      const getClientRequest = clientStore.get(id);
      getClientRequest.onsuccess = () => {
        const client = getClientRequest.result;
        if (client) {
          // Delete all receipts for this client
          const receiptIndex = receiptStore.index('clientCnic');
          const receiptRequest = receiptIndex.openCursor(client.cnic);
          
          receiptRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              // All receipts deleted, now delete the client
              const deleteClientRequest = clientStore.delete(id);
              deleteClientRequest.onsuccess = () => resolve();
              deleteClientRequest.onerror = () => reject(deleteClientRequest.error);
            }
          };
          
          receiptRequest.onerror = () => reject(receiptRequest.error);
        } else {
          resolve(); // Client doesn't exist
        }
      };
      
      getClientRequest.onerror = () => reject(getClientRequest.error);
    });
  }

  // Activity operations
  async createActivity(activity: Omit<Activity, 'id'>): Promise<Activity> {
    const store = await this.getObjectStore('activities', 'readwrite');
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newActivity);
      request.onsuccess = () => resolve(newActivity);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllActivities(): Promise<Activity[]> {
    const store = await this.getObjectStore('activities');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Notification operations
  async createNotification(notification: Omit<Notification, 'id'>): Promise<Notification> {
    const store = await this.getObjectStore('notifications', 'readwrite');
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newNotification);
      request.onsuccess = () => resolve(newNotification);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllNotifications(): Promise<Notification[]> {
    const store = await this.getObjectStore('notifications');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const store = await this.getObjectStore('notifications', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const notification = getRequest.result;
        if (notification) {
          notification.read = true;
          const putRequest = store.put(notification);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    const store = await this.getObjectStore('notifications', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const notifications = request.result;
        let completed = 0;
        const total = notifications.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        notifications.forEach(notification => {
          if (!notification.read) {
            notification.read = true;
            const putRequest = store.put(notification);
            putRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                resolve();
              }
            };
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            completed++;
            if (completed === total) {
              resolve();
            }
          }
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Whiteboard operations
  async createWhiteboard(whiteboard: Omit<Whiteboard, 'id' | 'createdAt' | 'updatedAt' | 'lastViewedAt'>): Promise<Whiteboard> {
    const store = await this.getObjectStore('whiteboards', 'readwrite');
    const newWhiteboard: Whiteboard = {
      ...whiteboard,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastViewedAt: new Date(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newWhiteboard);
      request.onsuccess = () => resolve(newWhiteboard);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllWhiteboards(): Promise<Whiteboard[]> {
    const store = await this.getObjectStore('whiteboards');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateWhiteboard(whiteboard: Whiteboard): Promise<void> {
    const store = await this.getObjectStore('whiteboards', 'readwrite');
    const updatedWhiteboard = { ...whiteboard, updatedAt: new Date() };
    
    return new Promise((resolve, reject) => {
      const request = store.put(updatedWhiteboard);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWhiteboard(id: string): Promise<void> {
    const store = await this.getObjectStore('whiteboards', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Backup and restore
  async exportData(): Promise<string> {
    const users = await this.getAllUsers();
    const clients = await this.getAllClients();
    const receipts = await this.getAllReceipts();
    const expenses = await this.getAllExpenses();
    const activities = await this.getAllActivities();
    const notifications = await this.getAllNotifications();
    const whiteboards = await this.getAllWhiteboards();

    const data = {
      users,
      clients,
      receipts,
      expenses,
      activities,
      notifications,
      whiteboards,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    
    // Clear existing data
    const stores = ['users', 'clients', 'receipts', 'expenses', 'activities', 'notifications', 'whiteboards'];
    for (const storeName of stores) {
      const store = await this.getObjectStore(storeName, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Import new data
    const importStore = async (storeName: string, items: any[]) => {
      const store = await this.getObjectStore(storeName, 'readwrite');
      for (const item of items) {
        await new Promise<void>((resolve, reject) => {
          const request = store.add(item);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    };

    await importStore('users', data.users || []);
    await importStore('clients', data.clients || []);
    await importStore('receipts', data.receipts || []);
    await importStore('expenses', data.expenses || []);
    await importStore('activities', data.activities || []);
    await importStore('notifications', data.notifications || []);
    await importStore('whiteboards', data.whiteboards || []);
  }
}

export const db = new DatabaseService();