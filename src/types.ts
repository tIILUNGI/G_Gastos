export type PaymentStatus = 'pago' | 'pendente' | 'atrasado';

export type RecurrenceFrequency = 'none' | 'diario' | 'semanal' | 'mensal' | 'anual';

export interface PaymentHistory {
  id: string;
  expenseId: string;
  company: string;
  amount: number;
  paymentDate: string;
  dueDate: string;
  category: string;
}

export interface Expense {
  id: string;
  category: string;
  company: string;
  description: string;
  items?: string; // What was bought
  amount: number; // Cost
  dueDate: string;
  lastPaymentDate?: string;
  status: PaymentStatus;
  isSubscription: boolean;
  recurrence?: RecurrenceFrequency;
  notes?: string;
}

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: '1',
    category: 'Internet',
    company: 'Unitel',
    description: 'Plano Mensal de Internet Corporativa',
    items: 'Link Dedicado 50Mbps',
    amount: 1250000.50,
    dueDate: '2026-03-15',
    status: 'pendente',
    isSubscription: true,
    recurrence: 'mensal',
  },
  {
    id: '2',
    category: 'Água',
    company: 'Saldabel/EPAL',
    description: 'Consumo de Água Mensal - Sede',
    items: 'Consumo Mensal',
    amount: 45800.00,
    dueDate: '2026-03-20',
    status: 'pendente',
    isSubscription: false,
    recurrence: 'mensal',
  },
  {
    id: '3',
    category: 'Energia',
    company: 'ENDE',
    description: 'Consumo de Energia Elétrica - Sede',
    items: 'Consumo Mensal',
    amount: 850750.25,
    dueDate: '2026-03-01',
    status: 'atrasado',
    isSubscription: false,
  },
  {
    id: '4',
    category: 'Produtos de Limpeza',
    company: 'Suave',
    description: 'Reposição de material de limpeza trimestral',
    items: 'Detergentes, Desinfetantes, Papel Higiénico',
    amount: 150000.00,
    dueDate: '2026-03-05',
    status: 'atrasado',
    isSubscription: false,
  },
  {
    id: '5',
    category: 'Abastecimento da Copa',
    company: 'Arreiou / Shoprite',
    description: 'Compras para a copa e recepção',
    items: 'Café, Açúcar, Água Mineral, Bolachas',
    amount: 320500.00,
    dueDate: '2026-03-08',
    status: 'pendente',
    isSubscription: false,
  },
];
