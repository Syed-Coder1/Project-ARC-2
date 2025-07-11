import { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Client, Receipt, Expense, Activity, Notification } from '../types';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const data = await db.getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const createClient = async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newClient = await db.createClient(client);
      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  };

  const updateClient = async (client: Client) => {
    try {
      await db.updateClient(client);
      setClients(prev => prev.map(c => c.id === client.id ? client : c));
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  return { clients, loading, createClient, updateClient, refetch: fetchClients };
}

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = async () => {
    try {
      const data = await db.getAllReceipts();
      setReceipts(data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const createReceipt = async (receipt: Omit<Receipt, 'id' | 'createdAt'>) => {
    try {
      const newReceipt = await db.createReceipt(receipt);
      setReceipts(prev => [...prev, newReceipt]);
      return newReceipt;
    } catch (error) {
      console.error('Error creating receipt:', error);
      throw error;
    }
  };

  const getReceiptsByClient = async (clientCnic: string) => {
    try {
      return await db.getReceiptsByClient(clientCnic);
    } catch (error) {
      console.error('Error fetching client receipts:', error);
      return [];
    }
  };

  return { receipts, loading, createReceipt, getReceiptsByClient, refetch: fetchReceipts };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      const data = await db.getAllExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const createExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      const newExpense = await db.createExpense(expense);
      setExpenses(prev => [...prev, newExpense]);
      return newExpense;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  };

  return { expenses, loading, createExpense, refetch: fetchExpenses };
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const data = await db.getAllActivities();
      setActivities(data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return { activities, loading, refetch: fetchActivities };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await db.getAllNotifications();
      setNotifications(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await db.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await db.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  return { notifications, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}

export function useDatabase() {
  const clients = useClients();
  const receipts = useReceipts();
  const expenses = useExpenses();
  const notifications = useNotifications();

  return {
    // Clients
    clients: clients.clients,
    clientsLoading: clients.loading,
    createClient: clients.createClient,
    updateClient: clients.updateClient,
    refetchClients: clients.refetch,

    // Receipts
    receipts: receipts.receipts,
    receiptsLoading: receipts.loading,
    createReceipt: receipts.createReceipt,
    getReceiptsByClient: receipts.getReceiptsByClient,
    refetchReceipts: receipts.refetch,

    // Expenses
    expenses: expenses.expenses,
    expensesLoading: expenses.loading,
    createExpense: expenses.createExpense,
    refetchExpenses: expenses.refetch,

    // Notifications
    notifications: notifications.notifications,
    notificationsLoading: notifications.loading,
    markNotificationAsRead: notifications.markAsRead,
    markAllNotificationsAsRead: notifications.markAllAsRead,
    refetchNotifications: notifications.refetch,
  };
}