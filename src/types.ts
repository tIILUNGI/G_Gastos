export type PaymentStatus = 'pago' | 'pendente' | 'atrasado';

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
  },
  {
    id: '3',
    category: 'Energia',
    company: 'ENDE',
    description: 'Consumo de Energia Elétrica - Sede',
    items: 'Consumo Mensal',
    amount: 850750.25,
    dueDate: '2026-03-10',
    status: 'pendente',
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
    status: 'pendente',
    isSubscription: false,
  },
  {
    id: '5',
    category: 'Abastecimento da Copa',
    company: 'Arreiou / Shoprite',
    description: 'Compras para a copa e recepção',
    items: 'Café, Açúcar, Água Mineral, Bolachas',
    amount: 320500.00,
    dueDate: '2026-03-05',
    status: 'pendente',
    isSubscription: false,
  },
  {
    id: '6',
    category: 'Matéria Prima',
    company: 'Casa de Papel',
    description: 'Aquisição de insumos para escritório',
    items: 'Papel A4, Toners, Canetas',
    amount: 2450000.00,
    dueDate: '2026-03-25',
    status: 'pendente',
    isSubscription: false,
  },
];
