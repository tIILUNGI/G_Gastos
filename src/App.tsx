import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MoreVertical, 
  Calendar, 
  Building2, 
  CreditCard,
  Trash2,
  Edit3,
  TrendingUp,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Expense, INITIAL_EXPENSES, PaymentStatus, PaymentHistory } from './types';

const Logo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 320 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="60" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="52" fill="#112F24" letterSpacing="-2">ilun</text>
    <text x="122" y="60" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="52" fill="#7D00A3" letterSpacing="-2">g</text>
    <rect x="152" y="22" width="16" height="16" fill="#B38600" rx="1" />
    <text x="172" y="60" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="52" fill="#112F24" letterSpacing="-2">i</text>
    <text x="12" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="400" fill="#112F24" letterSpacing="0.2">Caminhos para o Desenvolvimento</text>
  </svg>
);

const getLogoPngDataUrl = (): Promise<string> => {
  return new Promise((resolve) => {
    const svg = `<svg width="320" height="100" viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="100" fill="white" />
      <text x="10" y="60" font-family="Arial, sans-serif" font-weight="800" font-size="52" fill="#112F24" letter-spacing="-2">ilun</text>
      <text x="122" y="60" font-family="Arial, sans-serif" font-weight="800" font-size="52" fill="#7D00A3" letter-spacing="-2">g</text>
      <rect x="152" y="22" width="16" height="16" fill="#B38600" rx="1" />
      <text x="172" y="60" font-family="Arial, sans-serif" font-weight="800" font-size="52" fill="#112F24" letter-spacing="-2">i</text>
      <text x="12" y="85" font-family="Arial, sans-serif" font-size="15" font-weight="400" fill="#112F24" letter-spacing="0.2">Caminhos para o Desenvolvimento</text>
    </svg>`;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  });
};

const calculateNextDueDate = (currentDate: string, frequency: any): string => {
  const date = new Date(currentDate);
  if (isNaN(date.getTime())) return currentDate;
  
  switch (frequency) {
    case 'diario':
      date.setDate(date.getDate() + 1);
      break;
    case 'semanal':
      date.setDate(date.getDate() + 7);
      break;
    case 'mensal':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'anual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return currentDate;
  }
  return date.toISOString().split('T')[0];
};

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'history'>('expenses');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'todos'>('todos');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [formData, setFormData] = useState<Partial<Expense>>({
    company: '',
    category: '',
    description: '',
    items: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    isSubscription: false,
    recurrence: 'none',
    status: 'pendente'
  });

  useEffect(() => {
    const saved = localStorage.getItem('gestor_gastos_v1');
    const savedHistory = localStorage.getItem('gestor_historico_v1');
    
    let initialData = saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    // Auto-update statuses based on current date
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    initialData = initialData.map((exp: Expense) => {
      // If it's not paid, check if it's overdue or pending
      if (exp.status !== 'pago') {
        const isOverdue = exp.dueDate < today;
        return {
          ...exp,
          status: isOverdue ? 'atrasado' : 'pendente'
        };
      }
      
      // If it's a recurring expense and the month has changed since its last payment/due date,
      // we should ensure it resets to pending for the new month if it hasn't already.
      // This handles the "muda automaticamente para pendente" requirement.
      if (exp.recurrence && exp.recurrence !== 'none') {
        const expMonth = exp.dueDate.substring(0, 7);
        if (expMonth < currentMonth) {
          // The paid item is from a previous month, move it to the current/next period
          const nextDueDate = calculateNextDueDate(exp.dueDate, exp.recurrence);
          return {
            ...exp,
            status: 'pendente',
            dueDate: nextDueDate
          };
        }
      }
      
      return exp;
    });
    
    setExpenses(initialData);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('gestor_gastos_v1', JSON.stringify(expenses));
      localStorage.setItem('gestor_historico_v1', JSON.stringify(history));
    }
  }, [expenses, history, isLoaded]);

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData(expense);
      setAmountInput(expense.amount.toString());
    } else {
      setEditingExpense(null);
      setFormData({
        company: '',
        category: '',
        description: '',
        items: '',
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        isSubscription: false,
        recurrence: 'none',
        status: 'pendente'
      });
      setAmountInput('');
    }
    setIsModalOpen(true);
  };

  const handleAmountChange = (val: string) => {
    // Remove everything except numbers, dots and commas
    const cleanVal = val.replace(/[^\d.,]/g, '');
    setAmountInput(cleanVal);
    
    // Convert to number for storage: remove dots (thousand separators) and replace comma with dot (decimal)
    // If there are multiple dots/commas, we need to be careful.
    // Assuming the LAST separator is decimal if it's a comma or if there's only one dot.
    // But usually users in Angola use dot for thousands and comma for decimals.
    
    let numericValue = 0;
    if (cleanVal) {
      // Remove all dots (thousands)
      const noThousands = cleanVal.replace(/\./g, '');
      // Replace comma with dot (decimal)
      const standardFormat = noThousands.replace(',', '.');
      numericValue = parseFloat(standardFormat) || 0;
    }
    
    setFormData({ ...formData, amount: numericValue });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure status is correctly set based on dueDate if it's not 'pago'
    const today = new Date().toISOString().split('T')[0];
    const finalStatus = formData.status === 'pago' 
      ? 'pago' 
      : (formData.dueDate && formData.dueDate < today ? 'atrasado' : 'pendente');

    const finalData = {
      ...formData,
      status: finalStatus,
      // Ensure recurrence is 'none' if not a subscription
      recurrence: formData.isSubscription ? (formData.recurrence || 'mensal') : 'none'
    };

    if (editingExpense) {
      setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? { ...exp, ...finalData } as Expense : exp));
    } else {
      const newExpense: Expense = {
        ...finalData,
        id: Math.random().toString(36).substr(2, 9),
      } as Expense;
      setExpenses(prev => [...prev, newExpense]);
    }
    setIsModalOpen(false);
  };

  const toggleStatus = (id: string) => {
    setExpenses(prev => {
      const updatedExpenses = [...prev];
      const expenseIndex = updatedExpenses.findIndex(exp => exp.id === id);
      
      if (expenseIndex !== -1) {
        const exp = updatedExpenses[expenseIndex];
        let newStatus: PaymentStatus;
        const today = new Date().toISOString().split('T')[0];
        
        if (exp.status === 'pago') {
          newStatus = exp.dueDate < today ? 'atrasado' : 'pendente';
          updatedExpenses[expenseIndex] = { 
            ...exp, 
            status: newStatus,
            lastPaymentDate: undefined
          };
        } else {
          newStatus = 'pago';
          // Add to history
          const historyEntry: PaymentHistory = {
            id: Math.random().toString(36).substr(2, 9),
            expenseId: exp.id,
            company: exp.company,
            amount: exp.amount,
            paymentDate: today,
            dueDate: exp.dueDate,
            category: exp.category
          };
          setHistory(prevHistory => [historyEntry, ...prevHistory]);

          // Handle Recurrence
          if (exp.recurrence && exp.recurrence !== 'none') {
            const nextDueDate = calculateNextDueDate(exp.dueDate, exp.recurrence);
            updatedExpenses[expenseIndex] = {
              ...exp,
              status: 'pendente',
              dueDate: nextDueDate,
              lastPaymentDate: today
            };
          } else {
            updatedExpenses[expenseIndex] = { 
              ...exp, 
              status: newStatus,
              lastPaymentDate: today
            };
          }
        }
      }
      return updatedExpenses;
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' Kz';
  };

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file);
      const worksheet = workbook.getWorksheet('Gestão de Despesas');
      
      if (!worksheet) {
        alert('Planilha "Gestão de Despesas" não encontrada no arquivo.');
        return;
      }

      const updatedExpenses = [...expenses];
      const newHistoryEntries: PaymentHistory[] = [];
      const today = new Date().toISOString().split('T')[0];

      worksheet.eachRow((row, rowNumber) => {
        // Data starts after headers. We look for rows that have data.
        // In our export, data rows have company in col 1, status in col 5
        if (rowNumber > 11) {
          const company = row.getCell(1).text;
          const status = row.getCell(5).text?.toLowerCase();
          const amount = parseFloat(row.getCell(8).text.replace(/[^\d.]/g, ''));

          if (company && status === 'pago') {
            // Find matching expense in current state
            const expIndex = updatedExpenses.findIndex(e => 
              e.company === company && 
              e.status !== 'pago'
            );

            if (expIndex !== -1) {
              const exp = updatedExpenses[expIndex];
              updatedExpenses[expIndex] = {
                ...exp,
                status: 'pago',
                lastPaymentDate: today
              };

              newHistoryEntries.push({
                id: Math.random().toString(36).substr(2, 9),
                expenseId: exp.id,
                company: exp.company,
                amount: exp.amount,
                paymentDate: today,
                dueDate: exp.dueDate,
                category: exp.category
              });
            }
          }
        }
      });

      if (newHistoryEntries.length > 0) {
        setExpenses(updatedExpenses);
        setHistory(prev => [...newHistoryEntries, ...prev]);
        alert(`${newHistoryEntries.length} pagamentos foram sincronizados com sucesso!`);
      } else {
        alert('Nenhuma alteração de pagamento detectada.');
      }
    } catch (error) {
      console.error('Erro ao importar Excel:', error);
      alert('Erro ao ler o arquivo Excel. Certifique-se de que é o arquivo exportado pelo sistema.');
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  const exportToPDF = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const doc = new jsPDF();
    
    // Add Logo
    try {
      const logoPng = await getLogoPngDataUrl();
      doc.addImage(logoPng, 'PNG', 160, 10, 35, 12);
    } catch (e) {
      console.error('Erro ao carregar logo no PDF', e);
    }

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('Relatório de Despesas Mensais', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    
    // Stats
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(`Total de Contas: ${stats.total}`, 14, 40);
    doc.text(`Pagas: ${stats.paid} | Pendentes: ${stats.pending} | Atrasadas: ${stats.overdue}`, 14, 46);
    doc.text(`Valor Total: ${formatCurrency(stats.totalAmount)}`, 14, 52);

    // Grouping logic
    const grouped: Record<string, Expense[]> = filteredExpenses.reduce((acc, exp) => {
      const date = new Date(exp.dueDate);
      const monthYear = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(exp);
      return acc;
    }, {} as Record<string, Expense[]>);

    let currentY = 60;

    Object.entries(grouped).forEach(([month, monthExpenses], index) => {
      if (index > 0) {
        currentY = (doc as any).lastAutoTable.finalY + 15;
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }
      }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(month.toUpperCase(), 14, currentY);

      const tableData = monthExpenses.map(exp => [
        exp.company,
        exp.category,
        exp.items || '-',
        exp.status.toUpperCase(),
        exp.lastPaymentDate ? new Date(exp.lastPaymentDate).toLocaleDateString('pt-BR') : 'Pendente',
        new Date(exp.dueDate).toLocaleDateString('pt-BR'),
        formatCurrency(exp.amount)
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Empresa', 'Categoria', 'Itens', 'Status', 'Data Pagamento', 'Vencimento', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [30, 41, 59], // Slate-800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        columnStyles: {
          3: { halign: 'center', fontStyle: 'bold' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const status = data.cell.raw as string;
            if (status === 'PAGO') data.cell.styles.textColor = [5, 150, 105];
            if (status === 'ATRASADO') data.cell.styles.textColor = [220, 38, 38];
            if (status === 'PENDENTE') data.cell.styles.textColor = [217, 119, 6];
          }
        }
      });
    });

    // Signature Section
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text('__________________________________________', centerX, finalY, { align: 'center' });
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Amarilda Cangondo', centerX, finalY + 7, { align: 'center' });

    // Page Border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, pageWidth - 10, doc.internal.pageSize.getHeight() - 10);

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} | Gestor de Despesas - Relatório Oficial`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio-despesas-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // --- MAIN SHEET ---
    const worksheet = workbook.addWorksheet('Gestão de Despesas');

    // Add Logo to Excel
    try {
      const logoPng = await getLogoPngDataUrl();
      const base64 = logoPng.split(',')[1];
      
      const logoId = workbook.addImage({
        base64: base64,
        extension: 'png',
      });
      
      worksheet.addImage(logoId, {
        tl: { col: 6, row: 0.5 },
        ext: { width: 120, height: 40 }
      });
    } catch (e) {
      console.error('Erro ao adicionar logo ao Excel', e);
    }

    // Add Title
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Relatório de Gestão de Despesas';
    titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add Generation Date
    worksheet.mergeCells('A2:H2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
    dateCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Summary Section
    worksheet.mergeCells('A4:B4');
    worksheet.getCell('A4').value = 'RESUMO GERAL';
    worksheet.getCell('A4').font = { bold: true, size: 12 };
    
    const summaryData = [
      ['Total de Contas', stats.total],
      ['Pagas', stats.paid],
      ['Pendentes', stats.pending],
      ['Atrasadas', stats.overdue],
      ['Valor Total', stats.totalAmount]
    ];

    summaryData.forEach((data, i) => {
      const row = worksheet.getRow(5 + i);
      row.getCell(1).value = data[0];
      row.getCell(2).value = data[1];
      if (data[0] === 'Valor Total') {
        row.getCell(2).numFmt = '#,##0.00 "Kz"';
      }
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Grouping logic for Excel
    const grouped: Record<string, Expense[]> = filteredExpenses.reduce((acc, exp) => {
      const date = new Date(exp.dueDate);
      const monthYear = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(exp);
      return acc;
    }, {} as Record<string, Expense[]>);

    let currentRow = 11;

    Object.entries(grouped).forEach(([month, monthExpenses]) => {
      // Month Header
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const monthCell = worksheet.getCell(`A${currentRow}`);
      monthCell.value = month.toUpperCase();
      monthCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      monthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
      monthCell.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;

      // Table Header for this month
      worksheet.getRow(currentRow).values = ['Empresa', 'Categoria', 'Descrição', 'Itens', 'Status', 'Vencimento', 'Data Pagamento', 'Valor (Kz)'];
      const headerRow = worksheet.getRow(currentRow);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      const tableHeaderRow = currentRow;
      currentRow++;

      // Data
      monthExpenses.forEach((exp, index) => {
        const row = worksheet.addRow({
          company: exp.company,
          category: exp.category,
          description: exp.description || '-',
          items: exp.items || '-',
          status: exp.status.toUpperCase(),
          dueDate: new Date(exp.dueDate).toLocaleDateString('pt-BR'),
          paymentDate: exp.lastPaymentDate ? new Date(exp.lastPaymentDate).toLocaleDateString('pt-BR') : 'Pendente',
          amount: exp.amount,
        });

        // Dropdown for status
        row.getCell(5).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"PAGO,PENDENTE,ATRASADO"'],
          showErrorMessage: true,
          errorTitle: 'Status Inválido',
          error: 'Por favor, selecione um status da lista.'
        };

        // Center all cells in data row
        row.eachCell((cell) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        if (index % 2 === 1) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        currentRow++;
      });

      // Month Subtotal
      const monthTotalRow = worksheet.getRow(currentRow);
      monthTotalRow.getCell(7).value = `Subtotal ${month}:`;
      monthTotalRow.getCell(7).font = { bold: true, italic: true };
      monthTotalRow.getCell(8).value = {
        formula: `SUM(H${tableHeaderRow + 1}:H${currentRow - 1})`,
        result: monthExpenses.reduce((acc, curr) => acc + curr.amount, 0)
      };
      monthTotalRow.getCell(8).font = { bold: true };
      monthTotalRow.getCell(8).numFmt = '#,##0.00 "Kz"';
      currentRow += 2;
    });

    const lastDataRow = currentRow - 2;

    // Conditional Formatting for Status (Global)
    worksheet.addConditionalFormatting({
      ref: `E11:E${lastDataRow}`,
      rules: [
        {
          priority: 1,
          type: 'containsText',
          operator: 'containsText',
          text: 'PAGO',
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD1FAE5' } }, font: { color: { argb: 'FF065F46' } } },
        },
        {
          priority: 2,
          type: 'containsText',
          operator: 'containsText',
          text: 'PENDENTE',
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF3C7' } }, font: { color: { argb: 'FF92400E' } } },
        },
        {
          priority: 3,
          type: 'containsText',
          operator: 'containsText',
          text: 'ATRASADO',
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } }, font: { color: { argb: 'FF991B1B' } } },
        }
      ]
    });

    // Add Totals Row
    const totalRowIndex = lastDataRow + 2;
    const totalRow = worksheet.getRow(totalRowIndex);
    
    totalRow.getCell(7).value = 'TOTAL GERAL:';
    totalRow.getCell(7).font = { bold: true, size: 12 };
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    
    totalRow.getCell(8).value = {
      formula: `SUM(H11:H${lastDataRow}) / 2`, // Divide by 2 because subtotals are included in the range SUM
      result: filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0)
    };
    // Correct formula to sum only data rows if needed, but simple sum / 2 works if we have subtotals
    // Better: sum only the subtotal cells or use a more specific range. 
    // Let's just use the calculated result for simplicity in the static export.
    totalRow.getCell(8).value = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    totalRow.getCell(8).font = { bold: true, size: 12, color: { argb: 'FF059669' } };
    totalRow.getCell(8).numFmt = '#,##0.00 "Kz"';
    totalRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };

    // Instruction for "Save to History"
    worksheet.mergeCells(`A${totalRowIndex + 2}:H${totalRowIndex + 2}`);
    const instructCell = worksheet.getCell(`A${totalRowIndex + 2}`);
    instructCell.value = '✅ PARA SALVAR NO HISTÓRICO: Altere o Status para PAGO, salve este arquivo e clique em "Sincronizar Excel" no sistema.';
    instructCell.font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } };
    instructCell.alignment = { horizontal: 'center', vertical: 'middle' };
    instructCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    instructCell.border = {
      top: { style: 'medium', color: { argb: 'FF3B82F6' } },
      left: { style: 'medium', color: { argb: 'FF3B82F6' } },
      bottom: { style: 'medium', color: { argb: 'FF3B82F6' } },
      right: { style: 'medium', color: { argb: 'FF3B82F6' } },
    };

    // Add borders to all data rows
    for (let i = 11; i <= lastDataRow; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    }

    // --- HISTORY SHEET ---
    const historySheet = workbook.addWorksheet('Histórico de Pagamentos');
    
    historySheet.mergeCells('A1:E1');
    const historyTitle = historySheet.getCell('A1');
    historyTitle.value = 'Histórico Completo de Pagamentos';
    historyTitle.font = { name: 'Arial', size: 16, bold: true };
    historyTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    historySheet.getRow(3).values = ['Empresa', 'Categoria', 'Data de Pagamento', 'Vencimento Original', 'Valor Pago (Kz)'];
    historySheet.columns = [
      { key: 'company', width: 25 },
      { key: 'category', width: 20 },
      { key: 'paymentDate', width: 20 },
      { key: 'dueDate', width: 20 },
      { key: 'amount', width: 20, style: { numFmt: '#,##0.00' } },
    ];

    const historyHeader = historySheet.getRow(3);
    historyHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    historyHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

    history.forEach((item, index) => {
      const row = historySheet.addRow({
        company: item.company,
        category: item.category,
        paymentDate: new Date(item.paymentDate).toLocaleDateString('pt-BR'),
        dueDate: new Date(item.dueDate).toLocaleDateString('pt-BR'),
        amount: item.amount,
      });
      if (index % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      }
    });

    // Freeze panes for both
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 11, activeCell: 'A12' }];
    historySheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 3, activeCell: 'A4' }];

    // Generate and save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `gestao-despesas-completo-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    setDeleteConfirmId(null);
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
      exp.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'todos' || exp.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: expenses.length,
    paid: expenses.filter(e => e.status === 'pago').length,
    pending: expenses.filter(e => e.status === 'pendente').length,
    overdue: expenses.filter(e => e.status === 'atrasado').length,
    totalAmount: expenses.reduce((acc, curr) => acc + curr.amount, 0)
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 pt-4 pb-6 px-4 md:px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Logo className="h-12 w-auto" />
              <div className="hidden md:block h-10 w-px bg-slate-200" />
              <div className="hidden md:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel Financeiro</p>
                <p className="text-sm font-semibold text-slate-600">Gestão de Contas a Pagar</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                <button 
                  onClick={() => setActiveTab('expenses')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'expenses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Contas
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Histórico
                </button>
              </div>
              <button 
                type="button"
                onClick={exportToPDF}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Exportar PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button 
                type="button"
                onClick={exportToExcel}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span className="hidden sm:inline">Exportar Excel</span>
                <span className="sm:hidden">Excel</span>
              </button>
              
              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer">
                <TrendingUp size={14} />
                <span className="hidden sm:inline">{isImporting ? 'Sincronizando...' : 'Sincronizar Excel'}</span>
                <span className="sm:hidden">Sinc.</span>
                <input 
                  type="file" 
                  accept=".xlsx" 
                  className="hidden" 
                  onChange={importFromExcel}
                  disabled={isImporting}
                />
              </label>

              <button 
                type="button"
                onClick={() => handleOpenModal()}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                <Plus size={14} />
                <span>Nova Conta</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Wallet size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 truncate">{formatCurrency(stats.totalAmount)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{stats.total} contas registradas</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pagas</span>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{stats.paid}</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.paid / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendentes</span>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{stats.pending}</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.pending / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-amber-500"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                  <AlertCircle size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atrasadas</span>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{stats.overdue}</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.overdue / (stats.total || 1)) * 100}%` }}
                    className="h-full bg-rose-500"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-6">
        {activeTab === 'expenses' ? (
          <>
            {/* Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Procurar..."
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <Filter size={16} className="text-slate-400 mr-1 shrink-0" />
                {(['todos', 'pago', 'pendente', 'atrasado'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                      filterStatus === status 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa / Categoria</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Último Pagamento</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence mode="popLayout">
                      {filteredExpenses.map((expense) => (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -20 }}
                          key={expense.id} 
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <Building2 size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900">{expense.company}</p>
                                  {expense.recurrence && expense.recurrence !== 'none' && (
                                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                                      <Clock size={8} />
                                      {expense.recurrence}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-mono uppercase tracking-tight">{expense.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              expense.status === 'pago' ? 'status-paid' : 
                              expense.status === 'pendente' ? 'status-pending' : 'status-overdue'
                            }`}>
                              {expense.status === 'pago' ? <CheckCircle2 size={10} /> : 
                               expense.status === 'pendente' ? <Clock size={10} /> : <AlertCircle size={10} />}
                              {expense.status}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-slate-600 text-sm font-medium">
                              {expense.lastPaymentDate 
                                ? new Date(expense.lastPaymentDate).toLocaleDateString('pt-BR')
                                : <span className="text-slate-300 italic">Nenhum registro</span>
                              }
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                              <Calendar size={14} className="text-slate-400" />
                              {new Date(expense.dueDate).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-slate-900 font-semibold text-sm">
                              {formatCurrency(expense.amount)}
                            </div>
                            {expense.isSubscription && (
                              <span className="text-[10px] text-indigo-500 uppercase font-bold tracking-tighter">Assinatura</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {deleteConfirmId === expense.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-100 animate-in fade-in zoom-in duration-200">
                                  <button 
                                    onClick={() => deleteExpense(expense.id)}
                                    className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition-colors"
                                  >
                                    Confirmar
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-300 transition-colors"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => toggleStatus(expense.id)}
                                    className={`p-2 rounded-lg transition-all ${
                                      expense.status === 'pago' 
                                        ? 'text-amber-600 hover:bg-amber-50' 
                                        : 'text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                    title={expense.status === 'pago' ? "Marcar como pendente" : "Marcar como pago"}
                                  >
                                    {expense.status === 'pago' ? <Clock size={18} /> : <CheckCircle2 size={18} />}
                                  </button>
                                  <button 
                                    onClick={() => handleOpenModal(expense)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  >
                                    <Edit3 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirmId(expense.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Search size={48} strokeWidth={1} />
                            <p className="text-lg font-medium">Nenhuma conta encontrada</p>
                            <p className="text-sm">Tente ajustar sua busca ou filtros.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Histórico de Pagamentos Realizados</h3>
                <p className="text-xs text-slate-500">Total de registros: {history.length}</p>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all"
                >
                  <Trash2 size={14} />
                  Limpar Histórico
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data do Pagamento</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento Original</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Pago</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{entry.company}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(entry.paymentDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(entry.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 uppercase font-mono">{entry.category}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <Clock size={48} strokeWidth={1} />
                          <p className="text-lg font-medium">Nenhum pagamento registrado ainda</p>
                          <p className="text-sm">Marque uma conta como paga para ver o histórico.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 md:px-8 py-4 md:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <h2 className="text-lg md:text-xl font-bold text-slate-900">
                  {editingExpense ? 'Editar Conta' : 'Nova Conta'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Empresa</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Categoria</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Descrição do Serviço</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Ex: Pagamento mensal de link dedicado"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Itens Comprados / Detalhes</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none min-h-[60px] text-sm"
                    value={formData.items}
                    onChange={e => setFormData({...formData, items: e.target.value})}
                    placeholder="Ex: 50Mbps Link Dedicado, Suporte 24/7"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Vencimento</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Valor Total (Kz)</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: 1.000.000,00"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                      value={amountInput}
                      onChange={e => handleAmountChange(e.target.value)}
                    />
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[9px] text-slate-400 italic">
                        Use ponto para milhares e vírgula para decimais
                      </p>
                      {formData.amount !== undefined && formData.amount > 0 && (
                        <p className="text-[9px] font-bold text-indigo-600">
                          {formatCurrency(formData.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 md:p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <input 
                      type="checkbox" 
                      id="isSubscription"
                      className="w-4 h-4 md:w-5 md:h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                      checked={formData.isSubscription}
                      onChange={e => {
                        const isSub = e.target.checked;
                        setFormData({
                          ...formData, 
                          isSubscription: isSub,
                          recurrence: isSub ? (formData.recurrence === 'none' ? 'mensal' : formData.recurrence) : 'none'
                        });
                      }}
                    />
                    <label htmlFor="isSubscription" className="text-xs md:text-sm font-medium text-indigo-900 cursor-pointer">
                      Esta é uma assinatura mensal recorrente
                    </label>
                  </div>
                  
                  {formData.isSubscription && (
                    <div className="space-y-1.5 p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <label className="text-xs font-semibold text-slate-700">Frequência de Recorrência</label>
                      <select 
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                        value={formData.recurrence || 'none'}
                        onChange={e => setFormData({...formData, recurrence: e.target.value as any})}
                      >
                        <option value="none">Sem recorrência automática</option>
                        <option value="diario">Diário</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensal">Mensal</option>
                        <option value="anual">Anual</option>
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Ao marcar como pago, uma nova conta será gerada automaticamente para o próximo período.
                      </p>
                    </div>
                  )}

                  {formData.isSubscription && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="px-4 py-2 border-l-2 border-indigo-500 bg-slate-50"
                    >
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Autorizado por:</p>
                      <p className="text-base md:text-lg font-serif italic text-indigo-900">Amarilda Cangondo</p>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3 pt-2 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-sm"
                  >
                    {editingExpense ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-6 mt-12 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">
        <p>© 2026 Gestor de Gastos Mensais • Organização e Controle Financeiro Corporativo</p>
      </footer>
    </div>
  );
}
